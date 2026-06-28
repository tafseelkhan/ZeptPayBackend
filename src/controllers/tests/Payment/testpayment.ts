import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

import MerchantOnboarding from "../../../models/tests/zeptcaptured/merchant/merchantOnboard";
import User from "../../../models/auth/User";
import ZeptPayTransaction from "../../../models/tests/payments/ZeptPayTransaction";
import ClientKey from "../../../models/tests/zeptcaptured/zeptCaptured";
import SecretKey from "../../../models/tests/ApiKeys";
import { handleWebhookByStatus } from "../Webhook/handleWebhookByStatus";

// ==================== Type Definitions ====================

interface PayerInfo {
  userId: string;
  name: string;
  email: string;
}

interface TransactionResponse {
  success: boolean;
  _id: string;
  zeptpayTransactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  paidAt: Date | null;
  payer: { name: string };
  receiver: { name: string };
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
}

interface MerchantOnboardingDocument {
  _id: mongoose.Types.ObjectId;
  merchantUserId: string;
  vendorCodeUID: string;
  developerUserId: string;
  merchantDID: string;
  walletId: string;
  [key: string]: any;
}

interface UserDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  [key: string]: any;
}

interface VerifiedDeveloper {
  userId: string;
}

interface ITransaction extends mongoose.Document {
  fromAccountId: string;
  toAccountId: string;
  payer: { userId: string; name: string; email: string };
  receiver: { userId: string; name: string; email: string };
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  zeptpayTransactionId: string;
  source: string;
  meta?: any;
  paymentSource?: any;
  gatewayResponse?: any;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Utility Functions ====================

const generateTransactionId = (): string => `zeptpay_${uuidv4()}`;
const generateTimestamp = (): string => new Date().toISOString();

const createErrorResponse = (
  error: string,
  code: string,
  statusCode: number = 400,
): ErrorResponse => ({
  success: false,
  error,
  code,
  timestamp: generateTimestamp(),
});

const validateRequiredFields = (
  body: any,
  requiredFields: string[],
): string[] => {
  return requiredFields.filter((field) => {
    const value = field.split(".").reduce((obj, key) => obj?.[key], body);
    return value === undefined || value === null || value === "";
  });
};

const verifyDeveloperKeys = async (
  clientKey: string,
  secretKey: string,
): Promise<VerifiedDeveloper> => {
  console.log("🔑 [AUTH] Verifying developer API keys...");
  console.log("🔑 [AUTH] clientKey:", clientKey ? `${clientKey}` : "MISSING");
  console.log("🔑 [AUTH] secretKey:", secretKey ? `${secretKey}` : "MISSING");

  if (!clientKey || !secretKey) {
    console.error("❌ [AUTH] Missing API keys in headers");
    throw new Error("MISSING_API_KEYS");
  }

  console.log("🔍 [AUTH] Looking up clientKey in database...");
  const clientKeyDoc = await ClientKey.findOne({
    clientKey,
    status: "verified",
  }).lean();

  if (!clientKeyDoc) {
    console.error("❌ [AUTH] clientKey not found or inactive in database");
    throw new Error("INVALID_CLIENT_KEY");
  }
  console.log(
    "✅ [AUTH] clientKey found — userId:",
    clientKeyDoc.userId?.toString(),
  );

  console.log("🔍 [AUTH] Looking up secretKey in database...");
  const secretKeyDoc = await SecretKey.findOne({
    secretKey,
    isActive: true,
  }).lean();

  if (!secretKeyDoc) {
    console.error("❌ [AUTH] secretKey not found or inactive in database");
    throw new Error("INVALID_SECRET_KEY");
  }
  console.log(
    "✅ [AUTH] secretKey found — userId:",
    secretKeyDoc.userId?.toString(),
  );

  if (clientKeyDoc.userId.toString() !== secretKeyDoc.userId.toString()) {
    console.error(
      "❌ [AUTH] KEY MISMATCH — clientKey userId:",
      clientKeyDoc.userId,
      "| secretKey userId:",
      secretKeyDoc.userId,
    );
    throw new Error("KEY_MISMATCH");
  }

  console.log(
    "✅ [AUTH] Both keys verified — developer userId:",
    clientKeyDoc.userId.toString(),
  );
  return { userId: clientKeyDoc.userId.toString() };
};

const authenticateRequest = async (
  req: Request,
): Promise<VerifiedDeveloper> => {
  const clientKey = req.headers["x-client-key"] as string;
  const secretKey = req.headers["x-secret-key"] as string;
  console.log(
    "📥 [AUTH] Headers received — x-client-key:",
    clientKey ? "present" : "MISSING",
    "| x-secret-key:",
    secretKey ? "present" : "MISSING",
  );
  return await verifyDeveloperKeys(clientKey, secretKey);
};

// ✅ UPDATED: vendorCodeUID se merchant dhundo, merchantUserId se nahi
const verifyMerchant = async (vendorCodeUID: string) => {
  console.log(
    "🏪 [MERCHANT] Verifying merchant — vendorCodeUID:",
    vendorCodeUID,
  );

  // ✅ vendorCodeUID se find karo
  const merchantOnboarding = (await MerchantOnboarding.findOne({
    vendorCodeUID,
  }).lean()) as MerchantOnboardingDocument | null;

  if (!merchantOnboarding) {
    console.error(
      "❌ [MERCHANT] Merchant onboarding not found for vendorCodeUID:",
      vendorCodeUID,
    );
    throw new Error("MERCHANT_ONBOARDING_NOT_FOUND");
  }
  console.log("✅ [MERCHANT] Onboarding found:");
  console.log("   vendorCodeUID:", merchantOnboarding.vendorCodeUID);
  console.log("   merchantUserId:", merchantOnboarding.merchantUserId);
  console.log("   merchantDID:", merchantOnboarding.merchantDID);
  console.log("   walletId:", merchantOnboarding.walletId);
  console.log("   businessName:", merchantOnboarding.businessName);

  // ✅ Ab merchantUserId se User dhundo (jo onboarding mein hai)
  const merchantUser = (await User.findById(
    merchantOnboarding.merchantUserId,
  ).lean()) as UserDocument | null;

  if (!merchantUser) {
    console.error(
      "❌ [MERCHANT] Merchant user not found in User model — merchantUserId:",
      merchantOnboarding.merchantUserId,
    );
    throw new Error("MERCHANT_USER_NOT_FOUND");
  }
  console.log(
    "✅ [MERCHANT] Merchant user found — name:",
    merchantUser.name,
    "| email:",
    merchantUser.email,
  );

  return {
    onboarding: merchantOnboarding,
    user: merchantUser,
    // ✅ Actual merchantUserId expose karo taaki transaction mein use ho sake
    merchantUserId: merchantOnboarding.merchantUserId,
  };
};

// ==================== createTestPayment ====================

export const createTestPayment = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  console.log("\n========================================");
  console.log("💳 [CREATE_PAYMENT] New payment request received");
  console.log("📥 [CREATE_PAYMENT] Body:", JSON.stringify(req.body, null, 2));
  console.log("========================================");

  try {
    // STEP 1: Auth
    console.log("\n🔐 [CREATE_PAYMENT] STEP 1 — Authenticating request...");
    let developer;
    try {
      developer = await authenticateRequest(req);
      console.log(
        "✅ [CREATE_PAYMENT] Auth passed — developer:",
        developer.userId,
      );
    } catch (error: any) {
      const errorMessage = error.message;
      console.error("❌ [CREATE_PAYMENT] Auth failed —", errorMessage);
      if (errorMessage === "MISSING_API_KEYS") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "Missing API keys. Provide x-client-key and x-secret-key headers",
              "MISSING_API_KEYS",
              401,
            ),
          );
      }
      if (
        errorMessage === "INVALID_CLIENT_KEY" ||
        errorMessage === "INVALID_SECRET_KEY"
      ) {
        return res
          .status(401)
          .json(
            createErrorResponse("Invalid API keys", "INVALID_API_KEYS", 401),
          );
      }
      if (errorMessage === "KEY_MISMATCH") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "API keys belong to different developers",
              "KEY_MISMATCH",
              401,
            ),
          );
      }
      throw error;
    }

    // ✅ merchantUserId ki jagah vendorCodeUID aayega body mein
    const {
      vendorCodeUID,
      payer,
      appName,
      amount,
      currency = "INR",
    } = req.body;

    // STEP 2: Validate
    console.log("\n📋 [CREATE_PAYMENT] STEP 2 — Validating required fields...");
    console.log("📋 [CREATE_PAYMENT] vendorCodeUID:", vendorCodeUID);
    console.log("📋 [CREATE_PAYMENT] appName:", appName);
    console.log("📋 [CREATE_PAYMENT] amount:", amount, "| currency:", currency);
    console.log("📋 [CREATE_PAYMENT] payer:", JSON.stringify(payer));

    // ✅ vendorCodeUID required field mein
    const missingFields = validateRequiredFields(req.body, [
      "vendorCodeUID",
      "payer.userId",
      "payer.name",
      "payer.email",
      "appName",
      "amount",
    ]);

    if (missingFields.length > 0) {
      console.warn("⚠️ [CREATE_PAYMENT] Missing fields:", missingFields);
      return res
        .status(400)
        .json(
          createErrorResponse(
            `Missing required fields: ${missingFields.join(", ")}`,
            "MISSING_FIELDS",
          ),
        );
    }
    console.log("✅ [CREATE_PAYMENT] All required fields present");

    if (typeof amount !== "number" || amount <= 0) {
      console.error("❌ [CREATE_PAYMENT] Invalid amount:", amount);
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Amount must be a positive number",
            "INVALID_AMOUNT",
          ),
        );
    }
    console.log("✅ [CREATE_PAYMENT] Amount valid:", amount);

    // STEP 3: Verify merchant via vendorCodeUID
    console.log(
      "\n🏪 [CREATE_PAYMENT] STEP 3 — Verifying merchant via vendorCodeUID...",
    );
    let merchant;
    try {
      merchant = await verifyMerchant(vendorCodeUID);
      console.log(
        "✅ [CREATE_PAYMENT] Merchant verified —",
        merchant.user.name,
        "| merchantUserId:",
        merchant.merchantUserId,
      );
    } catch (error: any) {
      console.error(
        "❌ [CREATE_PAYMENT] Merchant verification failed —",
        error.message,
      );
      if (error.message === "MERCHANT_ONBOARDING_NOT_FOUND") {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Merchant not found for given vendorCodeUID",
              "MERCHANT_NOT_FOUND",
              404,
            ),
          );
      }
      if (error.message === "MERCHANT_USER_NOT_FOUND") {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Merchant user not found",
              "USER_NOT_FOUND",
              404,
            ),
          );
      }
      throw error;
    }

    // STEP 4: Create transaction
    console.log("\n💾 [CREATE_PAYMENT] STEP 4 — Creating transaction...");
    const transactionId = generateTransactionId();
    const now = new Date();
    console.log("🆔 [CREATE_PAYMENT] Generated transactionId:", transactionId);

    const transaction = new ZeptPayTransaction({
      userId: developer.userId,
      fromAccountId: payer.userId,
      toAccountId: merchant.merchantUserId, // ✅ actual merchantUserId use karo
      payer: { userId: payer.userId, name: payer.name, email: payer.email },
      receiver: {
        userId: merchant.merchantUserId,
        name: merchant.user.name,
        email: merchant.user.email,
      },
      amount,
      currency,
      status: "captured",
      paymentMethod: "zeptpay",
      zeptpayTransactionId: transactionId,
      source: "ecommerce",
      meta: {
        testMode: true,
        appName,
        vendorCodeUID, // ✅ vendorCodeUID bhi save karo meta mein
        merchantDID: merchant.onboarding.merchantDID,
        walletId: merchant.onboarding.walletId,
      },
      paymentSource: {
        gateway: "zeptpay",
        customerId: `cust_${payer.userId}`,
        paymentMethodToken: `pm_${uuidv4()}`,
      },
      gatewayResponse: {
        gatewayTransactionId: `gtwy_${uuidv4()}`,
        bankReferenceId: `brf_${uuidv4()}`,
        status: "captured",
        timestamp: generateTimestamp(),
        type: "instant",
        raw: { testMode: true, simulation: true },
      },
      paidAt: now,
    });

    console.log("💾 [CREATE_PAYMENT] Saving transaction to DB...");
    const savedTransaction = (await transaction.save()) as ITransaction;
    // 🔥 YEH LINE ADD KAR - Webhook trigger
    await handleWebhookByStatus(savedTransaction);
    console.log(
      "✅ [CREATE_PAYMENT] Transaction saved — _id:",
      savedTransaction._id.toString(),
    );

    console.log("\n🎉 [CREATE_PAYMENT] Payment created successfully:", {
      transactionId,
      vendorCodeUID,
      merchantUserId: merchant.merchantUserId,
      merchantName: merchant.user.name,
      payerId: payer.userId,
      payerName: payer.name,
      amount: `${currency} ${amount}`,
      appName,
      developerId: developer.userId,
      paidAt: now,
    });

    const response = {
      success: true,
      _id: (savedTransaction._id as mongoose.Types.ObjectId).toString(),
      zeptpayTransactionId: savedTransaction.zeptpayTransactionId,
      amount: savedTransaction.amount,
      currency: savedTransaction.currency,
      paymentMethod: savedTransaction.paymentMethod,
      status: savedTransaction.status,
      paidAt: savedTransaction.paidAt || null,
      payer: { name: savedTransaction.payer?.name || "" },
      receiver: { name: savedTransaction.receiver?.name || "" },
      source: savedTransaction.source,
      createdAt: savedTransaction.createdAt,
      updatedAt: savedTransaction.updatedAt,
    };

    console.log(
      "📤 [CREATE_PAYMENT] Sending response:",
      JSON.stringify(response, null, 2),
    );
    return res.status(201).json(response);
  } catch (error) {
    console.error("💥 [CREATE_PAYMENT] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error processing payment",
      code: error instanceof mongoose.Error ? "DATABASE_ERROR" : "SERVER_ERROR",
      timestamp: generateTimestamp(),
    });
  }
};

// ==================== createAutoPayTransaction ====================

export const createAutoPayTransaction = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  console.log("\n========================================");
  console.log("🔄 [AUTOPAY] New auto-pay request received");
  console.log("📥 [AUTOPAY] Body:", JSON.stringify(req.body, null, 2));
  console.log("========================================");

  try {
    // STEP 1: Auth
    console.log("\n🔐 [AUTOPAY] STEP 1 — Authenticating request...");
    let developer;
    try {
      developer = await authenticateRequest(req);
      console.log("✅ [AUTOPAY] Auth passed — developer:", developer.userId);
    } catch (error: any) {
      const errorMessage = error.message;
      console.error("❌ [AUTOPAY] Auth failed —", errorMessage);
      if (errorMessage === "MISSING_API_KEYS") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "Missing API keys. Provide x-client-key and x-secret-key headers",
              "MISSING_API_KEYS",
              401,
            ),
          );
      }
      if (
        errorMessage === "INVALID_CLIENT_KEY" ||
        errorMessage === "INVALID_SECRET_KEY"
      ) {
        return res
          .status(401)
          .json(
            createErrorResponse("Invalid API keys", "INVALID_API_KEYS", 401),
          );
      }
      if (errorMessage === "KEY_MISMATCH") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "API keys belong to different developers",
              "KEY_MISMATCH",
              401,
            ),
          );
      }
      throw error;
    }

    const {
      vendorCodeUID,
      payer,
      appName,
      amount,
      currency = "INR",
      frequency = "monthly",
      startDate = new Date(),
      endDate,
    } = req.body;

    // STEP 2: Validate
    console.log("\n📋 [AUTOPAY] STEP 2 — Validating required fields...");
    console.log("📋 [AUTOPAY] vendorCodeUID:", vendorCodeUID);
    console.log("📋 [AUTOPAY] amount:", amount, "| currency:", currency);
    console.log("📋 [AUTOPAY] frequency:", frequency);
    console.log(
      "📋 [AUTOPAY] startDate:",
      startDate,
      "| endDate:",
      endDate || "not set",
    );
    console.log("📋 [AUTOPAY] payer:", JSON.stringify(payer));

    const missingFields = validateRequiredFields(req.body, [
      "vendorCodeUID",
      "payer.userId",
      "payer.name",
      "payer.email",
      "appName",
      "amount",
    ]);

    if (missingFields.length > 0) {
      console.warn("⚠️ [AUTOPAY] Missing fields:", missingFields);
      return res
        .status(400)
        .json(
          createErrorResponse(
            `Missing required fields: ${missingFields.join(", ")}`,
            "MISSING_FIELDS",
          ),
        );
    }
    console.log("✅ [AUTOPAY] All required fields present");

    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      console.error("❌ [AUTOPAY] Invalid frequency:", frequency);
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Frequency must be daily, weekly, or monthly",
            "INVALID_FREQUENCY",
          ),
        );
    }
    console.log("✅ [AUTOPAY] Frequency valid:", frequency);

    if (typeof amount !== "number" || amount <= 0) {
      console.error("❌ [AUTOPAY] Invalid amount:", amount);
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Amount must be a positive number",
            "INVALID_AMOUNT",
          ),
        );
    }
    console.log("✅ [AUTOPAY] Amount valid:", amount);

    // STEP 3: Verify merchant
    console.log(
      "\n🏪 [AUTOPAY] STEP 3 — Verifying merchant via vendorCodeUID...",
    );
    let merchant;
    try {
      merchant = await verifyMerchant(vendorCodeUID);
      console.log(
        "✅ [AUTOPAY] Merchant verified —",
        merchant.user.name,
        "| merchantUserId:",
        merchant.merchantUserId,
      );
    } catch (error: any) {
      console.error(
        "❌ [AUTOPAY] Merchant verification failed —",
        error.message,
      );
      if (error.message === "MERCHANT_ONBOARDING_NOT_FOUND") {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Merchant not found for given vendorCodeUID",
              "MERCHANT_NOT_FOUND",
              404,
            ),
          );
      }
      if (error.message === "MERCHANT_USER_NOT_FOUND") {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Merchant user not found",
              "USER_NOT_FOUND",
              404,
            ),
          );
      }
      throw error;
    }

    // STEP 4: Create transaction
    console.log("\n💾 [AUTOPAY] STEP 4 — Creating auto-pay transaction...");
    const mandateId = `mandate_${uuidv4()}`;
    const transactionId = generateTransactionId();
    console.log("🆔 [AUTOPAY] Generated transactionId:", transactionId);
    console.log("🆔 [AUTOPAY] Generated mandateId:", mandateId);

    const transaction = new ZeptPayTransaction({
      userId: developer.userId,
      fromAccountId: payer.userId,
      toAccountId: merchant.merchantUserId,
      payer: { userId: payer.userId, name: payer.name, email: payer.email },
      receiver: {
        userId: merchant.merchantUserId,
        name: merchant.user.name,
        email: merchant.user.email,
      },
      amount,
      currency,
      paymentMethod: "autopay",
      status: "authorized",
      source: "subscription",
      zeptpayTransactionId: transactionId,
      paymentSource: {
        gateway: "zeptpay",
        customerId: `cust_${payer.userId}`,
        paymentMethodToken: `autopay_pm_${uuidv4()}`,
      },
      gatewayResponse: {
        gatewayTransactionId: `autopay_gtwy_${uuidv4()}`,
        status: "authorized",
        timestamp: generateTimestamp(),
        type: "mandate",
        mandateId,
        frequency,
        startDate:
          startDate instanceof Date ? startDate.toISOString() : startDate,
        endDate: endDate
          ? endDate instanceof Date
            ? endDate.toISOString()
            : endDate
          : undefined,
        raw: { testMode: true, mandateId, frequency },
      },
      meta: {
        testMode: true,
        appName,
        vendorCodeUID,
        mandateId,
        frequency,
        startDate,
        endDate,
        nextPaymentDate: startDate,
        paymentsProcessed: 0,
        merchantDID: merchant.onboarding.merchantDID,
        walletId: merchant.onboarding.walletId,
      },
    });

    console.log("💾 [AUTOPAY] Saving transaction to DB...");
    const savedTransaction = (await transaction.save()) as ITransaction;
    // 🔥 YEH LINE ADD KAR - Webhook trigger
    await handleWebhookByStatus(savedTransaction);
    console.log(
      "✅ [AUTOPAY] Transaction saved — _id:",
      savedTransaction._id.toString(),
    );

    console.log("\n🎉 [AUTOPAY] Auto-pay created successfully:", {
      transactionId,
      mandateId,
      vendorCodeUID,
      merchantUserId: merchant.merchantUserId,
      merchantName: merchant.user.name,
      payerId: payer.userId,
      frequency,
      amount: `${currency} ${amount}`,
      nextPaymentDate: startDate,
      developerId: developer.userId,
    });

    const response = {
      success: true,
      _id: (savedTransaction._id as mongoose.Types.ObjectId).toString(),
      zeptpayTransactionId: savedTransaction.zeptpayTransactionId,
      amount: savedTransaction.amount,
      currency: savedTransaction.currency,
      paymentMethod: savedTransaction.paymentMethod,
      status: savedTransaction.status,
      paidAt: savedTransaction.paidAt || null,
      payer: { name: savedTransaction.payer?.name || "" },
      receiver: { name: savedTransaction.receiver?.name || "" },
      source: savedTransaction.source,
      createdAt: savedTransaction.createdAt,
      updatedAt: savedTransaction.updatedAt,
      mandateId,
      frequency,
      nextPaymentDate: startDate,
    };

    console.log(
      "📤 [AUTOPAY] Sending response:",
      JSON.stringify(response, null, 2),
    );
    return res.status(201).json(response);
  } catch (error) {
    console.error("💥 [AUTOPAY] Unexpected error:", error);
    return res
      .status(500)
      .json(createErrorResponse("Internal server error", "SERVER_ERROR", 500));
  }
};

// ==================== simulateQrScan ====================

export const simulateQrScan = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  console.log("\n========================================");
  console.log("📷 [QR_SCAN] New QR scan simulation request");
  console.log("📥 [QR_SCAN] Body:", JSON.stringify(req.body, null, 2));
  console.log("========================================");

  try {
    // STEP 1: Auth
    console.log("\n🔐 [QR_SCAN] STEP 1 — Authenticating request...");
    let developer;
    try {
      developer = await authenticateRequest(req);
      console.log("✅ [QR_SCAN] Auth passed — developer:", developer.userId);
    } catch (error: any) {
      const errorMessage = error.message;
      console.error("❌ [QR_SCAN] Auth failed —", errorMessage);
      if (errorMessage === "MISSING_API_KEYS") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "Missing API keys. Provide x-client-key and x-secret-key headers",
              "MISSING_API_KEYS",
              401,
            ),
          );
      }
      if (
        errorMessage === "INVALID_CLIENT_KEY" ||
        errorMessage === "INVALID_SECRET_KEY"
      ) {
        return res
          .status(401)
          .json(
            createErrorResponse("Invalid API keys", "INVALID_API_KEYS", 401),
          );
      }
      if (errorMessage === "KEY_MISMATCH") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "API keys belong to different developers",
              "KEY_MISMATCH",
              401,
            ),
          );
      }
      throw error;
    }

    const { qrCodeId, result } = req.body;

    // STEP 2: Validate
    console.log("\n📋 [QR_SCAN] STEP 2 — Validating input...");
    console.log("📋 [QR_SCAN] qrCodeId:", qrCodeId);
    console.log("📋 [QR_SCAN] result:", result);

    if (!qrCodeId || !result) {
      console.error("❌ [QR_SCAN] Missing qrCodeId or result");
      return res
        .status(400)
        .json(
          createErrorResponse(
            "qrCodeId and result are required",
            "MISSING_FIELDS",
          ),
        );
    }

    if (!["success", "failed", "pending"].includes(result)) {
      console.error("❌ [QR_SCAN] Invalid result value:", result);
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Result must be success, failed, or pending",
            "INVALID_RESULT",
          ),
        );
    }
    console.log("✅ [QR_SCAN] Input valid");

    // STEP 3: Find transaction
    console.log("\n🔍 [QR_SCAN] STEP 3 — Looking up QR transaction...");
    const transaction = await ZeptPayTransaction.findOne({
      "meta.qrCodeId": qrCodeId,
      paymentMethod: "qrpayment",
    });

    if (!transaction) {
      console.error(
        "❌ [QR_SCAN] QR transaction not found — qrCodeId:",
        qrCodeId,
      );
      return res
        .status(404)
        .json(
          createErrorResponse(
            "QR transaction not found",
            "TRANSACTION_NOT_FOUND",
            404,
          ),
        );
    }
    console.log(
      "✅ [QR_SCAN] Transaction found — _id:",
      transaction._id,
      "| current status:",
      transaction.status,
    );

    if (!transaction.meta?.testMode) {
      console.error("❌ [QR_SCAN] Transaction is NOT in test mode");
      return res
        .status(403)
        .json(
          createErrorResponse(
            "QR scan simulation only allowed in test mode",
            "TEST_MODE_REQUIRED",
            403,
          ),
        );
    }
    console.log("✅ [QR_SCAN] Test mode confirmed");

    // STEP 4: Update status
    const finalStatus =
      result === "success"
        ? "captured"
        : result === "failed"
          ? "failed"
          : "processing";
    console.log(
      "\n🔄 [QR_SCAN] STEP 4 — Updating status:",
      transaction.status,
      "→",
      finalStatus,
    );

    transaction.status = finalStatus;
    if (finalStatus === "captured") {
      transaction.paidAt = new Date();
      console.log(
        "💰 [QR_SCAN] Payment captured — paidAt:",
        transaction.paidAt,
      );
    }

    transaction.gatewayResponse = {
      ...transaction.gatewayResponse,
      status: finalStatus,
      gatewayTransactionId:
        transaction.gatewayResponse?.gatewayTransactionId || `gtwy_${uuidv4()}`,
      bankReferenceId: `brf_${uuidv4()}`,
      raw: {
        ...(transaction.gatewayResponse?.raw || {}),
        simulated: true,
        scanTime: generateTimestamp(),
        result,
      },
    };

    console.log("💾 [QR_SCAN] Saving updated transaction...");
    await transaction.save();
    // 🔥 YEH LINE ADD KAR - Webhook trigger
    await handleWebhookByStatus(transaction);
    console.log(
      "✅ [QR_SCAN] Transaction updated — qrCodeId:",
      qrCodeId,
      "| finalStatus:",
      finalStatus,
      "| by developer:",
      developer.userId,
    );

    const response = {
      success: true,
      _id: transaction._id,
      zeptpayTransactionId: transaction.zeptpayTransactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: finalStatus,
      paidAt: transaction.paidAt,
      payer: { name: transaction.payer?.name },
      receiver: { name: transaction.receiver?.name },
      source: transaction.source,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      message: `QR payment ${finalStatus}`,
      qrCodeId,
    };

    console.log(
      "📤 [QR_SCAN] Sending response:",
      JSON.stringify(response, null, 2),
    );
    return res.json(response);
  } catch (error) {
    console.error("💥 [QR_SCAN] Unexpected error:", error);
    return res
      .status(500)
      .json(
        createErrorResponse("QR scan simulation failed", "SERVER_ERROR", 500),
      );
  }
};

// ==================== generateTestQR ====================

export const generateTestQR = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  console.log("\n========================================");
  console.log("🔲 [GEN_QR] New QR generation request");
  console.log("📥 [GEN_QR] Body:", JSON.stringify(req.body, null, 2));
  console.log("========================================");

  try {
    // STEP 1: Auth
    console.log("\n🔐 [GEN_QR] STEP 1 — Authenticating request...");
    let developer;
    try {
      developer = await authenticateRequest(req);
      console.log("✅ [GEN_QR] Auth passed — developer:", developer.userId);
    } catch (error: any) {
      const errorMessage = error.message;
      console.error("❌ [GEN_QR] Auth failed —", errorMessage);
      if (errorMessage === "MISSING_API_KEYS") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "Missing API keys. Provide x-client-key and x-secret-key headers",
              "MISSING_API_KEYS",
              401,
            ),
          );
      }
      if (
        errorMessage === "INVALID_CLIENT_KEY" ||
        errorMessage === "INVALID_SECRET_KEY"
      ) {
        return res
          .status(401)
          .json(
            createErrorResponse("Invalid API keys", "INVALID_API_KEYS", 401),
          );
      }
      if (errorMessage === "KEY_MISMATCH") {
        return res
          .status(401)
          .json(
            createErrorResponse(
              "API keys belong to different developers",
              "KEY_MISMATCH",
              401,
            ),
          );
      }
      throw error;
    }

    const {
      vendorCodeUID,
      payer,
      appName,
      amount,
      currency = "INR",
    } = req.body;

    // STEP 2: Validate
    console.log("\n📋 [GEN_QR] STEP 2 — Validating required fields...");
    console.log("📋 [GEN_QR] vendorCodeUID:", vendorCodeUID);
    console.log("📋 [GEN_QR] amount:", amount, "| currency:", currency);
    console.log("📋 [GEN_QR] payer:", JSON.stringify(payer));

    const missingFields = validateRequiredFields(req.body, [
      "vendorCodeUID",
      "payer.userId",
      "payer.name",
      "payer.email",
      "appName",
      "amount",
    ]);

    if (missingFields.length > 0) {
      console.warn("⚠️ [GEN_QR] Missing fields:", missingFields);
      return res
        .status(400)
        .json(
          createErrorResponse(
            `Missing required fields: ${missingFields.join(", ")}`,
            "MISSING_FIELDS",
          ),
        );
    }
    console.log("✅ [GEN_QR] All required fields present");

    if (typeof amount !== "number" || amount <= 0) {
      console.error("❌ [GEN_QR] Invalid amount:", amount);
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Amount must be a positive number",
            "INVALID_AMOUNT",
          ),
        );
    }
    console.log("✅ [GEN_QR] Amount valid:", amount);

    // STEP 3: Verify merchant
    console.log(
      "\n🏪 [GEN_QR] STEP 3 — Verifying merchant via vendorCodeUID...",
    );
    let merchant;
    try {
      merchant = await verifyMerchant(vendorCodeUID);
      console.log(
        "✅ [GEN_QR] Merchant verified —",
        merchant.user.name,
        "| merchantUserId:",
        merchant.merchantUserId,
      );
    } catch (error: any) {
      console.error(
        "❌ [GEN_QR] Merchant verification failed —",
        error.message,
      );
      if (error.message === "MERCHANT_ONBOARDING_NOT_FOUND") {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Merchant not found for given vendorCodeUID",
              "MERCHANT_NOT_FOUND",
              404,
            ),
          );
      }
      if (error.message === "MERCHANT_USER_NOT_FOUND") {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Merchant user not found",
              "USER_NOT_FOUND",
              404,
            ),
          );
      }
      throw error;
    }

    // STEP 4: Generate QR
    console.log("\n🔲 [GEN_QR] STEP 4 — Generating QR code data...");
    const qrCodeId = `qr_${uuidv4()}`;
    const transactionId = generateTransactionId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    console.log("🆔 [GEN_QR] Generated qrCodeId:", qrCodeId);
    console.log("🆔 [GEN_QR] Generated transactionId:", transactionId);
    console.log("⏰ [GEN_QR] QR expires at:", expiresAt.toISOString());

    const qrPayload = {
      gateway: "ZeptPay",
      mode: "TEST",
      qrCodeId,
      merchantName: merchant.user.name,
      merchantId: merchant.merchantUserId,
      vendorCodeUID,
      amount,
      currency,
      intent: "PAY",
      expiresAt: expiresAt.toISOString(),
      appName,
    };
    console.log("📦 [GEN_QR] QR Payload:", JSON.stringify(qrPayload, null, 2));

    const transaction = new ZeptPayTransaction({
      userId: developer.userId,
      fromAccountId: payer.userId,
      toAccountId: merchant.merchantUserId,
      payer: { userId: payer.userId, name: payer.name, email: payer.email },
      receiver: {
        userId: merchant.merchantUserId,
        name: merchant.user.name,
        email: merchant.user.email,
      },
      amount,
      currency,
      paymentMethod: "qrpayment",
      status: "processing",
      source: "ecommerce",
      zeptpayTransactionId: transactionId,
      gatewayResponse: {
        status: "processing",
        timestamp: generateTimestamp(),
        type: "qr",
        qrCodeId,
        qrData: JSON.stringify(qrPayload),
        expiresAt: expiresAt.toISOString(),
        raw: { qrPayload, testMode: true },
      },
      meta: {
        testMode: true,
        appName,
        vendorCodeUID,
        qrCodeId,
        qrPayload,
        expiresAt: expiresAt.toISOString(),
        merchantDID: merchant.onboarding.merchantDID,
        walletId: merchant.onboarding.walletId,
      },
    });

    console.log("💾 [GEN_QR] Saving transaction to DB...");
    const savedTransaction = (await transaction.save()) as ITransaction;
    console.log(
      "✅ [GEN_QR] Transaction saved — _id:",
      savedTransaction._id.toString(),
    );

    console.log("\n🎉 [GEN_QR] QR generated successfully:", {
      qrCodeId,
      transactionId,
      vendorCodeUID,
      merchantUserId: merchant.merchantUserId,
      merchantName: merchant.user.name,
      payerId: payer.userId,
      amount: `${currency} ${amount}`,
      expiresAt,
      developerId: developer.userId,
    });

    const response = {
      success: true,
      _id: (savedTransaction._id as mongoose.Types.ObjectId).toString(),
      zeptpayTransactionId: savedTransaction.zeptpayTransactionId,
      amount: savedTransaction.amount,
      currency: savedTransaction.currency,
      paymentMethod: savedTransaction.paymentMethod,
      status: savedTransaction.status,
      paidAt: savedTransaction.paidAt || null,
      payer: { name: savedTransaction.payer?.name || "" },
      receiver: { name: savedTransaction.receiver?.name || "" },
      source: savedTransaction.source,
      createdAt: savedTransaction.createdAt,
      updatedAt: savedTransaction.updatedAt,
      qrCodeId,
      qrData: JSON.stringify(qrPayload),
      qrPayload,
      expiresAt: expiresAt.toISOString(),
    };

    console.log(
      "📤 [GEN_QR] Sending response:",
      JSON.stringify(response, null, 2),
    );
    return res.status(201).json(response);
  } catch (error) {
    console.error("💥 [GEN_QR] Unexpected error:", error);
    return res
      .status(500)
      .json(createErrorResponse("QR generation failed", "SERVER_ERROR", 500));
  }
};
