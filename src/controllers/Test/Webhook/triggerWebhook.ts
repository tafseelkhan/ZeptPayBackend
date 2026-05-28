// services/webhook/triggerWebhook.ts
import axios, { AxiosError } from "axios";
import crypto from "crypto";
import Webhook from "../../../models/Test/webhook/webhook";

interface WebhookPayload {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

interface TriggerWebhookParams {
  merchantId: string;
  eventType: string;
  data: any;
}

const generateSignature = (
  timestamp: number,
  payload: any,
  secret: string,
): string => {
  const data = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
};

// 🔥 UPDATE DELIVERY LOGS
const updateDeliveryLogs = async (
  webhookId: any,
  whsecNumber: string,
  event: string,
  status: "success" | "failed",
  error?: string,
) => {
  try {
    const webhook = await Webhook.findById(webhookId);
    if (!webhook) return;

    // Find existing log for this webhook and event
    const existingLogIndex = webhook.deliveryLogs.findIndex(
      (log) => log.whsecNumber === whsecNumber && log.event === event,
    );

    const logEntry = {
      whsecNumber,
      event,
      attempt:
        (existingLogIndex >= 0
          ? webhook.deliveryLogs[existingLogIndex].attempt
          : 0) + 1,
      status,
      lastError: error,
      lastCalledAt: new Date(),
    };

    if (existingLogIndex >= 0) {
      webhook.deliveryLogs[existingLogIndex] = logEntry;
    } else {
      webhook.deliveryLogs.push(logEntry);
    }

    // 🔥 Update overall stats
    webhook.totalAttempts += 1;
    if (status === "success") {
      webhook.successAttempts += 1;
    } else {
      webhook.failedAttempts += 1;
    }
    webhook.lastCalledAt = new Date();

    await webhook.save();

    console.log(`📊 Stats updated:`, {
      whsecNumber: whsecNumber.substring(0, 20),
      event,
      status,
      totalAttempts: webhook.totalAttempts,
      successAttempts: webhook.successAttempts,
      failedAttempts: webhook.failedAttempts,
    });
  } catch (error) {
    console.error("Failed to update delivery log:", error);
  }
};

const sendWebhookWithRetry = async (
  webhookDoc: any,
  url: string,
  payload: WebhookPayload,
  headers: Record<string, string>,
  attempt: number = 1,
): Promise<void> => {
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 3000];

  try {
    const response = await axios.post(url, payload, {
      headers,
      timeout: 10000,
    });

    console.log(`✅ Webhook delivered successfully`, {
      url,
      eventType: payload.type,
      statusCode: response.status,
      attempt,
    });

    // 🔥 Update success log
    await updateDeliveryLogs(
      webhookDoc._id,
      webhookDoc.webhook.substring(0, 20),
      payload.type,
      "success",
    );
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`❌ Webhook delivery failed`, {
      url,
      eventType: payload.type,
      attempt,
      error: axiosError.message,
    });

    if (attempt < maxRetries) {
      const delay = retryDelays[attempt - 1];
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendWebhookWithRetry(
        webhookDoc,
        url,
        payload,
        headers,
        attempt + 1,
      );
    } else {
      // 🔥 Update failure log after all retries exhausted
      await updateDeliveryLogs(
        webhookDoc._id,
        webhookDoc.webhook.substring(0, 20),
        payload.type,
        "failed",
        axiosError.message,
      );
    }
  }
};

export const triggerWebhook = async ({
  merchantId,
  eventType,
  data,
}: TriggerWebhookParams): Promise<void> => {
  try {
    // 🔥 Map eventType to full event name
    const eventMap: Record<string, string> = {
      created: "zeptpay-flixora.payment_intent.created",
      processing: "zeptpay-flixora.payment_intent.processing",
      authorized: "zeptpay-flixora.payment_intent.requires_action",
      captured: "zeptpay-flixora.payment_intent.succeeded",
      failed: "zeptpay-flixora.payment_intent.payment_failed",
      cancelled: "zeptpay-flixora.payment_intent.canceled",
      refunded: "zeptpay-flixora.charge.refunded",
    };

    const fullEventType = eventMap[eventType] || eventType;

    // Determine mode from transaction
    const transactionMode = data.meta?.testMode ? "test" : "live";

    // 🔥 Fetch webhook using developerUserId (merchantId) and mode
    const webhook = await Webhook.findOne({
      developerUserId: merchantId,
      mode: transactionMode,
      isActive: true,
    }).lean();

    if (!webhook) {
      console.log(
        `No active webhook found for merchant ${merchantId} in ${transactionMode} mode`,
      );
      return;
    }

    // 🔥 Use appropriate URL based on mode
    const targetUrl =
      webhook.mode === "test" && webhook.localUrl
        ? webhook.localUrl
        : webhook.url;

    const timestamp = Date.now();
    const eventId = `evt_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    const payload: WebhookPayload = {
      id: eventId,
      type: fullEventType,
      data: {
        object: data,
      },
      created: Math.floor(timestamp / 1000),
    };

    console.log(`🔔 Triggering webhook:`, {
      merchantId,
      eventType: fullEventType,
      mode: transactionMode,
      url: targetUrl,
    });

    const signature = generateSignature(timestamp, payload, webhook.webhook);

    const headers = {
      "x-zeptpay-signature": signature,
      "x-zeptpay-timestamp": timestamp.toString(),
      "x-zeptpay-event": fullEventType,
      "x-zeptpay-mode": webhook.mode,
      "Content-Type": "application/json",
    };

    await sendWebhookWithRetry(webhook, targetUrl, payload, headers);
  } catch (error) {
    console.error("Error in triggerWebhook:", error);
  }
};
