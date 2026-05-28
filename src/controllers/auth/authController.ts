import { Request, Response } from "express";
import User, { IUser } from "../../models/auth/User";
import { generateToken } from "../../config/jwt";
import dotenv from "dotenv";
import Twilio from "twilio";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../../middleware/authMiddleware";
import { createDefaultApiKeys } from "../../utils/apiKeyGenerator";

dotenv.config();

// ===============================
// 🔧 TWILIO SETUP
// ===============================
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID || "",
  process.env.TWILIO_AUTH_TOKEN || "",
);

const TWILIO_FROM = process.env.TWILIO_FROM || "+18623664937";

// ===============================
// 📞 SMART PHONE FORMATTER - NO SPACE (Store as +919983141558)
// ===============================
interface ParsedPhone {
  countryCode: string;
  number: string;
  fullNumber: string; // +919983141558 (STORED IN DB - NO SPACE)
  fullWithSpace: string; // +91 9983141558 (for display only)
}

const parsePhoneNumber = (phone: string): ParsedPhone => {
  // Remove all spaces and special chars initially
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }

  // Extract country code (1-4 digits after +) and rest is number
  const match = cleaned.match(/^\+(\d{1,4})(\d+)$/);

  if (!match) {
    throw new Error("Invalid phone number format");
  }

  const countryCode = match[1];
  const number = match[2];

  // Store WITHOUT space: +919983141558
  const fullNumber = `+${countryCode}${number}`;

  // For display only: +91 9983141558
  const fullWithSpace = `+${countryCode} ${number}`;

  return {
    countryCode,
    number,
    fullNumber,
    fullWithSpace,
  };
};

// For database storage - WITHOUT SPACE
const formatPhoneForDB = (phone: string): string => {
  const parsed = parsePhoneNumber(phone);
  return parsed.fullNumber; // +919983141558
};

// For Twilio SMS - WITHOUT SPACE (same as DB)
const formatPhoneForTwilio = (phone: string): string => {
  const parsed = parsePhoneNumber(phone);
  return parsed.fullNumber; // +919983141558
};

// For display - WITH SPACE
const formatPhoneForDisplay = (phone: string): string => {
  const parsed = parsePhoneNumber(phone);
  return parsed.fullWithSpace; // +91 9983141558
};

// ===============================
// 📞 FIND USER BY PHONE - Exact match only (no space)
// ===============================
const findUserByPhone = async (phone: string) => {
  // Parse to get standard format
  let parsed;
  try {
    parsed = parsePhoneNumber(phone);
  } catch (err) {
    return null;
  }

  const dbFormat = parsed.fullNumber; // +919983141558

  console.log("🔍 Searching for user with exact format:", dbFormat);

  const user = await User.findOne({ phone: dbFormat });

  if (user) {
    console.log("✅ User found:", dbFormat);
    return user;
  }

  return null;
};

// ===============================
// 📩 SEND OTP SMS
// ===============================
const sendOTPMessage = async (phone: string, message: string) => {
  try {
    const parsed = parsePhoneNumber(phone);
    const twilioPhone = parsed.fullNumber; // +919983141558
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_FROM,
      to: twilioPhone,
    });
    console.log(`✅ OTP SMS sent to ${twilioPhone}`);
    return true;
  } catch (err: any) {
    console.error("❌ Twilio SMS error:", err.message, "code:", err.code);
    return false;
  }
};

// ===============================
// 🔐 OTP GENERATOR
// ===============================
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ===============================
// ✅ TEMP OTP STORE (Memory - Phone as Key)
// ===============================
interface TempSignup {
  name: string;
  phone: string; // Stored as +919983141558 (NO space)
  phoneDisplay: string; // For display: +91 9983141558
  country: string;
  isDeveloper: boolean;
  balance: number;
  otp: string;
  otpExpiry: number;
}
const tempOTPs: Record<string, TempSignup> = {};

// Cleanup expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  Object.keys(tempOTPs).forEach((phone) => {
    if (tempOTPs[phone].otpExpiry < now) {
      delete tempOTPs[phone];
      console.log(`🧹 Cleaned expired signup OTP for ${phone}`);
    }
  });
}, 60000);

// ===============================
// ✅ SIGNUP - Generate OTP
// ===============================
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, phone, country, isDeveloper } = req.body;

    if (!name || !phone || !country) {
      return res
        .status(400)
        .json({ message: "Name, phone and country required" });
    }

    // Parse phone number
    let parsedPhone;
    try {
      parsedPhone = parsePhoneNumber(phone);
    } catch (err) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const dbPhone = parsedPhone.fullNumber; // +919983141558 (NO space)
    const displayPhone = parsedPhone.fullWithSpace; // +91 9983141558

    console.log("📞 Signup - DB Phone (no space):", dbPhone);
    console.log("📞 Signup - Display Phone:", displayPhone);
    console.log("📞 Country Code:", parsedPhone.countryCode);
    console.log("📞 Number:", parsedPhone.number);

    // Check if user already exists
    const existingUser = await User.findOne({ phone: dbPhone });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists. Please login." });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 60 * 1000; // 60 seconds

    // Store with phone as key
    tempOTPs[dbPhone] = {
      name,
      phone: dbPhone,
      phoneDisplay: displayPhone,
      country,
      isDeveloper: !!isDeveloper,
      balance: 1000,
      otp,
      otpExpiry,
    };

    console.log(`🔢 Signup OTP for ${displayPhone}: ${otp} (expires in 60s)`);

    // Send OTP via SMS
    await sendOTPMessage(
      dbPhone,
      `Your ZeptPay verification OTP is ${otp}. Valid for 60 seconds.`,
    );

    // Return OTP only in development
    const response: any = {
      message: "OTP sent. Please verify to complete signup.",
      phone: displayPhone,
    };
    if (process.env.NODE_ENV !== "production") {
      response.otp = otp;
    }

    res.json(response);
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ✅ VERIFY SIGNUP OTP - Phone + OTP
// ===============================
export const verifySignupOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    // Parse to get DB format
    let parsedPhone;
    try {
      parsedPhone = parsePhoneNumber(phone);
    } catch (err) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const dbPhone = parsedPhone.fullNumber; // +919983141558
    const tempData = tempOTPs[dbPhone];

    if (!tempData) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP. Please request a new one." });
    }

    if (tempData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (tempData.otpExpiry < Date.now()) {
      delete tempOTPs[dbPhone];
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new one." });
    }

    // Create user in database with phone number (NO space)
    const user = new User({
      name: tempData.name,
      phone: dbPhone, // +919983141558 (NO space)
      country: tempData.country,
      isDeveloper: tempData.isDeveloper,
      balance: tempData.balance,
      isLive: false,
    });

    await user.save();

    if (createDefaultApiKeys) {
      await createDefaultApiKeys(user._id.toString());
    }

    delete tempOTPs[dbPhone];

    const token = generateToken({
      id: user._id.toString(),
      role: user.isDeveloper ? "developer" : "user",
    });

    console.log(`✅ User created: ${user.phone}`);

    res.json({
      message: "Signup complete",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        country: user.country,
        isDeveloper: user.isDeveloper,
        balance: user.balance,
        isLive: user.isLive,
      },
      token,
    });
  } catch (err) {
    console.error("❌ VerifySignupOTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ✅ RESEND SIGNUP OTP
// ===============================
export const resendSignupOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const parsedPhone = parsePhoneNumber(phone);
    const dbPhone = parsedPhone.fullNumber;
    const tempData = tempOTPs[dbPhone];

    if (!tempData) {
      return res
        .status(400)
        .json({ message: "No pending signup found. Please start over." });
    }

    const newOtp = generateOTP();
    const newExpiry = Date.now() + 60 * 1000;

    tempData.otp = newOtp;
    tempData.otpExpiry = newExpiry;
    tempOTPs[dbPhone] = tempData;

    await sendOTPMessage(
      dbPhone,
      `Your ZeptPay verification OTP is ${newOtp}. Valid for 60 seconds.`,
    );

    console.log(
      `📱 Resent signup OTP for ${parsedPhone.fullWithSpace}: ${newOtp}`,
    );

    const response: any = { message: "OTP resent successfully" };
    if (process.env.NODE_ENV !== "production") {
      response.otp = newOtp;
    }

    res.json(response);
  } catch (err) {
    console.error("❌ Resend signup OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ✅ LOGIN - Generate OTP
// ===============================
export const login = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    console.log("📞 Login request for phone:", phone);

    // Parse and get DB format
    let parsedPhone;
    try {
      parsedPhone = parsePhoneNumber(phone);
    } catch (err) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const dbPhone = parsedPhone.fullNumber;
    console.log("📞 Searching for exact phone:", dbPhone);

    // Exact match only
    const user = await User.findOne({ phone: dbPhone });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found. Please signup first." });
    }

    console.log("✅ User found with phone:", user.phone);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    console.log(`🔐 Login OTP for ${parsedPhone.fullWithSpace}: ${otp}`);

    await sendOTPMessage(
      dbPhone,
      `Your ZeptPay login OTP is ${otp}. Valid for 1 minute.`,
    );

    const response: any = {
      message: "OTP sent successfully. Please verify to login.",
    };

    if (process.env.NODE_ENV !== "production") {
      response.otp = otp;
    }

    res.json(response);
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ✅ VERIFY LOGIN OTP
// ===============================
export const verifyLoginOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    console.log("🔐 Verifying OTP for phone:", phone);

    // Parse and get DB format
    let parsedPhone;
    try {
      parsedPhone = parsePhoneNumber(phone);
    } catch (err) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const dbPhone = parsedPhone.fullNumber;
    const user = await User.findOne({ phone: dbPhone }).select(
      "+otp +otpExpiry",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp) {
      return res
        .status(400)
        .json({ message: "No OTP requested. Please login again." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new one." });
    }

    const now = new Date();
    if (user.otpExpiry < now) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new one." });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = generateToken({
      id: user._id.toString(),
      role: user.isDeveloper ? "developer" : "user",
    });

    console.log(`✅ User logged in: ${user.phone}`);

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        country: user.country,
        isDeveloper: user.isDeveloper,
        balance: user.balance,
        isLive: user.isLive,
      },
      token,
    });
  } catch (err) {
    console.error("❌ VerifyLoginOTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ✅ RESEND LOGIN OTP
// ===============================
export const resendLoginOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    console.log("📞 Resending OTP for phone:", phone);

    let parsedPhone;
    try {
      parsedPhone = parsePhoneNumber(phone);
    } catch (err) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const dbPhone = parsedPhone.fullNumber;
    const user = await User.findOne({ phone: dbPhone });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newOtp = generateOTP();
    const newExpiry = new Date(Date.now() + 60 * 1000);

    user.otp = newOtp;
    user.otpExpiry = newExpiry;
    await user.save();

    await sendOTPMessage(
      dbPhone,
      `Your ZeptPay login OTP is ${newOtp}. Valid for 1 minute.`,
    );

    console.log(
      `🔐 Resent login OTP for ${parsedPhone.fullWithSpace}: ${newOtp}`,
    );

    const response: any = { message: "OTP resent successfully" };
    if (process.env.NODE_ENV !== "production") {
      response.otp = newOtp;
    }

    res.json(response);
  } catch (err) {
    console.error("❌ Resend login OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ✅ CHECK TOKEN
// ===============================
export const checkToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "Authorization header missing" });

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "secret";
    const decoded: any = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Check token error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// ✅ GET FULL USER DETAILS BY TOKEN
// ===============================
export const getUserDetails = async (req: Request, res: Response) => {
  try {
    console.log("🟢 [GET USER] Request received");

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("⚠️ Authorization header missing");
      return res
        .status(401)
        .json({ success: false, message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "secret";

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
      console.log("🔑 Token decoded:", decoded);
    } catch (err) {
      console.warn("❌ Invalid or expired token");
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      console.warn("❌ User not found for token");
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log("✅ User found, sending full details");
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ GetUserDetails error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// ✅ GET ME
// ===============================
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log("📥 [getMe] API called");

    const user = req.user;

    if (!user) {
      console.log("❌ [getMe] User not found in request");
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    console.log("✅ [getMe] User fetched successfully:", {
      userId: user._id,
      name: user.name,
      phone: user.phone,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("🔥 [getMe] Error caught:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
