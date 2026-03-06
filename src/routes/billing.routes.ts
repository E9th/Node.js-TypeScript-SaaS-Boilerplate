import { Router, Request, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import stripe from "../lib/stripe";
import prisma from "../lib/prisma";
import { AppError } from "../utils/AppError";

const router = Router();

// ─── POST /api/billing/create-checkout-session ────
router.post(
  "/create-checkout-session",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new AppError("Subscription record not found", 404);
      }

      // Create or reuse Stripe customer
      let customerId = subscription.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user!.email,
          metadata: { userId },
        });
        customerId = customer.id;

        await prisma.subscription.update({
          where: { userId },
          data: { stripeCustomerId: customerId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID!,
            quantity: 1,
          },
        ],
        success_url: `${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/billing/cancel`,
      });

      res.json({ success: true, data: { url: session.url } });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/billing/create-portal-session ──────
router.post(
  "/create-portal-session",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user!.id },
      });

      if (!subscription?.stripeCustomerId) {
        throw new AppError("No billing account found", 404);
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.APP_URL}/dashboard`,
      });

      res.json({ success: true, data: { url: session.url } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
