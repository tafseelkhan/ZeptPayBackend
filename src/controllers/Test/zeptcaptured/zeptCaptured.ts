import { Request, Response } from "express";
import crypto from "crypto";
import DeveloperOnboarding from "../../../models/tests/zeptcaptured/zeptCaptured";
import { bucket } from "../../../firebase/firebase";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload base64 image to Firebase
 */
export async function uploadBase64Image(base64Data: string, imageType: string) {
  console.log(`🖼️ Uploading ${imageType}...`);

  const buffer = Buffer.from(base64Data, "base64");
  const fileName = `ZeptPay/AirCaptured/${uuidv4()}.png`;
  const file = bucket.file(fileName);

  await file.save(buffer, {
    contentType: "image/png",
    public: true,
    metadata: {
      firebaseStorageDownloadTokens: uuidv4(),
    },
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    fileName,
  )}?alt=media`;

  console.log(`✅ ${imageType} uploaded: ${url}`);
  return url;
}

// 🔐 Random generator
const randomToken = (length = 32) => crypto.randomBytes(length).toString("hex");

/**
 * Generate Client Key
 */
function generateClientKey(isLive: boolean) {
  const type = "ck-flixora";
  const mode = isLive ? "live" : "test";
  const rand = randomToken(24);

  const clientKey = `${type}_${mode}_@zeptpay:tizzy-flixora-ecosystem_${rand}`;

  console.log("🔑 Generated Client Key:", clientKey);
  return clientKey;
}

export const createDeveloper = async (req: Request, res: Response) => {
  console.log("🚀 ================================");
  console.log("🚀 createDeveloper API HIT");
  console.log("🚀 ================================");

  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: userId not found",
    });
  }

  try {
    const {
      developerName,
      developerEmail,
      companyName,
      businessType,
      website,
      phone,
      country,
      logoUrl,
      identityProofUrl,
      selfieUrl,
      addressProofUrl,
      businessAddress,
      homeAddress,
      nationality,
      dob,
      appName,
      appStoreUrl,
      businessCategory,
      termsAccepted,
      internationalPaymentsAccepted,
      notes,
      zeptcapturedPurpose,
      metadata,
      taxId,
      registrationNumber,
    } = req.body;

    const isLive = metadata?.mode === "live";
    console.log("🎮 Mode:", isLive ? "LIVE" : "TEST");

    // 🔹 Upload Images (only if provided)
    let uploadedLogo = undefined;
    let uploadedIdentity = undefined;
    let uploadedSelfie = undefined;
    let uploadedAddress = undefined;

    if (logoUrl) {
      uploadedLogo = await uploadBase64Image(logoUrl, "Logo");
    }

    if (identityProofUrl) {
      uploadedIdentity = await uploadBase64Image(
        identityProofUrl,
        "Identity Proof",
      );
    }

    if (selfieUrl) {
      uploadedSelfie = await uploadBase64Image(selfieUrl, "Selfie");
    }

    if (addressProofUrl) {
      uploadedAddress = await uploadBase64Image(
        addressProofUrl,
        "Address Proof",
      );
    }

    // 🔹 Generate Client Key (ALWAYS)
    const generatedClientKey = generateClientKey(isLive);

    // 🔹 Determine Status
    let finalStatus: "pending" | "verified" | "rejected";

    if (!isLive) {
      finalStatus = "verified"; // Test mode auto verify
      console.log("🧪 Auto verified (TEST MODE)");
    } else {
      finalStatus = "pending"; // Live mode → admin approval
      console.log("🟡 Live mode → Pending Admin Approval");
    }

    // 🔹 Save Developer
    const developer = await DeveloperOnboarding.create({
      userId,
      developerName,
      developerEmail,
      companyName,
      businessType,
      website,
      phone,
      country,
      logoUrl: uploadedLogo,
      identityProofUrl: uploadedIdentity,
      selfieUrl: uploadedSelfie,
      addressProofUrl: uploadedAddress,
      businessAddress, // Direct string field
      homeAddress, // Direct string field
      nationality,
      dob: dob ? new Date(dob) : undefined,
      appName,
      appStoreUrl,
      businessWebsiteVerified: false,
      appVerified: false,
      businessCategory,
      termsAccepted: termsAccepted || false,
      internationalPaymentsAccepted: internationalPaymentsAccepted || false,
      notes,
      zeptcapturedEnabled: true,
      zeptcapturedPurpose,
      clientKey: generatedClientKey,
      metadata,
      status: finalStatus,
      taxId,
      registrationNumber,
    });

    console.log("🎉 Developer Created Successfully!");
    console.log("📧 Email:", developerEmail);
    console.log("🔑 ClientKey:", generatedClientKey);
    console.log("📌 Status:", finalStatus);

    return res.status(201).json({
      success: true,
      message: `Developer onboarded in ${isLive ? "LIVE" : "TEST"} mode`,
      data: {
        developerId: developer._id,
        developerEmail: developer.developerEmail,
        clientKey: generatedClientKey,
        status: finalStatus,
        mode: isLive ? "live" : "test",
      },
    });
  } catch (error) {
    console.error("🔥 ERROR:", error);

    // Handle duplicate email error
    if (
      error instanceof Error &&
      error.message.includes("duplicate key error")
    ) {
      return res.status(400).json({
        success: false,
        message: "Developer with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create developer",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
