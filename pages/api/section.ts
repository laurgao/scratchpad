import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { FileModel } from "../../models/File";
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
                    if (!(typeof(req.body.body) === "undefined" || typeof(req.body.name) === "undefined" || req.body.file || req.body.addBody)) {
                        return res.status(406).send("Missing params"); 
                    }
                    if (req.body.body && req.body.addBody) return res.status(406).send("Can't have addBody and body");
                    const thisObject = await SectionModel.findById(req.body.id);
                    if (!thisObject) return res.status(404);
                    
                    if (typeof(req.body.body) === "string") thisObject.body = req.body.body;
                    if (req.body.addBody) thisObject.body += req.body.addBody;
                    if (typeof(req.body.body) === "string") thisObject.body = req.body.body;
                    if (typeof(req.body.name) === "string") thisObject.name = req.body.name;
                    if (req.body.file) thisObject.file = req.body.file;
                    
                    await thisObject.save();
                    
                    return res.status(200).json({message: "Section saved! ✨"});                            
                } else {
                    if (!(req.body.file)) return res.status(406);
                    
                    const thisFile = await FileModel.findById(req.body.file)                    
                    if (!thisFile) return res.status(404).send("No file found with matching ID");
                    
                    const newSection = new SectionModel({
                        body: req.body.body || "",
                        name: req.body.name || "",
                        file: req.body.file,                             
                    });                    
                    const savedSection = await newSection.save();
                    
                    thisFile.lastOpenSection = savedSection._id;

                    if (req.body.previousFileId) {
                        // Insert savedSection._id after req.body.previousFileId in thisFile.sectionsOrder
                        const prevFileIdx = thisFile.sectionsOrder.findIndex(id => id.toString() === req.body.previousFileId)
                        thisFile.sectionsOrder.splice(prevFileIdx + 1, 0, savedSection._id);

                    } else {
                        thisFile.sectionsOrder.push(savedSection._id)
                    }
                    await thisFile.save();
                    
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
                               
                const thisSection = await SectionModel.findById(req.body.id);
                
                if (!thisSection) return res.status(404);
                // if (thisObject.userId.toString() !== thisUser._id) return res.status(403);
                // section does not have userId

                const thisFile = await FileModel.findById(thisSection.file);
                thisFile.sectionsOrder = thisFile.sectionsOrder.filter(id => id.toString() !== thisSection._id.toString());
                await thisFile.save();
                
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