// src/models/ZeptPaySavedPaymentMethod.ts
import mongoose from 'mongoose';

const ZeptPaySavedPaymentMethodSchema = new mongoose.Schema(
  {
    zeptpayAccountId: { type: String, required: true },

    // 🔹 All 8 payment methods
    paymentMethod: {
      type: String,
      enum: [
        'card',
        'zeptpay',
        'upi',
        'netbanking',
        'banktransfer',
        'wallet',
        'autopay',
        'qrpayment',
      ],
      required: true,
    },

    // 🔹 Gateway token / reference
    gateway: {
      provider: { type: String, default: 'zeptpay' },
      customerId: String,
      paymentMethodToken: { type: String, required: true, index: true }, // token or reference
    },

    // 🔹 Safe display details for UI / audit
    details: {
      card: { brand: String, last4: String, expiryMonth: Number, expiryYear: Number, issuingBank: String },
    },
    status: {
      type: String,
      enum: [
        'created',
        'processing',
        'authorized',
        'captured',
        'failed',
        'cancelled',
        'refunded',
      ],
      default: 'created',
    },
    // 🔹 Flags
    isDefault: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
    isExpired: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model(
  'ZeptPaySavedPaymentMethod',
  ZeptPaySavedPaymentMethodSchema
);
