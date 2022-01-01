import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { UserModel } from "../../models/User";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {   
        case "POST": {
            const session = await getSession({ req });
            if (!session) return res.status(403);
            try {
                await dbConnect();
                
                // return res.status(200).json({lastOpenedFile: req.body.lastOpenedFile, lastOpenedFileType: typeof(req.body.lastOpenedFile), f: req.body.f, ftype: typeof(req.body.f), req: cleanForJSON(req)})

                // Sometimes you want to save that there is no last opened file.
                if (typeof(req.body.lastOpenedFile) === "undefined") {
                    return res.status(406).json({message: "Missing req.body.lastOpenedFile"});            
                }

                const thisUser = await UserModel.findOne({email: session.user.email});
                if (!thisUser) return res.status(404).json({message: "Account not found"});

                if (req.body.lastOpenedFile === "") {
                    thisUser.lastOpenedFile = null
                } else {
                    thisUser.lastOpenedFile = req.body.lastOpenedFile;
                }                
                
                await thisUser.save();
                
                return res.status(200).json({message: "Last opened file saved! ✨", user: thisUser});  

            } catch (e) {
                return res.status(500).json({message: e});            
            }
        }
    }
}