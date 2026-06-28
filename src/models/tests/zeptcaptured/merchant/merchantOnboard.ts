import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMerchant extends Document {
  vendorCodeUID: string;
  merchantName: string;
  merchantEmail: string;
  merchantPhone?: string;
  merchantUserId: mongoose.Types.ObjectId;

  developerOnboardingId: mongoose.Types.ObjectId;
  developerUserId: mongoose.Types.ObjectId;
  developerClientKey: string;

  merchantDID: string;
  walletId: string;

  businessName?: string;
  businessType?: "individual" | "company";
  businessCategory?: string;
  country?: string;
  dob?: Date;
  nationality?: string;

  mode: "test" | "live";

  // --------------------------
  // KYC
  // --------------------------
  kycStatus: "not_submitted" | "pending" | "verified" | "rejected";
  isKycCompleted: boolean;

  kycDetails?: {
    // Text Fields
    panNumber?: string;
    aadhaarNumber?: string;
    gstNumber?: string;
    registeredBusinessName?: string;

    // URL Fields
    panCardUrl?: string;
    aadhaarUrl?: string;
    addressProofUrl?: string;
    selfieUrl?: string;
  };

  // --------------------------
  // Bank Details
  // --------------------------
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    cancelledChequeUrl?: string;
  };

  isBankDetailsCompleted: boolean;

  status: "active" | "suspended" | "blocked";

  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    vendorCodeUID: { type: String, required: true, unique: true, index: true },
    merchantName: { type: String, required: true },
    merchantEmail: { type: String, required: true, lowercase: true },
    merchantPhone: { type: String, required: true },
    merchantUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    developerOnboardingId: {
      type: Schema.Types.ObjectId,
      ref: "DeveloperOnboarding",
      required: true,
    },

    developerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    developerClientKey: { type: String, required: true },

    merchantDID: { type: String, unique: true, required: true },
    walletId: { type: String, required: true },

    businessName: String,
    businessType: { type: String, enum: ["individual", "company"] },
    businessCategory: String,
    country: String,
    dob: Date,
    nationality: String,

    mode: { type: String, enum: ["test", "live"], default: "test" },

    // KYC
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected"],
      default: "not_submitted",
    },

    isKycCompleted: { type: Boolean, default: false },

    kycDetails: {
      panNumber: String,
      aadhaarNumber: String,
      gstNumber: String,
      registeredBusinessName: String,

      panCardUrl: String,
      aadhaarUrl: String,
      addressProofUrl: String,
      selfieUrl: String,
    },

    // Bank
    bankDetails: {
      accountHolderName: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      upiId: String,
      cancelledChequeUrl: String,
    },

    isBankDetailsCompleted: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["active", "suspended", "blocked"],
      default: "active",
    },
  },
  { timestamps: true },
);
// ✅ FIX: Check if model already exists before creating
const Merchant =
  (mongoose.models.Merchant as Model<IMerchant>) ||
  mongoose.model<IMerchant>("Merchant", MerchantSchema);

export default Merchant;
