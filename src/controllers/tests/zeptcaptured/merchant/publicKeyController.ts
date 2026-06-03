import { Request, Response } from "express";
import ApiKeys from "../../../../models/tests/ApiKeys";
import User from "../../../../models/auth/User";

export const verifyPublicKey = async (req: Request, res: Response) => {
  try {
    const publicKey: string | undefined = req.body?.publicKey;

    console.log("📝 verifyPublicKey called");

    if (!publicKey || typeof publicKey !== "string") {
      console.log("❌ Public key missing or invalid");
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Public key missing or invalid",
      });
    }

    console.log("🔑 Verifying public key:", publicKey.slice(0, 10) + "...");

    const apiKeyRecord = await ApiKeys.findOne({
      publicKey,
      isActive: true,
    });

    if (!apiKeyRecord) {
      console.log("❌ Invalid or inactive public key");
      return res.status(401).json({
        success: false,
        valid: false,
        message: "Invalid public key",
      });
    }

    const user = await User.findById(apiKeyRecord.userId);

    if (!user) {
      console.log("❌ No user linked with this key");
      return res.status(401).json({
        success: false,
        valid: false,
        message: "Invalid merchant account",
      });
    }

    // ✅ DB se permissions fetch karo — fallback with all false agar field nahi hai
    const dbPermissions = apiKeyRecord.permissions?.paymentMethods;

    const paymentMethods = {
      card: { enabled: dbPermissions?.card?.enabled ?? false },
      zeptpay: { enabled: dbPermissions?.zeptpay?.enabled ?? false },
      upi: { enabled: dbPermissions?.upi?.enabled ?? false },
      netBanking: { enabled: dbPermissions?.netBanking?.enabled ?? false },
      wallet: { enabled: dbPermissions?.wallet?.enabled ?? false },
      autopay: { enabled: dbPermissions?.autopay?.enabled ?? false },
      banktransfer: { enabled: dbPermissions?.banktransfer?.enabled ?? false },
      qrpayment: { enabled: dbPermissions?.qrpayment?.enabled ?? false },
    };

    console.log("📦 Payment methods from DB:", paymentMethods);

    const responseData = {
      success: true,
      valid: true,
      _id: apiKeyRecord._id,
      userId: user._id,
      mode: apiKeyRecord.mode,
      permissions: {
        paymentMethods,
      },
      merchantData: {
        id: user._id,
        name: user.name,
      },
    };

    console.log("✅ Public key verified successfully:", user._id);
    return res.status(200).json(responseData);
  } catch (err: any) {
    console.error("❌ verifyPublicKey error:", err.message);
    return res.status(500).json({
      success: false,
      valid: false,
      message: "Internal server error",
    });
  }
};
