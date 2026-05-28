// src/controllers/test/payments/createPaymentControllers.ts
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import ZeptPaySavedPaymentMethod from "../../../models/Test/payments/ZeptPaySavedPaymentMethod";

// 🔹 Save / Update Payment Method
export const savePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { zeptpayAccountId, paymentMethod, details, isDefault = false } = req.body;
    if (!zeptpayAccountId || !paymentMethod || !details)
      return res.status(400).json({ error: 'Missing fields' });

    const saved = await ZeptPaySavedPaymentMethod.findOneAndUpdate(
      { zeptpayAccountId, paymentMethod },
      {
        zeptpayAccountId,
        paymentMethod,
        gateway: {
          provider: 'zeptpay',
          customerId: `cust_${uuidv4()}`,
          paymentMethodToken: `pm_${uuidv4()}`,
        },
        details,
        isDefault,
      },
      { upsert: true, new: true }
    );

    console.log('✅ Saved payment method:', saved?.gateway?.paymentMethodToken);
    res.json({ message: 'Payment method saved', saved });
  } catch (err) {
    console.error('❌ Save payment method error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 🔹 List all saved methods
export const listSavedMethods = async (req: Request, res: Response) => {
  try {
    const { zeptpayAccountId } = req.params;
    const methods = await ZeptPaySavedPaymentMethod.find({ zeptpayAccountId, isActive: true });
    console.log('📃 List saved methods:', methods.length);
    res.json({ savedMethods: methods });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};