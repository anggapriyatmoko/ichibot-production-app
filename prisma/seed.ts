import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: await hash('password', 12), // Hashed password
            role: 'ADMIN',
        },
    })

    console.log({ admin })

    const product = await prisma.product.upsert({
        where: { sku: 'RM-001' },
        update: {},
        create: {
            name: 'Tepung Terigu',
            sku: 'RM-001',
            stock: 50,
            lowStockThreshold: 10
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
