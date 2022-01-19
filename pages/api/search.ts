import { NextApiRequest, NextApiResponse } from "next";
import { SectionModel } from "../../models/Section";
import { FileModel } from "../../models/File";
import cleanForJSON from "../../utils/cleanForJSON";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).send("Invalid method")
    if (!req.query.query) return res.status(406).send("No query found in request")
    if (Array.isArray(req.query.query)) return res.status(406).json({message: "Invalid query"});

    try {
        await dbConnect();

        const countPerPage = 10

        const matchingFiles = await FileModel.aggregate([
            {$match: {
                "name": {$regex: `.*${req.query.query}.*`, $options: "i"},
            }},
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
                {$match: {$or: [
                    {"body": {$regex: `.*${req.query.query}.*`, $options: "i"}}, 
                    {"name": {$regex: `.*${req.query.query}.*`, $options: "i"}}
                ]}},
                {
                    $lookup: {
                        from: "files",
                        localField: "file", // Section field
                        foreignField: "_id", //  File field
                        as: "fileArr",
                    },
                },
                {
                    $facet: {
                        count: [{$count: "count"}],
                        sample: [
                            {$skip: onlySections ? (skip - filesCount) : 0},
                            {$limit: onlySections ? countPerPage : countPerPage - (filesCount - skip)},
                        ],
                    }
                },
            ])
        } else {
            const sCount = await SectionModel.count( {$or: [
                {"body": {$regex: `.*${req.query.query}.*`, $options: "i"}}, 
                {"name": {$regex: `.*${req.query.query}.*`, $options: "i"}}
            ]})
            matchingSections[0].count.push({count: sCount})
        }

        const allMatchingDocuments = (onlySections) ? matchingSections[0].sample : matchingFilesSkipped.concat(matchingSections[0].sample)

        

        // If return 404, data will be undefined. so u dont have to check that data.data.length !== 0
        // if (!allMatchingSections || !allMatchingSections.length) return res.status(404).send("No documents with this query were found")
        // nvm no more 404ing bc count will always be returned.
        // if nothing matches query, then the return value is allMatchingSections[0].sample: Array(0), allMatchingSections[0].count: Array(0)

        const sectionsCount = matchingSections[0].count.length ? matchingSections[0].count[0].count : 0
        const count = sectionsCount + filesCount
        return res.status(200).json({data: cleanForJSON(allMatchingDocuments), count: count})
    } catch (e) {
        return res.status(500).json({message: e});
    }
}