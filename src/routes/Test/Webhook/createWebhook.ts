import express from "express";
import {
  createWebhook,
  getWebhook,
  updateWebhookEvents,
  toggleWebhookStatus,
} from "../../../controllers/Test/Webhook/createWebhookController";
import { getWebhookEvents } from "../../../controllers/Test/Webhook/getWebhookEventController";
import { authMiddleware } from "../../../middleware/authMiddleware";

const router = express.Router();

router.post("/create", authMiddleware, createWebhook);

router.get("/me", authMiddleware, getWebhook);

router.put("/events", authMiddleware, updateWebhookEvents);

router.put("/status", authMiddleware, toggleWebhookStatus);

router.get("/events", getWebhookEvents);

export default router;
