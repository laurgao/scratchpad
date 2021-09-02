import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { FileModel } from "../../models/File";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case "POST": {
            const session = await getSession({ req });
            if (!session) return res.status(403);
            try {
                await dbConnect();
                
                if (req.body.id) {
                    if (!(req.body.body || req.body.name || req.body.folder)) {
                        return res.status(406); 
                    }
                    const thisObject = await FileModel.findById(req.body.id);
                    if (!thisObject) return res.status(404);
                    
                    if (req.body.body) thisObject.body = req.body.body;
                    if (req.body.name) thisObject.name = req.body.name;
                    if (req.body.folder) thisObject.folder = req.body.folder;
                    
                    await thisObject.save();
                    
                    return res.status(200).json({message: "Object updated"});                            
                } else {
                    if (!(req.body.name && req.body.folder)) {
                        return res.status(406);            
                    }
                    
                    const newFile = new FileModel({
                        body: req.body.body || "",
                        name: req.body.name,
                        folder: req.body.folder,                             
                    });
                    
                    const savedFile = await newFile.save();
                    
                    return res.status(200).json({message: "Object created", id: savedFile._id.toString()});
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
                               
                const thisObject = await FileModel.findById(req.body.id);
                
                if (!thisObject) return res.status(404);
                if (thisObject.userId.toString() !== session.userId) return res.status(403);
                
                await FileModel.deleteOne({_id: req.body.id});
                
                return res.status(200).json({message: "Object deleted"});
            } catch (e) {
                return res.status(500).json({message: e});
            }
        }
        
        default:
            return res.status(405);
    }
}