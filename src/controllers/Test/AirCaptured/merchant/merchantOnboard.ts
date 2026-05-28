import { Request, Response } from "express";
import Merchant from "../../../../models/Test/AirCaptured/merchant/merchantOnboard";
import { bucket } from "../../../../firebase/firebase";
import mongoose from "mongoose";
import User from "../../../../models/auth/User";
import DeveloperOnboarding from "../../../../models/Test/AirCaptured/airCaptured";
import ApiKey from "../../../../models/Test/ApiKeys";
import { v4 as uuidv4 } from "uuid";
import { generateToken } from "../../../../config/jwt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

interface JwtPayload {
  merchantId: string;
}

/**
 * Extract base64 data from data URL
 */
function extractBase64FromDataUrl(dataUrl: string): {
  base64: string;
  mimeType: string;
} {
  // Format: data:image/jpeg;base64,/9j/4AAQ...
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 data URL");
  }

  return {
    mimeType: matches[1],
    base64: matches[2],
  };
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
  };
  return map[mimeType] || ".bin";
}

/**
 * Upload base64 document to Firebase
 */
async function uploadBase64Document(base64DataUrl: string, docType: string) {
  if (!base64DataUrl) throw new Error(`No base64 data for ${docType}`);

  // ✅ Extract base64 and mimeType from data URL
  const { base64, mimeType } = extractBase64FromDataUrl(base64DataUrl);

  // ✅ Convert base64 to buffer
  const buffer = Buffer.from(base64, "base64");

  // ✅ Get correct file extension from MIME type
  const extension = getExtensionFromMimeType(mimeType);
  const fileName = `ZeptPay/MerchantDocs/${uuidv4()}${extension}`;
  const file = bucket.file(fileName);

  // ✅ Upload with correct contentType
  await file.save(buffer, {
    contentType: mimeType, // Use actual MIME type, not hardcoded 'image/png'
    public: true,
    resumable: false,
    metadata: {
      firebaseStorageDownloadTokens: uuidv4(),
      contentType: mimeType,
    },
  });

  // ✅ Make public
  await file.makePublic();

  // ✅ Generate public URL
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    fileName,
  )}?alt=media`;

  console.log(`📤 Uploaded ${docType}: ${publicUrl} (${mimeType})`);

  return publicUrl;
}

/**
 * Check KYC completion
 */
function checkKycCompletion(merchant: any) {
  const kyc = merchant.kycDetails || {};
  return !!(
    kyc.panNumber &&
    kyc.aadhaarNumber &&
    kyc.panCardUrl &&
    kyc.selfieUrl
  );
}

/**
 * Check Bank completion
 */
function checkBankCompletion(merchant: any) {
  const bank = merchant.bankDetails || {};
  return !!(bank.accountHolderName && bank.accountNumber && bank.ifscCode);
}

const generateVendorCodeUID = (): string => {
  return "VC-UID_" + crypto.randomBytes(12).toString("hex"); // e.g., VC_a1b2c3d4e5f6
};

/**
 * POST: Create Merchant + Generate Token
 */
export const createMerchant = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    console.log("📥 Incoming request body:", req.body);

    const {
      merchantName,
      merchantEmail,
      merchantPhone,
      businessName,
      businessType,
      businessCategory,
      country,
      dob,
      nationality,
      mode = "test",
      metadata,
      publicKey,
      secretKey,
      clientKey,
      kycDetails,
      bankDetails,
    } = req.body;

    // ✅ Validate required keys
    if (!publicKey || !secretKey || !clientKey) {
      console.log("❌ Missing keys:", { publicKey, secretKey, clientKey });
      return res.status(400).json({
        success: false,
        message: "publicKey, secretKey, and clientKey are required",
      });
    }

    // 🔐 Validate API key
    const apiKey = await ApiKey.findOne({
      publicKey,
      secretKey,
      isActive: true,
    });
    if (!apiKey) {
      console.log("❌ Invalid API key for publicKey:", publicKey);
      return res
        .status(401)
        .json({ success: false, message: "Invalid public or secret key" });
    }

    // 🔐 Validate developer
    const developer = await DeveloperOnboarding.findOne({
      clientKey,
      userId: apiKey.userId,
    });
    if (!developer) {
      console.log("❌ Invalid client key:", clientKey);
      return res
        .status(401)
        .json({ success: false, message: "Invalid client key" });
    }

    // 🔎 Check existing merchant
    const existingMerchant = await Merchant.findOne({
      merchantPhone,
      developerUserId: apiKey.userId,
    });
    if (existingMerchant) {
      console.log("⚠️ Merchant already exists:", existingMerchant._id);
      const token = generateToken({
        id: existingMerchant.merchantUserId.toString(),
        merchantId: existingMerchant._id.toString(),
        role: "merchant",
      });

      return res.status(200).json({
        success: true,
        message: "Merchant already exists",
        token,
        merchant: existingMerchant,
      });
    }

    // 👤 User creation
    let user = await User.findOne({ phone: merchantPhone });
    if (!user) {
      user = new User({
        name: merchantName,
        email: merchantEmail,
        phone: merchantPhone,
        country,
        role: "merchant",
        isVerified: true,
      });
      await user.save();
      console.log("✅ Created new user:", user._id);
      const token = generateToken({
        id: user._id.toString(),
        role: user.isDeveloper ? "developer" : "user",
      });
    }

    // 🏪 Merchant creation
    const merchantDID = "zeptpay_" + new mongoose.Types.ObjectId().toString();
    const walletId = "wallet_" + new mongoose.Types.ObjectId().toString();
    const vendorCodeUID = generateVendorCodeUID(); // ✅ Generate unique vendor code

    const merchant = new Merchant({
      vendorCodeUID, // <-- add here, // <-- add here
      merchantName,
      merchantEmail,
      merchantPhone,
      businessName,
      businessType,
      businessCategory,
      country,
      dob,
      nationality,
      mode,
      metadata,
      merchantUserId: user._id,
      merchantDID,
      walletId,
      developerOnboardingId: developer._id,
      developerUserId: apiKey.userId,
      developerClientKey: clientKey,
      kycDetails: {},
      bankDetails: {},
    });

    console.log(
      "📄 Initial merchant object before processing KYC/bank:",
      merchant,
    );

    // 📄 Process KYC (base64 → Firebase URL)
    if (kycDetails) {
      const processedKyc: any = {};

      for (const [key, value] of Object.entries(kycDetails)) {
        if (value && key.endsWith("Url") && typeof value === "string") {
          try {
            // ✅ Upload to Firebase and get public URL
            const firebaseUrl = await uploadBase64Document(
              value as string,
              key,
            );
            processedKyc[key] = firebaseUrl;
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${key}:`, uploadError);
            processedKyc[key] = value; // Fallback to base64 if upload fails
          }
        } else {
          processedKyc[key] = value;
        }
      }

      merchant.kycDetails = processedKyc;
    }

    // 🏦 Process Bank Details (cancelledChequeUrl bhi same process)
    if (bankDetails) {
      const processedBank: any = {};

      for (const [key, value] of Object.entries(bankDetails)) {
        if (
          value &&
          key === "cancelledChequeUrl" &&
          typeof value === "string"
        ) {
          try {
            const firebaseUrl = await uploadBase64Document(
              value as string,
              key,
            );
            processedBank[key] = firebaseUrl;
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${key}:`, uploadError);
            processedBank[key] = value;
          }
        } else {
          processedBank[key] = value;
        }
      }

      merchant.bankDetails = processedBank;
      console.log("🏦 Bank details set:", merchant.bankDetails);
    }

    // ✅ Calculate completion flags
    merchant.isKycCompleted = checkKycCompletion(merchant);
    merchant.isBankDetailsCompleted = checkBankCompletion(merchant);
    merchant.kycStatus = merchant.isKycCompleted ? "pending" : "not_submitted";

    await merchant.save();
    console.log("✅ Merchant saved successfully:", merchant._id);

    // 🔑 Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      merchantId: merchant._id.toString(),
      role: "merchant",
    });

    console.log("🔑 Generated token for merchant");

    return res.status(201).json({
      success: true,
      message: "Merchant onboarded successfully",
      token,
      merchant: {
        merchantId: merchant._id,
        vendorCodeUID: merchant.vendorCodeUID, // ✅ send to frontend
        zeptpayMerchantId: merchant.merchantDID,
        walletId: merchant.walletId,
        status: merchant.status,
        kycStatus: merchant.kycStatus,
        isKycCompleted: merchant.isKycCompleted,
        isBankDetailsCompleted: merchant.isBankDetailsCompleted,
        mode: merchant.mode,
        image: user?.image || null,
        dob: merchant.dob,
        merchantDID: merchant.merchantDID,
        merchantName: merchant.merchantName,
        merchantEmail: merchant.merchantEmail,
        merchantPhone: merchant.merchantPhone,
      },
    });
  } catch (error: any) {
    console.error("❌ CREATE MERCHANT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create merchant",
    });
  } finally {
    console.log("⏱ Execution Time:", Date.now() - startTime, "ms");
  }
};

/**
 * GET: Merchant Status
 */
export const getMerchantStatus = async (req: Request, res: Response) => {
  console.log("📥 [GET MERCHANT STATUS]", new Date().toISOString());

  try {
    // 🔐 1️⃣ Extract token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    // 🔐 2️⃣ Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    const merchantId = decoded.merchantId;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // 🛡 Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid merchant ID format",
      });
    }

    // 🔎 3️⃣ Fetch merchant
    const merchant = await Merchant.findById(merchantId).select(
      "vendorCodeUID status kycStatus dob merchantDID walletId merchantName merchantEmail merchantPhone",
    );

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    // 🔎 4️⃣ Find user by phone number
    const user = await User.findOne({
      phone: merchant.merchantPhone,
    }).select("image");

    // 🎯 5️⃣ Send only required data
    return res.status(200).json({
      success: true,
      data: {
        merchantId: merchant._id,
        vendorCodeUID: merchant.vendorCodeUID, // ✅ send to frontend
        image: user?.image || null,
        status: merchant.status,
        kycStatus: merchant.kycStatus,
        dob: merchant.dob,
        mode: merchant.mode,
        merchantDID: merchant.merchantDID,
        walletId: merchant.walletId,
        merchantName: merchant.merchantName,
        merchantEmail: merchant.merchantEmail,
        merchantPhone: merchant.merchantPhone,
      },
    });
  } catch (error: any) {
    console.error("❌ GET MERCHANT STATUS ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Refresh merchant token
 */
export const refreshMerchantToken = async (req: Request, res: Response) => {
  console.log(
    "📥 [REFRESH MERCHANT TOKEN] Request received at",
    new Date().toISOString(),
  );
  console.log("📦 Body:", req.body);

  try {
    const { merchantId } = req.body;
    console.log("🔍 Fetching merchant for token refresh:", merchantId);

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      console.warn("⚠️ Merchant not found for token refresh:", merchantId);
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    console.log("✅ Merchant found, generating new token for:", merchantId);
    const newToken = generateToken({
      id: merchant.merchantUserId.toString(),
      merchantId: merchant._id.toString(),
      role: "merchant",
    });

    console.log("🔑 New token generated:", newToken);

    return res.json({ success: true, token: newToken });
  } catch (error) {
    console.error("❌ [REFRESH MERCHANT TOKEN] Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to refresh token" });
  }
};
