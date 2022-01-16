import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { FileModel } from "../../models/File";
import { FolderModel } from "../../models/Folder";
import { UserModel } from "../../models/User";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {    
        case "GET": {
            const session = await getSession({ req });
            if (!session) return res.status(403);
            
            try {    
                await dbConnect();   
                const thisUser = await UserModel.findOne({email: session.user.email})
            
                const thisObject = await FolderModel.aggregate([
                    {$match: {user: thisUser._id}},
                    {$lookup: {
                        from: "files",
                        // localField: "_id",
                        // foreignField: "folder",
                        let: {"folder": "$_id"}, // Local field (folder field)
                        pipeline: [
                            {$match: {$expr: {$and: [{$eq: ["$folder", "$$folder"]}, ]}}},
                            {
                                $lookup: {
                                    from: "sections",
                                    localField: "_id", // File field
                                    foreignField: "file", //  Section field
                                    as: "sectionArr",
                                }
                            },
                        ],
                        as: "fileArr",
                    }}
                ]);
                
                return res.status(200).json({data: thisObject});
            } catch (e) {
                return res.status(500).json({message: e});                        
            }
        }
            
        case "POST": {
            const session = await getSession({ req });
            if (!session) return res.status(403);
            try {
                await dbConnect();
                
                if (req.body.id) {
                    if (!(req.body.name)) {
                        return res.status(406);            
                    }
                    const thisObject = await FolderModel.findById(req.body.id);
                    if (!thisObject) return res.status(404);
                    
                    thisObject.name = req.body.name;
                    
                    await thisObject.save();
                    
                    return res.status(200).json({message: "Object updated"});                            
                } else {
                    if (!(req.body.name)) {
                        return res.status(406);            
                    }

                    const thisUser = await UserModel.findOne({email: session.user.email})
                    
                    const newFolder = new FolderModel({
                        user: thisUser._id,
			            name: req.body.name,                             
                    });
                    
                    const savedFolder = await newFolder.save();
                    
                    return res.status(200).json({message: "Folder created! ✨", id: savedFolder._id.toString()});
                }            
            } catch (e) {
                return res.status(500).json({message: e});            
            }
        }
        
        case "DELETE": {
            const session = await getSession({ req });
            if (!session) return res.status(403);
            
            if (!req.body.id) return res.status(406);
            
            try {
                await dbConnect();
                               
                const thisObject = await FolderModel.findById(req.body.id);
                const thisUser = await UserModel.findOne({email: session.user.email})
                
                if (!thisObject) return res.status(404).send("No folder with given ID found.");
                if (thisObject.user.toString() !== thisUser._id.toString()) return res.status(403).send("You do not have permission to delete this folder.");
                
                await FolderModel.deleteOne({_id: req.body.id});
                await FileModel.deleteMany({folder: req.body.id});
                
                return res.status(200).json({message: "Folder deleted! 🗑️"});
            } catch (e) {
                return res.status(500).json({message: e});
            }
        }
        
        default:
            return res.status(405);
    }
}
