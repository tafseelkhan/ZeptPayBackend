import { Request, Response } from "express";
import WebhookEventCategory from "../../../models/tests/webhook/webhookevent";

export const getWebhookEvents = async (req: Request, res: Response) => {
  try {
    const categories = await WebhookEventCategory.find().sort({ category: 1 });

    res.status(200).json({
      success: true,
      totalCategories: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch webhook events",
      error,
    });
  }
};
