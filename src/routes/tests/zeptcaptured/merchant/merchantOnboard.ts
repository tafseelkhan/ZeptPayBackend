import express from "express";
import {
  createMerchant,
  getMerchantStatus,
  refreshMerchantToken,
} from "../../../../controllers/tests/zeptcaptured/merchant/merchantOnboard"; // path adjust kar le
import { verifyPublicKey } from "../../../../controllers/tests/zeptcaptured/merchant/publicKeyController";
import { merchantMiddleware } from "../../../../middleware/merchantMiddleware";

const router = express.Router();

// 🔹 Merchant Onboarding (Create)
router.post("/create", createMerchant);

// 🔹 Get Pending Status (frontend)
router.get("/status", getMerchantStatus);

// 🔹 Refresh Token
router.post("/refresh-token", refreshMerchantToken);

// 🔹 Verify Public Key
router.post('/verify-public-key', verifyPublicKey);

export default router;
