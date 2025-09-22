// Usage:
//   node prisma/create-admin.js "email@example.com" "PlaintextPassword"
// Creates or updates the user to ADMIN with the given password.

const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function genRefCode() {
  return crypto.randomBytes(6).toString("hex");
}

async function ensureAdmin(email, password) {
  const passwordHash = await hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: "ADMIN",
        name: existing.name || "Admin",
      },
    });
    return existing.id;
  }

  // Create user with a refCode; handle rare collision
  let refCode = genRefCode();
  try {
    const u = await prisma.user.create({
      data: {
        email,
        name: "Admin",
        passwordHash,
        refCode,
        role: "ADMIN",
      },
      select: { id: true },
    });
    return u.id;
  } catch (e) {
    if (e && e.code === "P2002") {
      // unique constraint, retry refCode once
      refCode = genRefCode();
      const u = await prisma.user.create({
        data: {
          email,
          name: "Admin",
          passwordHash,
          refCode,
          role: "ADMIN",
        },
        select: { id: true },
      });
      return u.id;
    }
    throw e;
  }
}

(async () => {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Usage: node prisma/create-admin.js \"email@example.com\" \"PlaintextPassword\"");
    process.exit(1);
  }
  try {
    const id = await ensureAdmin(email, password);
    console.log(`Admin user ensured. id=${id}, email=${email}`);
  } catch (err) {
    console.error("Failed to create/update admin:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
