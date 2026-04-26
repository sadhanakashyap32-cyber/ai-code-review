import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../../lib/prisma";

// Security Fallback Validation
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("⚠️ Warning: NEXTAUTH_SECRET is missing from .env.local! Authentication will randomly fail or reject sessions.");
}
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("⚠️ Warning: GOOGLE_CLIENT_ID or SECRET is missing. Google OAuth will throw a 500 API error on clicking login.");
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "FALLBACK_ID",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "FALLBACK_SECRET",
    }),
  ],
  pages: {
    signIn: '/login', // Custom login page
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // Inject the user's id (from the db) into the session
      }
      return session;
    },
    async jwt({ token, user }) {
      // When user signs in, user object is available
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
