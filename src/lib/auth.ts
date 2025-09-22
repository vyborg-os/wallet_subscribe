import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        purpose: { label: "Purpose", type: "text" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
            otp: z.string().min(4),
            purpose: z.enum(["login", "signup"]).default("login"),
          })
          .safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, otp, purpose } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        // Verify OTP
        const now = new Date();
        const otpRow = await prisma.otpCode.findFirst({
          where: {
            userId: user.id,
            code: otp,
            purpose,
            consumed: false,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!otpRow) return null;
        await prisma.otpCode.update({ where: { id: otpRow.id }, data: { consumed: true } });
        return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = (user as any).id;
        if ((user as any).role) token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.uid) {
        (session.user as any).id = token.uid as string;
        if (token.role) (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
