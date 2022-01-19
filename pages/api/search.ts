import mongoose from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { FileModel } from "../../models/File";
import { SectionModel } from "../../models/Section";
import { UserModel } from "../../models/User";
import cleanForJSON from "../../utils/cleanForJSON";
import dbConnect from "../../utils/dbConnect";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).send("Invalid method")
    if (!req.query.query) return res.status(406).send("No query found in request")
    if (Array.isArray(req.query.query)) return res.status(406).json({message: "Invalid query"});

    const session = await getSession({req})
    if (!session) return res.status(403).send("Not logged in")

    const countPerPage = 10
    try {
        await dbConnect();

        const thisUser = await UserModel.findOne({email: session.user.email})
        const checkFileBelongsToThisUserAggregation = [    
            {$lookup: {
                from: "folders",
                localField: "folder",
                foreignField: "_id", 
                as: "folderItem",
            }},
            {$unwind: "$folderItem"},
            {$match: {"folderItem.user": mongoose.Types.ObjectId(thisUser.id.toString())}},
        ]
        const sectionAggregation = [
            {$match: {$or: [
                {"body": {$regex: `.*${req.query.query}.*`, $options: "i"}}, 
                {"name": {$regex: `.*${req.query.query}.*`, $options: "i"}}
            ]}},
            {$lookup: {
                from: "files",
                let: {"id": "$file"}, // Local field
                pipeline: [
                    {$match: {$expr: {$and: [{$eq: ["$_id", "$$id"]}, ]}}},
                    ...checkFileBelongsToThisUserAggregation,
                    {$project: {name: 1, _id: 0}},
                ],
                as: "fileItem",
            }},
        ]

        const matchingFiles = await FileModel.aggregate([
            {$match: {
                "name": {$regex: `.*${req.query.query}.*`, $options: "i"},
            }},
            {$sort: {updatedAt: -1}},
            ...checkFileBelongsToThisUserAggregation,
            {$project: {name: 1}},
        ])
        const filesCount = matchingFiles.length
        const skip = req.query.page ? (+req.query.page * countPerPage) : 0

        const includeSections = filesCount < (skip + countPerPage)
        const onlySections = filesCount < skip

        // it's ok if (skip + countPerPage) > filesCount, it still returns correct thing.
        const matchingFilesSkipped = matchingFiles.slice(skip, skip + countPerPage)

        let matchingSections = [{sample: [], count: []}]
        if (includeSections) {
            matchingSections = await SectionModel.aggregate([
                ...sectionAggregation,
                {$unwind: "$fileItem"},
                {$sort: {updatedAt: -1}},
                {$facet: {
                    count: [{$count: "count"}],
                    sample: [
                        {$skip: onlySections ? (skip - filesCount) : 0},
                        {$limit: onlySections ? countPerPage : countPerPage - (filesCount - skip)}, 
                        // $skip cannot be greater than skip
                        // $limit cannot be greater than countPerPage
                        // not onlySections means (filecount > skip) so (filecount - skip) is positive
                    ],
                }},
            ])
        } else {
            const sCount = await SectionModel.aggregate([
                ...sectionAggregation,
                {$count: "count"},
                {$unwind: "$count"}
            ])
            matchingSections[0].count.push({count: sCount[0].count})
        }

        const allMatchingDocuments = onlySections ? matchingSections[0].sample : matchingFilesSkipped.concat(matchingSections[0].sample)

        const sectionsCount = matchingSections[0].count.length ? matchingSections[0].count[0].count : 0
        const count = sectionsCount + filesCount
        return res.status(200).json({data: cleanForJSON(allMatchingDocuments), count: count})
    } catch (e) {
        return res.status(500).json({message: e});
    }
}