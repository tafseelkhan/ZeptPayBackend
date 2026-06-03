// src/controllers/test/payments/getPaymentControllers.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Models
import User from "../../../models/auth/User";
import ZeptPayTransaction from "../../../models/tests/payments/ZeptPayTransaction";

// ==================== Type Definitions ====================

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
}

type FinalStatus = "failed" | "cancelled" | "captured";

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

const decideFinalStatus = (): FinalStatus => {
  const random = Math.random() * 100;
  if (random < 20) return "failed";
  if (random < 30) return "cancelled";
  return "captured";
};

// ==================== Payment Get/Confirm Controllers ====================

/**
 * Get transaction status by transaction ID
 */
export const getTransactionStatus = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res
        .status(400)
        .json(
          createErrorResponse("Transaction ID is required", "MISSING_FIELDS"),
        );
    }

    const transaction = await ZeptPayTransaction.findOne({
      zeptpayTransactionId: transactionId,
    }).lean();

    if (!transaction) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Transaction not found",
            "TRANSACTION_NOT_FOUND",
            404,
          ),
        );
    }

    // Return in the same format as create endpoints
    const response = {
      success: true,
      _id: transaction._id,
      zeptpayTransactionId: transaction.zeptpayTransactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      paidAt: transaction.paidAt,
      payer: {
        name: transaction.payer?.name,
      },
      receiver: {
        name: transaction.receiver?.name,
      },
      source: transaction.source,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Get transaction status error:", error);
    return res
      .status(500)
      .json(createErrorResponse("Internal server error", "SERVER_ERROR", 500));
  }
};

/**
 * Get all transactions for a user (as payer or merchant)
 */
export const getUserTransactions = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { userId } = req.params;
    const { role = "all", limit = 50, skip = 0 } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json(createErrorResponse("User ID is required", "MISSING_FIELDS"));
    }

    let query = {};

    if (role === "payer") {
      query = { fromAccountId: userId };
    } else if (role === "merchant") {
      query = { toAccountId: userId };
    } else {
      query = {
        $or: [{ fromAccountId: userId }, { toAccountId: userId }],
      };
    }

    const transactions = await ZeptPayTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    const formattedTransactions = transactions.map((t) => ({
      _id: t._id,
      zeptpayTransactionId: t.zeptpayTransactionId,
      amount: t.amount,
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      status: t.status,
      paidAt: t.paidAt,
      payer: {
        name: t.payer?.name,
      },
      receiver: {
        name: t.receiver?.name,
      },
      source: t.source,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      transactions: formattedTransactions,
    });
  } catch (error) {
    console.error("❌ Get user transactions error:", error);
    return res
      .status(500)
      .json(createErrorResponse("Internal server error", "SERVER_ERROR", 500));
  }
};

/**
 * Confirm a pending transaction (test mode only)
 */
export const confirmPayment = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { txnId } = req.body;

    if (!txnId) {
      return res
        .status(400)
        .json(createErrorResponse("txnId is required", "MISSING_FIELDS"));
    }

    const transaction = await ZeptPayTransaction.findOne({
      zeptpayTransactionId: txnId,
    });

    if (!transaction) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Transaction not found",
            "TRANSACTION_NOT_FOUND",
            404,
          ),
        );
    }

    // Only test mode allowed
    if (!transaction.meta?.testMode) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            "Confirm API allowed only in test mode",
            "TEST_MODE_REQUIRED",
            403,
          ),
        );
    }

    // Case 1: Already in final state
    const finalStates = ["captured", "failed", "cancelled"];
    if (finalStates.includes(transaction.status)) {
      return res.status(200).json({
        success: true,
        _id: transaction._id,
        zeptpayTransactionId: transaction.zeptpayTransactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        paidAt: transaction.paidAt,
        payer: {
          name: transaction.payer?.name,
        },
        receiver: {
          name: transaction.receiver?.name,
        },
        source: transaction.source,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        message: "Final status already decided",
        isFinal: true,
      });
    }

    // Case 2: Still processing - decide randomly
    const finalStatus = decideFinalStatus();

    transaction.status = finalStatus;

    if (finalStatus === "captured") {
      transaction.paidAt = new Date();
    }

    await transaction.save();

    const statusMessages = {
      captured: "Payment successful",
      failed: "Payment failed",
      cancelled: "Payment cancelled by user",
    };

    return res.status(200).json({
      success: true,
      _id: transaction._id,
      zeptpayTransactionId: transaction.zeptpayTransactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: finalStatus,
      paidAt: transaction.paidAt,
      payer: {
        name: transaction.payer?.name,
      },
      receiver: {
        name: transaction.receiver?.name,
      },
      source: transaction.source,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      message: statusMessages[finalStatus],
      isFinal: true,
    });
  } catch (error) {
    console.error("❌ Confirm payment error:", error);
    return res
      .status(500)
      .json(createErrorResponse("Internal server error", "SERVER_ERROR", 500));
  }
};

/**
 * Capture an auto-pay payment (simulate recurring charge)
 */
export const captureAutoPayPayment = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res
        .status(400)
        .json(
          createErrorResponse("transactionId is required", "MISSING_FIELDS"),
        );
    }

    const transaction = await ZeptPayTransaction.findOne({
      zeptpayTransactionId: transactionId,
      paymentMethod: "autopay",
    });

    if (!transaction) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Auto-pay transaction not found",
            "TRANSACTION_NOT_FOUND",
            404,
          ),
        );
    }

    if (!transaction.meta?.testMode) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            "Capture only allowed in test mode",
            "TEST_MODE_REQUIRED",
            403,
          ),
        );
    }

    // Simulate capture (80% success rate in test mode)
    const random = Math.random() * 100;
    const finalStatus =
      random < 20 ? "failed" : random < 30 ? "cancelled" : "captured";

    transaction.status = finalStatus;

    if (finalStatus === "captured") {
      transaction.paidAt = new Date();

      // Update next payment date for recurring
      if (transaction.meta?.frequency && transaction.meta?.nextPaymentDate) {
        const next = new Date(transaction.meta.nextPaymentDate);

        switch (transaction.meta.frequency) {
          case "daily":
            next.setDate(next.getDate() + 1);
            break;
          case "weekly":
            next.setDate(next.getDate() + 7);
            break;
          case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
        }

        transaction.meta.nextPaymentDate = next;
        transaction.meta.paymentsProcessed =
          (transaction.meta.paymentsProcessed || 0) + 1;
      }
    }

    await transaction.save();

    console.log("✅ Auto-pay captured:", {
      transactionId,
      status: finalStatus,
      nextPaymentDate: transaction.meta?.nextPaymentDate,
    });

    return res.json({
      success: true,
      _id: transaction._id,
      zeptpayTransactionId: transaction.zeptpayTransactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: finalStatus,
      paidAt: transaction.paidAt,
      payer: {
        name: transaction.payer?.name,
      },
      receiver: {
        name: transaction.receiver?.name,
      },
      source: transaction.source,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      message: `Auto-pay payment ${finalStatus}`,
      nextPaymentDate: transaction.meta?.nextPaymentDate,
      paymentsProcessed: transaction.meta?.paymentsProcessed || 0,
    });
  } catch (error) {
    console.error("❌ Auto-pay capture error:", error);
    return res
      .status(500)
      .json(
        createErrorResponse("Auto-pay capture failed", "SERVER_ERROR", 500),
      );
  }
};
