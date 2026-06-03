// src/models/ApiKey.ts
import mongoose from 'mongoose';

const ApiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    mode: {
      type: String,
      enum: ['test', 'live'],
      required: true,
    },

    publicKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    secretKey: {
      type: String,
      required: true,
      unique: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    label: {
      type: String,
    },

    // 🔐 Stripe-like Permissions
    permissions: {
      // 💳 Core Payments
      payments: {
        enabled: { type: Boolean, default: true },
        supportsCurrencyConversion: { type: Boolean, default: true },
        paymentIntents: { type: Boolean, default: true }, // Charges / Payment Intents
      },

      // 💳 Payment Methods
      paymentMethods: {
        card: { enabled: { type: Boolean, default: true } },
        zeptpay: { enabled: { type: Boolean, default: true } },
        upi: { enabled: { type: Boolean, default: true } },
        netBanking: { enabled: { type: Boolean, default: false } },
        wallet: { enabled: { type: Boolean, default: false } },
        autopay: { enabled: { type: Boolean, default: false } },
        banktransfer: { enabled: { type: Boolean, default: false } },
        qrpayment: { enabled: { type: Boolean, default: false } },
      },

      // 👥 Customers
      customers: {
        enabled: { type: Boolean, default: true },
      },

      // 🔁 Refunds
      refunds: {
        enabled: { type: Boolean, default: false },
      },

      // 🔔 Webhooks
      webhooks: {
        enabled: { type: Boolean, default: true },
      },

      // 🏦 Payouts
      payouts: {
        enabled: { type: Boolean, default: false },
      },

      // 🔄 Transfers (Marketplaces)
      transfers: {
        enabled: { type: Boolean, default: false },
      },

      // 🔥 Stripe Connect
      connect: {
        enabled: { type: Boolean, default: false },
      },

      // 📄 Subscriptions & Billing
      subscriptions: {
        enabled: { type: Boolean, default: true },
      },
    },

    lastUsedAt: Date,
    revokedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('ApiKey', ApiKeySchema);
