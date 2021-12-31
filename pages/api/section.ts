import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { SectionModel } from "../../models/Section";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case "POST": {
            const session = await getSession({ req });
            if (!session) return res.status(403);
            try {
                await dbConnect();
                
                if (req.body.id) {
                    if (!(req.body.body || req.body.name || req.body.file)) {
                        return res.status(406); 
                    }
                    const thisObject = await SectionModel.findById(req.body.id);
                    if (!thisObject) return res.status(404);
                    
                    if (req.body.body) thisObject.body = req.body.body;
                    if (req.body.name) thisObject.name = req.body.name;
                    if (req.body.file) thisObject.file = req.body.file;
                    
                    await thisObject.save();
                    
                    return res.status(200).json({message: "Section saved! ✨"});                            
                } else {
                    if (!(req.body.file)) {
                        return res.status(406);            
                    }
                    
                    const newSection = new SectionModel({
                        body: req.body.body || "",
                        name: req.body.name || "",
                        file: req.body.file,                             
                    });
                    
                    const savedSection = await newSection.save();
                    
                    return res.status(200).json({message: "Section created! ✨", id: savedSection._id.toString()});
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
                               
                const thisObject = await SectionModel.findById(req.body.id);
                
                if (!thisObject) return res.status(404);
                // if (thisObject.userId.toString() !== session.userId) return res.status(403);
                // file does not have userId
                
                await SectionModel.deleteOne({_id: req.body.id});
                
                return res.status(200).json({message: "Section deleted! 🗑️"});
            } catch (e) {
                return res.status(500).json({message: e});
            }
        }
        
        default:
            return res.status(405);
    }
}