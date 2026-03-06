import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { stripeWebhookHandler } from "./webhooks/stripe.webhook";
import authRoutes from "./routes/auth.routes";
import billingRoutes from "./routes/billing.routes";
import healthRoutes from "./routes/health.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// ─── Security Middleware ──────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ─── Rate Limiting ────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use(limiter);

// ─── Stripe Webhook (raw body required) ───────────
// Must be BEFORE express.json() middleware
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// ─── Body Parsing ─────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Routes ───────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);

// ─── Global Error Handler ─────────────────────────
app.use(errorHandler);

export default app;
