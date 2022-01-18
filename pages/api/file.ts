import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { FileModel } from "../../models/File";
import { SectionModel } from "../../models/Section";
import { UserModel } from "../../models/User";
import cleanForJSON from "../../utils/cleanForJSON";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case "GET": {
            const session = await getSession({ req });
            if (!session) return res.status(403).send("Unauthed");
            if (!req.query.id) return res.status(406).send("Missing ID");

            try {
                await dbConnect();

                const mongoose = require('mongoose');
                const id = mongoose.Types.ObjectId(req.query.id);

                const files = await FileModel.aggregate([
                    {$match: {_id: id}},
                    {
                        $lookup: {
                            from: "sections",
                            localField: "_id", // File field
                            foreignField: "file", //  Section field
                            as: "sectionArr",
                        },
                    },
                ])

                if (!files || !files.length) return res.status(404).send("File not found") // .json({data: {}})

                const file = files[0]
                // if (!file.sectionsOrder) {
                //     file.sectionsOrder = file.sectionArr.map(s => mongoose.Types.ObjectId(s._id));
                //     await file.save()
                // }
                const newSectionArr = file.sectionsOrder.map(id => file.sectionArr.find(s => s._id.toString() === id.toString()))
                file.sectionArr = newSectionArr

                return res.status(200).json({data: cleanForJSON(file), } );
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
                    if (!(req.body.name || req.body.folder || req.body.lastOpenSection)) {
                        return res.status(406); 
                    }
                    const thisObject = await FileModel.findById(req.body.id);
                    if (!thisObject) return res.status(404);
                    
                    if (req.body.name) thisObject.name = req.body.name;
                    if (req.body.folder) thisObject.folder = req.body.folder;
                    if (req.body.lastOpenSection) {
                        if (req.body.lastOpenSection === "null") thisObject.lastOpenSection = null
                        else thisObject.lastOpenSection = req.body.lastOpenSection
                    }
                    
                    await thisObject.save();
                    
                    return res.status(200).json({message: "File saved! ✨"});                            
                } else {
                    if (!(req.body.name && req.body.folder)) {
                        return res.status(406);            
                    }
                    
                    const newFile = new FileModel({
                        name: req.body.name,
                        folder: req.body.folder,                             
                    });
                    const savedFile = await newFile.save();

                    const newSection = new SectionModel({
                        body: "",
                        name: "",
                        file: savedFile._id,
                    });
                    const savedSection = await newSection.save();
                    
                    savedFile.lastOpenSection = savedSection._id;
                    savedFile.sectionsOrder = [savedSection._id]
                    await savedFile.save();

                    const thisUser = await UserModel.findOne({email: session.user.email})
                    thisUser.lastOpenedFile = savedFile._id;
                    await thisUser.save();
                    
                    return res.status(200).json({
                        message: "File created! ✨", 
                        id: savedFile._id.toString(), 
                        createdSectionId: savedSection._id.toString(),
                    });
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
                // if (thisObject.userId.toString() !== session.userId) return res.status(403);
                // file does not have userId
                
                await FileModel.deleteOne({_id: req.body.id});

                const sections = await SectionModel.countDocuments({file: req.body.id})
                await SectionModel.deleteMany({file: req.body.id});
                
                return res.status(200).json({message: `File and its ${sections} sections deleted! 🗑️`});
            } catch (e) {
                return res.status(500).json({message: e});
            }
        }
        
        default:
            return res.status(405);
    }
}