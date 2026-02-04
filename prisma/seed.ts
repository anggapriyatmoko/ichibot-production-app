import { PrismaClient } from '@prisma/client'
import { hash as hashPassword } from 'bcryptjs'
import { encrypt, hash } from '../src/lib/crypto'

const prisma = new PrismaClient()

async function main() {
    const adminEmail = 'admin@ichibot.id'
    const adminUsername = 'admin'

    const admin = await prisma.user.upsert({
        where: { emailHash: hash(adminEmail)! },
        update: {},
        create: {
            emailEnc: encrypt(adminEmail),
            emailHash: hash(adminEmail)!,
            usernameEnc: encrypt(adminUsername),
            usernameHash: hash(adminUsername)!,
            nameEnc: encrypt('Hokage'),
            password: await hashPassword('admin1234567890', 12), // Hashed password
            roleEnc: encrypt('ADMIN'),
            departmentEnc: encrypt('Hokage'),
        },
    })

    console.log({ admin })

    const product = await prisma.product.upsert({
        where: { sku: 'RM-001' },
        update: {},
        create: {
            name: 'Ultimate 5 Max',
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
