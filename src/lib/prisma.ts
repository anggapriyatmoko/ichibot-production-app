import { PrismaClient } from '@prisma/client'

declare global {
    var prismaGlobal_v5: PrismaClient | undefined
}

const prisma = globalThis.prismaGlobal_v5 ?? new PrismaClient()

globalThis.prismaGlobal_v5 = prisma

export default prisma

