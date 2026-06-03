// services/webhook/handleWebhookByStatus.ts
import { triggerWebhook } from "./triggerWebhook";

interface WebhookTransaction {
  _id: any;
  userId?: any;
  developerUserId?: string;
  status: string;
  toObject?: () => any;
  [key: string]: any;
}

// 🔥 Map status to event type
const getEventTypeFromStatus = (status: string): string | null => {
  const statusMap: Record<string, string> = {
    created: "created",
    processing: "processing",
    authorized: "authorized",
    captured: "captured",
    failed: "failed",
    cancelled: "cancelled",
    refunded: "refunded",
  };
  return statusMap[status] || null;
};

export const handleWebhookByStatus = async (
  transaction: WebhookTransaction,
): Promise<void> => {
  try {
    const eventType = getEventTypeFromStatus(transaction.status);

    if (!eventType) {
      console.log(`No webhook event mapped for status: ${transaction.status}`);
      return;
    }

    let merchantId = transaction.userId || transaction.developerUserId;

    if (!merchantId) {
      console.error("Cannot trigger webhook: No merchant ID found");
      return;
    }

    if (merchantId && typeof merchantId !== "string") {
      merchantId = merchantId.toString();
    }

    let transactionData: any;
    try {
      if (transaction.toObject) {
        transactionData = transaction.toObject();
      } else {
        transactionData = { ...transaction };
      }

      if (
        transactionData.userId &&
        typeof transactionData.userId !== "string"
      ) {
        transactionData.userId = transactionData.userId.toString();
      }

      transactionData = JSON.parse(JSON.stringify(transactionData));
    } catch (error) {
      transactionData = {
        _id: transaction._id?.toString(),
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        meta: transaction.meta,
      };
    }

    await triggerWebhook({
      merchantId: merchantId.toString(),
      eventType,
      data: transactionData,
    });

    console.log(`✅ Webhook triggered for transaction ${transaction._id}`, {
      status: transaction.status,
      eventType,
      merchantId,
    });
  } catch (error) {
    console.error("Error in handleWebhookByStatus:", error);
  }
};
