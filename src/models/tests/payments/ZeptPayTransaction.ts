// src/models/ZeptPayTransaction.ts
import mongoose from "mongoose";

const ZeptPayTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromAccountId: { type: String, required: true },
    toAccountId: { type: String, required: true },

    payer: { userId: String, name: String, email: String },
    receiver: { userId: String, name: String, email: String },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    // ✅ Full payment method list
    paymentMethod: {
      type: String,
      enum: [
        "card",
        "zeptpay",
        "upi",
        "netbanking",
        "banktransfer",
        "wallet",
        "autopay",
        "qrpayment",
      ],
      required: true,
    },

    // 🔹 Token / Source info (safe)
    paymentSource: {
      gateway: { type: String, default: "zeptpay" },
      customerId: String,
      paymentMethodToken: String, // pm_xxx / upi_xxx / wallet_xxx
    },

    // 🔹 Gateway callback
    gatewayResponse: {
      gatewayTransactionId: String,
      bankReferenceId: String,
      status: String,
      raw: mongoose.Schema.Types.Mixed, // full callback for audit/fraud
    },

    status: {
      type: String,
      enum: [
        "created",
        "processing",
        "authorized",
        "captured",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "created",
    },

    idempotencyKey: { type: String, index: true },

    source: {
      type: String,
      enum: ["ecommerce", "subscription", "refund", "payout", "topup"],
      default: "ecommerce",
    },

    refund: { refundId: String, reason: String, refundedAt: Date },

    reconciled: { type: Boolean, default: false },
    settledAt: Date,
    settlementBatchId: String,

    zeptpayTransactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    meta: mongoose.Schema.Types.Mixed,
    paidAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model("ZeptPayTransaction", ZeptPayTransactionSchema);
