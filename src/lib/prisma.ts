import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    var prismaGlobal_v2: PrismaClient | undefined
}

const prisma = globalThis.prismaGlobal_v2 ?? new PrismaClient()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal_v2 = prisma

// Force reload for schema changes
