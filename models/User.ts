import mongoose, { Document } from "mongoose";
import { UserObj } from "../utils/types";

interface UserDoc extends UserObj, Document {}

const UserSchema = new mongoose.Schema({
    email: { required: true, type: String },
    name: { required: true, type: String },
    image: { required: true, type: String },
    lastOpenedFile: {required: false, type: mongoose.Schema.Types.ObjectId }
}, {
    timestamps: true,
});

export const UserModel = mongoose.models.user || mongoose.model<UserDoc>("user", UserSchema);
