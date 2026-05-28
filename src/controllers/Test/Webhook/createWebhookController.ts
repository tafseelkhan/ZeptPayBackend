import { Request, Response } from "express";
import Webhook from "../../../models/Test/webhook/webhook";
import User from "../../../models/auth/User";
import crypto from "crypto";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

interface MongoError extends Error {
  code?: number;
  keyPattern?: any;
  keyValue?: any;
}

interface IEventDetail {
  name: string;
  title: string;
  description: string;
}

interface IEventCategory {
  category: string;
  category_display: string;
  events: IEventDetail[];
}

const randomToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

const buildKey = (type: "whsec-flixora", mode: "test" | "live") => {
  const rand = randomToken(24);
  return `${type}_${mode}_@zeptpay:tizzy-flixora-ecosystem_${rand}`;
};

/*
-----------------------------------
Create Webhook
-----------------------------------
*/
export const createWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.log("❌ Create Webhook Failed: No user ID in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { url, localUrl, events } = req.body; // events ab array of categories hoga

    if (!url) {
      console.log("❌ Create Webhook Failed: Production URL missing");
      return res.status(400).json({
        success: false,
        message: "Production URL is required",
      });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      console.log("❌ Create Webhook Failed: No events selected");
      return res.status(400).json({
        success: false,
        message: "At least one event category is required",
      });
    }

    // user check
    const user = await User.findById(userId);

    if (!user) {
      console.log(`❌ Create Webhook Failed: User not found with ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log(`✅ User verified: ${user.email} (${userId})`);

    // 🔑 generate both keys
    const testSecret = buildKey("whsec-flixora", "test");
    const liveSecret = buildKey("whsec-flixora", "live");

    console.log(`🔑 Test key generated: ${testSecret}`);
    console.log(`🔑 Live key generated: ${liveSecret}`);

    // ✅ Check if test key already exists
    const existingTestWebhook = await Webhook.findOne({ webhook: testSecret });
    if (existingTestWebhook) {
      console.log(`❌ Test key already exists in database: ${testSecret}`);
      return res.status(409).json({
        success: false,
        message: "Test webhook key already exists. Please try again.",
      });
    }

    // ✅ Check if live key already exists
    const existingLiveWebhook = await Webhook.findOne({ webhook: liveSecret });
    if (existingLiveWebhook) {
      console.log(`❌ Live key already exists in database: ${liveSecret}`);
      return res.status(409).json({
        success: false,
        message: "Live webhook key already exists. Please try again.",
      });
    }

    // ✅ DONO KE LIYE CHECK KAR LIYA, AB CREATE KARO

    // save TEST webhook with full event objects
    const testWebhook = await Webhook.create({
      developerUserId: userId,
      mode: "test",
      url,
      localUrl,
      label: "Webhook Key - TEST MODE - For Development & Testing This key is strictly for development and testing purposes only. Do not use this in live or production environments. In test mode, it safely handles webhook requests without affecting actual data. Ensure this is only active on staging or local machines. Use the main webhook key in production.",
      webhook: testSecret,
      events: events, // 🔥 Directly save the complete event categories with their events
    });

    console.log(`✅ Test webhook created with ID: ${testWebhook._id}`);
    console.log(`📋 Test webhook events:`, JSON.stringify(testWebhook.events, null, 2));

    // save LIVE webhook with full event objects
    const liveWebhook = await Webhook.create({
      developerUserId: userId,
      mode: "live",
      url,
      localUrl,
      label: "Webhook Key - LIVE MODE - For Production & Use This key is for live/production environments only. Handles real webhook requests and affects actual data. Do not use this in development or testing. Ensure this is active only on the production server. Keep this key secure and never expose it publicly.",
      webhook: liveSecret,
      events: events, // 🔥 Directly save the complete event categories with their events
    });

    console.log(`✅ Live webhook created with ID: ${liveWebhook._id}`);
    console.log(`📋 Live webhook events:`, JSON.stringify(liveWebhook.events, null, 2));
    console.log(`🎉 Webhook creation completed for user: ${userId}`);

    // Count total selected events for response
    const totalEventsCount = events.reduce((acc: number, category: IEventCategory) => {
      return acc + (category.events?.length || 0);
    }, 0);

    res.status(201).json({
      success: true,
      message: "Webhook keys generated successfully",
      data: {
        test: {
          id: testWebhook._id,
          key: testSecret,
          mode: "test",
          eventsCount: totalEventsCount,
          events: testWebhook.events // optional: return saved events
        },
        live: {
          id: liveWebhook._id,
          key: liveSecret,
          mode: "live",
          eventsCount: totalEventsCount,
          events: liveWebhook.events // optional: return saved events
        }
      }
    });

  } catch (error) {
    console.error("❌ Error in createWebhook:", error);
    
    const mongoError = error as MongoError;
    
    if (mongoError.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Webhook key already exists. Please try again.",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to create webhook",
      error: mongoError.message || "Unknown error occurred",
    });
  }
};

/*
-----------------------------------
Get Webhook (Mode Based)
-----------------------------------
*/
export const getWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const mode = user.isLive ? "live" : "test";

    const webhook = await Webhook.findOne({
      developerUserId: userId,
      mode,
    });

    res.json({
      success: true,
      mode,
      data: webhook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch webhook",
    });
  }
};

/*
-----------------------------------
Update Webhook Events
-----------------------------------
*/
export const updateWebhookEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { events } = req.body;

    const webhook = await Webhook.findOneAndUpdate(
      { developerUserId: userId },
      { events },
      { new: true },
    );

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: "Webhook not found",
      });
    }

    res.json({
      success: true,
      message: "Events updated successfully",
      data: webhook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update events",
    });
  }
};

/*
-----------------------------------
Enable / Disable Webhook
-----------------------------------
*/
export const toggleWebhookStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { isActive } = req.body;

    const webhook = await Webhook.findOneAndUpdate(
      { developerUserId: userId },
      { isActive },
      { new: true },
    );

    res.json({
      success: true,
      message: "Webhook status updated",
      data: webhook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update webhook status",
    });
  }
};
