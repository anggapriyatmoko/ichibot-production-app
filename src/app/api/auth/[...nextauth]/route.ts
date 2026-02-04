import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import { compare } from "bcryptjs"

const rateLimitStore = new Map<string, { attempts: number, blockedUntil: number }>()

export const authOptions: AuthOptions = {
    session: {
        strategy: "jwt" as const,
        maxAge: 60 * 60 * 6, // 6 hours in seconds
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                authType: { label: "Auth Type", type: "text" }
            },
            async authorize(credentials, req) {
                // Get IP address
                let ip = 'unknown'
                if (req?.headers) {
                    const headers = req.headers as any
                    ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'
                    // Handle array or comma-separated string
                    if (Array.isArray(ip)) ip = ip[0]
                    if (ip.includes(',')) ip = ip.split(',')[0].trim()
                }

                // Check Rate Limit
                const now = Date.now()
                const record = rateLimitStore.get(ip)

                if (record) {
                    if (now < record.blockedUntil) {
                        const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000)
                        throw new Error(`Terlalu banyak percobaan. Tunggu ${remainingMinutes} menit.`)
                    }
                    if (now > record.blockedUntil && record.blockedUntil !== 0) {
                        // Reset if block expired
                        rateLimitStore.delete(ip)
                    }
                }

                const authType = credentials?.authType || 'password'

                if (authType === 'password') {
                    if (!credentials?.email) {
                        throw new Error('Email is required')
                    }
                    if (!credentials?.password) {
                        throw new Error('Password is required')
                    }
                } else if (authType === 'pin') {
                    if (!credentials?.password) { // In PIN mode, 'password' field holds the PIN
                        throw new Error('PIN is required')
                    }
                }

                const { encrypt, decrypt, hash } = require('@/lib/crypto')

                if (authType === 'pin') {
                    // PIN-only login: Scan users with PINs
                    // Note: This is inefficient for large datasets but necessary without a pinHash column
                    // Fetch users who have a PIN set (pinEnc is not null/empty)
                    const usersWithPin = await (prisma.user as any).findMany({
                        where: {
                            NOT: {
                                pinEnc: null
                            }
                        }
                    })

                    const pinAttempt = credentials?.password

                    for (const user of usersWithPin) {
                        try {
                            const decryptedPin = decrypt(user.pinEnc)
                            if (decryptedPin === pinAttempt) {
                                // Match found! Reset rate limit
                                rateLimitStore.delete(ip)

                                return {
                                    id: user.id,
                                    email: decrypt(user.emailEnc),
                                    name: decrypt(user.nameEnc),
                                    role: decrypt(user.roleEnc) || 'USER',
                                    department: decrypt(user.departmentEnc) || undefined,
                                }
                            }
                        } catch (e) {
                            // Continue if decryption fails for some reason
                            continue
                        }
                    }

                    // PIN Failed - Update Rate Limit
                    const currentAttempts = (rateLimitStore.get(ip)?.attempts || 0) + 1
                    if (currentAttempts >= 7) {
                        rateLimitStore.set(ip, {
                            attempts: currentAttempts,
                            blockedUntil: now + 5 * 60 * 1000 // Block for 5 minutes
                        })
                        throw new Error('Terlalu banyak percobaan. Tunggu 5 menit.')
                    } else {
                        rateLimitStore.set(ip, {
                            attempts: currentAttempts,
                            blockedUntil: 0
                        })
                    }

                    throw new Error('PIN salah atau tidak ditemukan')
                } else {
                    // Standard Email/Password login
                    const hashedInput = hash(credentials!.email)

                    const user = await (prisma.user as any).findFirst({
                        where: {
                            OR: [
                                { emailHash: hashedInput },
                                { usernameHash: hashedInput }
                            ]
                        }
                    })

                    if (!user) {
                        // Failed login - Update Rate Limit
                        const currentAttempts = (rateLimitStore.get(ip)?.attempts || 0) + 1
                        if (currentAttempts >= 7) {
                            rateLimitStore.set(ip, {
                                attempts: currentAttempts,
                                blockedUntil: now + 5 * 60 * 1000 // Block for 5 minutes
                            })
                            throw new Error('Terlalu banyak percobaan. Tunggu 5 menit.')
                        } else {
                            rateLimitStore.set(ip, {
                                attempts: currentAttempts,
                                blockedUntil: 0
                            })
                        }
                        throw new Error('Email not registered')
                    }

                    // Validate Password
                    const isPasswordValid = await compare(credentials!.password, user.password)
                    if (!isPasswordValid) {
                        // Failed login - Update Rate Limit
                        const currentAttempts = (rateLimitStore.get(ip)?.attempts || 0) + 1
                        if (currentAttempts >= 7) {
                            rateLimitStore.set(ip, {
                                attempts: currentAttempts,
                                blockedUntil: now + 5 * 60 * 1000 // Block for 5 minutes
                            })
                            throw new Error('Terlalu banyak percobaan. Tunggu 5 menit.')
                        } else {
                            rateLimitStore.set(ip, {
                                attempts: currentAttempts,
                                blockedUntil: 0
                            })
                        }
                        throw new Error('Password salah')
                    }

                    // Successful login - Reset rate limit
                    rateLimitStore.delete(ip)

                    return {
                        id: user.id,
                        email: decrypt(user.emailEnc),
                        name: decrypt(user.nameEnc),
                        role: decrypt(user.roleEnc) || 'USER',
                        department: decrypt(user.departmentEnc) || undefined,
                    }
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
