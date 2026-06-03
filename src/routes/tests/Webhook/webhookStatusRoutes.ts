// src/routes/webhookStatus.routes.ts

import express from "express";
import { getWebhookStatus } from "../../../controllers/tests/Webhook/webhookStatusController";
import { authMiddleware } from "../../../middleware/authMiddleware"; // your auth middleware

const router = express.Router();

router.get("/status", authMiddleware, getWebhookStatus);

export default router;