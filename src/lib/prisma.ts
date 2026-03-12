import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    var prismaGlobal_v5: PrismaClient | undefined
}

const prisma = globalThis.prismaGlobal_v5 ?? new PrismaClient()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal_v5 = prisma

// Force reload for schema changes: 2026-03-13T06:00:00
