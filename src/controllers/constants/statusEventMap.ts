// services/webhook/statusMap.ts

export const STATUS_EVENT_MAP: Record<string, string> = {
  created: "zeptpay-flixora.payment_intent.created",
  processing: "zeptpay-flixora.payment_intent.processing",
  authorized: "zeptpay-flixora.payment_intent.requires_action",
  captured: "zeptpay-flixora.payment_intent.succeeded",
  failed: "zeptpay-flixora.payment_intent.payment_failed",
  cancelled: "zeptpay-flixora.payment_intent.canceled",
  refunded: "zeptpay-flixora.charge.refunded",
};

export const getEventTypeFromStatus = (status: string): string | null => {
  return STATUS_EVENT_MAP[status] || null;
};