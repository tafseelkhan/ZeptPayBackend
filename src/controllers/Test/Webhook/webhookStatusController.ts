// src/controllers/webhookStatus.controller.ts

import { Request, Response } from "express";
import ApiKey from "../../../models/Test/ApiKeys";

export const getWebhookStatus = async (req: Request, res: Response) => {
  try {
    console.log("📥 Webhook Status Request Received");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("User from auth:", req.user);
    
    const userId = req.user?.id; // assuming auth middleware sets req.user
    console.log("Extracted userId:", userId);

    if (!userId) {
      console.log("❌ Unauthorized - No userId found");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    console.log(`🔍 Searching for active API key for user: ${userId}`);
    
    // Find active API key for this user
    const apiKey = await ApiKey.findOne({
      userId,
      isActive: true,
    });

    console.log("API Key query result:", apiKey ? "Found" : "Not found");
    
    if (apiKey) {
      console.log("API Key details:", {
        id: apiKey._id,
        isActive: apiKey.isActive,
        permissions: apiKey.permissions,
      });
    }

    if (!apiKey) {
      console.log("⚠️ No active API key found for user:", userId);
      return res.status(200).json({
        success: true,
        enabled: false,
        message: "No active API key found",
      });
    }

    const webhookEnabled =
      apiKey.permissions?.webhooks?.enabled ?? false;
    
    console.log(`✅ Webhook enabled status for user ${userId}:`, webhookEnabled);
    console.log("📤 Sending response:", {
      success: true,
      enabled: webhookEnabled,
    });

    return res.status(200).json({
      success: true,
      enabled: webhookEnabled,
    });
  } catch (error) {
    console.error("❌ Webhook Status Error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};