import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";

// Routes
import authRoutes from "./routes/auth/authRoutes";
import apiKeyRoutes from "./routes/tests/updatePermissions";
import testpaymentRoutes from "./routes/tests/Payment/testpayment";
import CountryRoutes from "./routes/tests/Payment/countryRoute";
import developerRoutes from "./routes/tests/zeptcaptured/zeptcaptured";
import merchantOnboardRoutes from "./routes/tests/zeptcaptured/merchant/merchantOnboard";
import webhookStatusRoutes from "./routes/tests/Webhook/webhookStatusRoutes";
import createWebhookRoutes from "./routes/tests/Webhook/createWebhook";

dotenv.config();
connectDB();

const app = express();

// ✅ Middleware
app.use(cors());

// 🔥 VERY LARGE PAYLOAD SUPPORT (Base64 Images)
app.use(express.json({ limit: "1024mb" })); // ≈ 1GB
app.use(express.urlencoded({ limit: "1024mb", extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/test-live/api-keys", apiKeyRoutes);
app.use("/api/test-live/payments", testpaymentRoutes);
app.use("/api", CountryRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/merchant", merchantOnboardRoutes);
app.use("/api/webhook", webhookStatusRoutes);
app.use("/api/webhook/core", createWebhookRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("✅ ZeptPay Backend is running!");
});

export default app;
