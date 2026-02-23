// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma" // You'll create this helper in Step 4
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Credentials MUST use JWT strategy
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        // 1. Find user in MySQL
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string }
        })

        if (!user || !user.password) return null

        // 2. Compare the typed password with the hashed password in MySQL
        const isValid = await bcrypt.compare(
          credentials.password as string, 
          user.password
        )

        if (!isValid) return null

        return user // Success!
      }
    })
  ]
})