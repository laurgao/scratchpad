import mongoose, { Document } from "mongoose";
import { FolderObj } from "../utils/types";

interface FolderDoc extends FolderObj, Document {}

const FolderSchema = new mongoose.Schema({
	user: { required: true, type: mongoose.Schema.Types.ObjectId }, 
	name: { required: true, type: String }, 
}, {
	timestamps: true,
});

export const FolderModel = mongoose.models.folder || mongoose.model<FolderDoc>("folder", FolderSchema);
