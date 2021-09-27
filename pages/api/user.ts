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
                
                if (!(req.body.lastOpenedFile)) {
                    return res.status(406);            
                }
                const thisObject = await UserModel.findOne({email: session.user.email});
                if (!thisObject) return res.status(404);
                
                thisObject.lastOpenedFile = req.body.lastOpenedFile;
                
                await thisObject.save();
                
                return res.status(200).json({message: "Last opened file saved! ✨", user: thisObject});  

            } catch (e) {
                return res.status(500).json({message: e});            
            }
        }
    }
}