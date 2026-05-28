import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  phone: string;
  email: string;
  country: string; // Required during signup
  image?: string;
  balance: number;
  isLive: boolean;
  isDeveloper: boolean;
  otp?: string;
  otpExpiry?: Date;
  xpayId?: string; // Will be generated after bank details
  qrCodeUrl?: string;
}

const UserSchema: Schema<IUser> = new Schema({
  name: { type: String, required: true },
  phone: { type: String, unique: true, required: true },
  email: { type: String, required: false, unique: true },
  country: { type: String, required: true },
  image: { type: String },
  balance: { type: Number, default: 1000 },
  isLive: { type: Boolean, default: false },
  isDeveloper: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  xpayId: { type: String, unique: true, sparse: true }, // optional at signup
  qrCodeUrl: { type: String },
});

export default mongoose.model<IUser>("User", UserSchema);
