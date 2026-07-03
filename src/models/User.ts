import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUserAddress {
  label: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  emailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  otp?: string;
  otpExpiry?: Date;
  addresses: IUserAddress[];
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    firstName: String,
    lastName: String,
    roles: { type: [String], default: ["customer"] },
    emailVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetToken: String,
    resetTokenExpiry: Date,
    otp: String,
    otpExpiry: Date,
    addresses: [
      {
        label: String,
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        phone: String,
        isDefault: Boolean,
      },
    ],
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
