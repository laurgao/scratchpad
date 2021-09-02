import mongoose, { Document } from "mongoose";
import { FileObj } from "../utils/types";

interface FileDoc extends FileObj, Document {}

const FileSchema = new mongoose.Schema({
	body: { required: false, type: String }, 
	name: { required: true, type: String }, 
	folder: { required: true, type: mongoose.Schema.Types.ObjectId }, 
}, {
	timestamps: true,
});

export const FileModel = mongoose.models.file || mongoose.model<FileDoc>("file", FileSchema);
