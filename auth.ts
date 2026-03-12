// auth.ts - NextAuth v5 with Credentials Provider and JWT
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { NextAuthConfig } from "next-auth"

const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
    updateAge: 5 * 60, // Refresh every 5 minutes of activity
  },
  jwt: {
    maxAge: 15 * 60, // 15 minutes
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id     
        token.id = user.id
        token.username = (user as any).username
      }
      
      // Generate or regenerate JWS token for external API use (FastAPI)
      // Do this on every token call to ensure it's always available
      const secret = process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production"
      const apiToken = jwt.sign(
        {
          sub: token.sub || token.id,
          id: token.id,
          username: token.username,
        },
        secret,
        {
          algorithm: "HS256",
          expiresIn: "15m",
        }
      )
      
      token.apiToken = apiToken
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).username = token.username
        ;(session.user as any).apiToken = token.apiToken  // JWS token for FastAPI auth
      }
      return session
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = request.nextUrl

      // Public routes that don't require auth (and their subpaths, except "/" to avoid "//")
      const publicRoutes = ["/", "/admin-login", "/verify", "/verify-customer"]
      const isPublicRoute =
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/v1") ||
        publicRoutes.some(
          (route) => pathname === route || (route !== "/" && pathname.startsWith(route + "/"))
        )

      if (isPublicRoute) return true
      if (!isLoggedIn) return false

      return true
    },
  },
  pages: {
    signIn: "/admin-login",
    error: "/admin-login",
  },
  debug: process.env.NODE_ENV === "development",
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
export { authConfig }