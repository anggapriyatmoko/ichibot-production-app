import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import { compare } from "bcryptjs"

export const authOptions: AuthOptions = {
    session: {
        strategy: "jwt" as const,
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email
                    }
                })

                if (!user) {
                    return null
                }

                const isPasswordValid = await compare(credentials.password, user.password)

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    department: user.department || undefined,
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }: any) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.department = user.department
            }
            if (trigger === "update" && session?.name) {
                token.name = session.name
            }
            return token
        },
        async session({ session, token }: any) {
            if (session?.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.department = token.department as string
            }
            return session
        }
    }
}

const handler = NextAuth(authOptions as any)

export { handler as GET, handler as POST }
