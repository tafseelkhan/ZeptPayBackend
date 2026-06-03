import mongoose, { Schema, Document } from "mongoose";

// ✅ Developer Onboarding Interface
export interface IZeptCaptured extends Document {
  userId: mongoose.Types.ObjectId; // Ye add karo
  // 🔹 Basic Developer Info
  developerName: string;
  developerEmail: string;
  companyName: string;
  businessType:
    | "Individual"
    | "Company"
    | "LLP"
    | "Private Ltd"
    | "Public Ltd"
    | "Partnership"
    | "Sole Proprietorship";
  website?: string;
  phone?: string;
  logoUrl?: string;
  country: string;

  // 🔹 KYC / Legal Info
  taxId?: string;
  registrationNumber?: string;
  identityProofUrl?: string;
  selfieUrl?: string;
  addressProofUrl?: string;

  // 🔹 Addresses - Direct string fields
  businessAddress?: string;
  homeAddress?: string;

  nationality?: string;
  dob?: Date;

  // 🔹 Business / App Verification
  appName?: string;
  appStoreUrl?: string;
  businessWebsiteVerified?: boolean;
  appVerified?: boolean;
  businessCategory?: string;
  termsAccepted?: boolean;
  internationalPaymentsAccepted?: boolean;
  notes?: string;

  // 🔹 Keys / ZeptCaptured Status
  zeptcapturedEnabled: boolean;
  zeptcapturedPurpose?: string;
  clientKey?: string;

  // 🔹 Custom Metadata
  metadata?: Record<string, any>;
  status?: "pending" | "verified" | "rejected";

  // 🔹 Meta
  createdAt: Date;
  updatedAt: Date;
}

const ZeptCapturedSchema: Schema<IZeptCaptured> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    developerName: { type: String, required: true },
    developerEmail: { type: String, required: true, unique: true },
    companyName: { type: String, required: true },
    businessType: { type: String, required: true },
    website: { type: String },
    phone: { type: String },
    logoUrl: { type: String },
    country: { type: String, required: true },

    // 🔹 KYC / Legal
    taxId: { type: String },
    registrationNumber: { type: String },
    identityProofUrl: { type: String },
    selfieUrl: { type: String },
    addressProofUrl: { type: String },

    // 🔹 Addresses - Direct string fields, no nested objects
    businessAddress: { type: String },
    homeAddress: { type: String },

    nationality: { type: String },
    dob: { type: Date },

    // 🔹 Business / App Verification
    appName: { type: String },
    appStoreUrl: { type: String },
    businessWebsiteVerified: { type: Boolean, default: false },
    appVerified: { type: Boolean, default: false },
    businessCategory: { type: String },
    termsAccepted: { type: Boolean, default: false },
    internationalPaymentsAccepted: { type: Boolean, default: false },
    notes: { type: String },

    // 🔹 Keys / ZeptCaptured
    zeptcapturedEnabled: { type: Boolean, default: false },
    zeptcapturedPurpose: { type: String },
    clientKey: { type: String },

    // 🔹 Custom Metadata
    metadata: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// 🔥 YAHAN PAR FIX KARO - Check if model already exists
const ZeptCaptured =
  mongoose.models.ZeptCaptured ||
  mongoose.model<IZeptCaptured>("ZeptCaptured", ZeptCapturedSchema);

export default ZeptCaptured;
