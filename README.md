# 🚀 Node.js & TypeScript SaaS Boilerplate

A **production-ready** backend boilerplate for building SaaS applications. Ship your next product faster with authentication, Stripe payments, and PostgreSQL — all pre-configured and ready to go.

---

## ✨ Features

| Feature | Details |
|---|---|
| **TypeScript** | Full type safety across the entire codebase |
| **Express.js** | Battle-tested HTTP framework |
| **PostgreSQL + Prisma** | Type-safe ORM with migrations |
| **JWT Authentication** | Signup, Login, Logout, Password Reset |
| **Stripe Integration** | Checkout, Webhooks, Customer Portal |
| **Subscription Management** | Free → Premium flow out of the box |
| **Global Error Handler** | Consistent JSON error responses |
| **Security** | Helmet, CORS, Rate Limiting |
| **Docker** | One-command setup with `docker-compose` |
| **Seed Data** | Demo users ready for testing |

---

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema (User, Subscription)
│   └── seed.ts                # Seed data for development
├── src/
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client instance
│   │   ├── stripe.ts          # Stripe client instance
│   │   └── email.ts           # Email transporter (Nodemailer)
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication & role guard
│   │   └── errorHandler.ts    # Global error handling middleware
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints (signup/login/reset)
│   │   ├── billing.routes.ts  # Stripe checkout & portal
│   │   └── health.routes.ts   # Health check endpoint
│   ├── utils/
│   │   └── AppError.ts        # Custom error class
│   ├── webhooks/
│   │   └── stripe.webhook.ts  # Stripe webhook handler
│   ├── app.ts                 # Express app configuration
│   └── server.ts              # Server entry point
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 🏁 Quick Start

### Option A: Docker (Recommended)

The fastest way to get running. This starts both the Node.js app and PostgreSQL database.

```bash
# 1. Clone the repo
git clone https://github.com/E9th/Node.js-TypeScript-SaaS-Boilerplate.git
cd Node.js-TypeScript-SaaS-Boilerplate

# 2. Copy environment variables
cp .env.example .env

# 3. Edit .env with your own values (see Environment Variables section below)

# 4. Start everything
docker-compose up --build
```

The API will be available at `http://localhost:3000`.

### Option B: Local Development

```bash
# 1. Clone & install
git clone https://github.com/E9th/Node.js-TypeScript-SaaS-Boilerplate.git
cd Node.js-TypeScript-SaaS-Boilerplate
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env — make sure DATABASE_URL points to your PostgreSQL instance

# 3. Setup database
npx prisma migrate dev --name init
npm run db:seed

# 4. Start dev server (with hot-reload)
npm run dev
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and update the values:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `3000` |
| `APP_URL` | Your app's public URL | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/saas_db?schema=public` |
| `JWT_SECRET` | **Change this!** Random string for signing tokens | A random 64+ character string |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `STRIPE_SECRET_KEY` | Stripe secret key (from Stripe Dashboard) | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Stripe Price ID for your subscription plan | `price_...` |
| `SMTP_HOST` | SMTP mail server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username/email | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password or app password | `your-app-password` |
| `EMAIL_FROM` | From address for emails | `"SaaS App <noreply@yourdomain.com>"` |

---

## 📡 API Endpoints

### Health Check
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Create a new account | ❌ |
| `POST` | `/api/auth/login` | Login & get JWT token | ❌ |
| `GET` | `/api/auth/me` | Get current user profile | ✅ |
| `POST` | `/api/auth/forgot-password` | Request password reset email | ❌ |
| `POST` | `/api/auth/reset-password` | Reset password with token | ❌ |

### Billing (Stripe)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/billing/create-checkout-session` | Create Stripe Checkout session | ✅ |
| `POST` | `/api/billing/create-portal-session` | Open Stripe Customer Portal | ✅ |

### Webhooks
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/stripe` | Stripe webhook receiver |

---

## 🔐 Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123", "name": "John"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

---

## 💳 Stripe Setup

### 1. Get your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret Key** → `STRIPE_SECRET_KEY`
3. Create a Product & Price → copy the Price ID → `STRIPE_PRICE_ID`

### 2. Setup Webhooks

For **local development**, use Stripe CLI:

```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

For **production**, add the webhook endpoint in Stripe Dashboard:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`

### 3. Payment Flow

1. User hits `POST /api/billing/create-checkout-session` → Gets a Stripe Checkout URL
2. User pays on Stripe Checkout
3. Stripe sends `checkout.session.completed` webhook → Subscription updated to `ACTIVE`
4. On renewal, Stripe sends `invoice.payment_succeeded` → Period dates updated
5. If payment fails → Status changes to `PAST_DUE`
6. If canceled → Status changes to `CANCELED`

---

## 🗄️ Database

### Schema Overview

**User** — stores account information:
- `email`, `password` (hashed), `name`, `role` (USER/ADMIN)
- Password reset fields: `resetPasswordToken`, `resetPasswordExpires`

**Subscription** — tracks billing status:
- `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`
- `status` (FREE / ACTIVE / PAST_DUE / CANCELED / UNPAID)
- `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`

### Useful Commands

```bash
# Run migrations
npx prisma migrate dev --name <migration-name>

# Push schema (no migration file)
npm run db:push

# Open Prisma Studio (visual DB editor)
npm run db:studio

# Seed the database
npm run db:seed

# Generate Prisma client after schema changes
npm run db:generate
```

---

## 🛠️ Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed database with demo data |

---

## 🧱 Customization Guide

### Adding a New Route

1. Create a new file in `src/routes/`, e.g., `projects.routes.ts`
2. Define your Express router with endpoints
3. Import and mount it in `src/app.ts`:
   ```typescript
   import projectRoutes from "./routes/projects.routes";
   app.use("/api/projects", projectRoutes);
   ```

### Adding a New Database Model

1. Add the model in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add-projects`
3. The Prisma client auto-updates with full type safety

### Protecting Routes

```typescript
import { authenticate, requireRole } from "../middleware/auth";

// Any authenticated user
router.get("/profile", authenticate, handler);

// Admin only
router.delete("/users/:id", authenticate, requireRole("ADMIN"), handler);
```

---

## 📄 License

MIT — use it for your personal or commercial projects.
