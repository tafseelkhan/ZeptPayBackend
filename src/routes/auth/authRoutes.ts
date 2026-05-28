import { Router } from "express";
import {
  signup,
  login,
  verifyLoginOTP,
  verifySignupOTP,
  checkToken,
  resendSignupOTP,
  resendLoginOTP,
  getUserDetails,
  getMe,
} from "../../controllers/auth/authController";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

// ===== Auth Routes =====

// Signup → user creates account (country required)
router.post("/signup", signup);

// Login → OTP sent
router.post("/login", login);

// Verify OTP → returns JWT token
router.post("/verify-otp-signup", verifySignupOTP);

// Verify OTP → returns JWT token
router.post("/verify-otp-login", verifyLoginOTP);

// GET /api/auth/check
router.get("/check", checkToken);

// GET /api/auth/user
router.get("/user", getUserDetails);

// Resend OTP for Signup
router.post("/resend-otp-signup", resendSignupOTP);

// Resend OTP for Login
router.post("/resend-otp-login", resendLoginOTP);

router.get("/user/me", authMiddleware, getMe);  // 🔥 Frontend yahi use karega

export default router;
