import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IRole extends Document {
  name: string;
  label: string;
  permissions: string[];
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

export const Role: Model<IRole> =
  mongoose.models.Role ?? mongoose.model<IRole>("Role", RoleSchema);
