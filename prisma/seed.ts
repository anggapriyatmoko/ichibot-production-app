import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
    const admin = await prisma.user.upsert({
        where: { email: 'admin@ichibot.id' },
        update: {},
        create: {
            id: randomUUID(),
            email: 'admin@ichibot.id',
            username: 'admin',
            name: 'Hokage',
            password: await hash('admin1234567890', 12), // Hashed password
            role: 'ADMIN',
            department: 'Hokage',
            updatedAt: new Date(),
        },
    })

    console.log({ admin })

    const product = await prisma.product.upsert({
        where: { sku: 'RM-001' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Ultimate 5 Max',
            sku: 'RM-001',
            stock: 50,
            lowStockThreshold: 10,
            updatedAt: new Date(),
        }
    })

    console.log({ product })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
