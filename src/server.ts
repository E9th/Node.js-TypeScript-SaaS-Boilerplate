import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import prisma from "./lib/prisma";

const PORT = process.env.PORT || 3000;

async function main() {
  // Verify database connection
  await prisma.$connect();
  console.log("✅ Database connected");

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
