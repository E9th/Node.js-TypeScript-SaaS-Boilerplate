import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { sendMail } from "../lib/email";
import { AppError } from "../utils/AppError";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── Helper ───────────────────────────────────────
function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any,
  });
}

// ─── POST /api/auth/signup ────────────────────────
router.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        throw new AppError("Email and password are required", 400);
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError("Email already in use", 409);
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          subscription: {
            create: { status: "FREE" },
          },
        },
        select: { id: true, email: true, name: true, role: true },
      });

      const token = signToken(user.id);

      res.status(201).json({
        success: true,
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError("Email and password are required", 400);
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AppError("Invalid email or password", 401);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new AppError("Invalid email or password", 401);
      }

      const token = signToken(user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────
router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              stripePriceId: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      });

      res.json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/auth/forgot-password ───────────────
router.post(
  "/forgot-password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) {
        throw new AppError("Email is required", 400);
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Don't reveal whether user exists
        res.json({
          success: true,
          message: "If that email exists, a reset link has been sent.",
        });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

      await sendMail({
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      res.json({
        success: true,
        message: "If that email exists, a reset link has been sent.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/auth/reset-password ────────────────
router.post(
  "/reset-password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        throw new AppError("Token and new password are required", 400);
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: { gt: new Date() },
        },
      });

      if (!user) {
        throw new AppError("Invalid or expired reset token", 400);
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      res.json({
        success: true,
        message: "Password has been reset successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
