// src/routes/testPaymentRoutes.ts
import express from "express";
import { authMiddleware } from "../../../middleware/authMiddleware";

// Import from create payment controllers
import {
  createTestPayment,
  createAutoPayTransaction,
  simulateQrScan,
  generateTestQR,
} from "../../../controllers/Test/Payment/testpayment";

// Import from get/confirm payment controllers
import {
  getTransactionStatus,
  getUserTransactions,
  confirmPayment,
  captureAutoPayPayment,
} from "../../../controllers/Test/Payment/getpayment";

// Import saved payment method controllers (optional - can be removed if not needed)
import {
  savePaymentMethod,
  listSavedMethods,
} from "../../../controllers/Test/Payment/savedPayment";

const router = express.Router();

// ==================== Payment Creation Routes ====================

/**
 * @route   POST /api/test-payment
 * @desc    Create a test payment (zeptpay method)
 * @access  Private
 */
router.post("/", createTestPayment);

/**
 * @route   POST /api/test-payment/autopay/create
 * @desc    Create auto-pay schedule (test mode)
 * @access  Private
 */
router.post("/autopay/create", createAutoPayTransaction);

/**
 * @route   POST /api/test-payment/qr/generate
 * @desc    Generate test QR code for payment
 * @access  Private
 */
router.post("/qr/generate", generateTestQR);

// ==================== Payment Confirmation Routes ====================

/**
 * @route   POST /api/test-payment/confirm
 * @desc    Confirm a pending transaction (test mode only)
 * @access  Private
 */
router.post("/confirm", confirmPayment);

/**
 * @route   POST /api/test-payment/qr/simulate-scan
 * @desc    Simulate QR code scan and payment completion
 * @access  Private
 */
router.post("/qr/simulate-scan", simulateQrScan);

/**
 * @route   POST /api/test-payment/autopay/capture
 * @desc    Capture/confirm auto-pay payment (test mode)
 * @access  Private
 */
router.post("/autopay/capture", captureAutoPayPayment);

// ==================== Transaction Status Routes ====================

/**
 * @route   GET /api/test-payment/transaction/:transactionId
 * @desc    Get transaction status by transaction ID
 * @access  Private
 */
router.get("/transaction/:transactionId", getTransactionStatus);

/**
 * @route   GET /api/test-payment/user/:userId/transactions
 * @desc    Get all transactions for a user (as payer or merchant)
 * @access  Private
 */
router.get("/user/:userId/transactions", getUserTransactions);

// ==================== Saved Payment Method Routes (Optional) ====================

/**
 * @route   POST /api/test-payment/save
 * @desc    Save a payment method for future use
 * @access  Private
 */
router.post("/save", authMiddleware, savePaymentMethod);

/**
 * @route   GET /api/test-payment/saved/:zeptpayAccountId
 * @desc    List all saved payment methods for an account
 * @access  Private
 */
router.get("/saved/:zeptpayAccountId", authMiddleware, listSavedMethods);

export default router;