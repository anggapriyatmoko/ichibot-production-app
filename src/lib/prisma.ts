import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    var prismaGlobal_v4: PrismaClient | undefined
}

const prisma = globalThis.prismaGlobal_v4 ?? new PrismaClient()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal_v4 = prisma

// Force reload for schema changes: 2026-02-22T09:30:00
