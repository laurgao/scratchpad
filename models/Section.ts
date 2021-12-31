import mongoose, { Document } from "mongoose";
import { SectionObj } from "../utils/types";

interface SectionDoc extends SectionObj, Document {}

const SectionSchema = new mongoose.Schema({
	body: { required: false, type: String }, 
	name: { required: false, type: String }, 
	file: { required: true, type: mongoose.Schema.Types.ObjectId }, 
}, {
	timestamps: true,
});

export const SectionModel = mongoose.models.Section || mongoose.model<SectionDoc>("Section", SectionSchema);
