import express from "express";
import {
  createWebhook,
  getWebhook,
  updateWebhookEvents,
  toggleWebhookStatus,
} from "../../../controllers/tests/Webhook/createWebhookController";
import { getWebhookEvents } from "../../../controllers/tests/Webhook/getWebhookEventController";
import { authMiddleware } from "../../../middleware/authMiddleware";

const router = express.Router();

router.post("/create", authMiddleware, createWebhook);

router.get("/me", authMiddleware, getWebhook);

router.put("/update", authMiddleware, updateWebhookEvents);

router.put("/status", authMiddleware, toggleWebhookStatus);

router.get("/events", getWebhookEvents);

export default router;
