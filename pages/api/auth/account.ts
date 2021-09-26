import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import { UserModel } from "../../../models/User";
import { FolderModel } from "../../../models/Folder";
import { FileModel } from "../../../models/File";
import dbConnect from "../../../utils/dbConnect";
import { format } from "date-fns";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case "POST":
            const session = await getSession({req});
            if (!session) return res.status(403).send("Unauthed");
            if (session.userId) return res.status(200).json({message: "Account already exists"});

            try {
                await dbConnect();

                const newUser = await UserModel.create({
                    email: session.user.email,
                    name: session.user.name,
                    image: session.user.image,
                });

                const newFolder = await FolderModel.create({
                    user: newUser._id,
                    name: "Daily"
                })

                const newNote = await FileModel.create({
                    folder: newFolder._id,
                    name: format(new Date(), "yyyy-MM-dd"),
                })

                return res.status(200).json({message: "Account created"});
            } catch (e) {
                return res.status(500).json({message: e});
            }
        default:
            return res.status(405).send("Invalid method");
    }
}