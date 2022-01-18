import { NextApiRequest, NextApiResponse } from "next";
import { SectionModel } from "../../models/Section";
import cleanForJSON from "../../utils/cleanForJSON";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).send("Invalid method")
    if (!req.query.query) return res.status(406).send("No query found in request")
    if (Array.isArray(req.query.query)) return res.status(406).json({message: "Invalid query"});

    try {
        await dbConnect();

        const allMatchingSections = await SectionModel.aggregate([
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
        ])

        // If return 404, data will be undefined. so u dont have to check that data.data.length !== 0
        if (!allMatchingSections || !allMatchingSections.length) return res.status(404).send("No documents with this query were found")

        return res.status(200).json({data: cleanForJSON(allMatchingSections)})
    } catch (e) {
        return res.status(500).json({message: e});
    }
}