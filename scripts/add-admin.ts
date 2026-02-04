import { PrismaClient } from '@prisma/client'
import { hash as hashPassword } from 'bcryptjs'
import { encrypt, hash } from '../src/lib/crypto'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@ichibot.id'
    const username = 'admin'

    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
        where: {
            OR: [
                { emailHash: hash(email)! },
                { usernameHash: hash(username)! }
            ]
        }
    })

    if (existingAdmin) {
        console.log('Admin already exists')
        return
    }

    const admin = await prisma.user.create({
        data: {
            emailEnc: encrypt(email),
            emailHash: hash(email)!,
            usernameEnc: encrypt(username),
            usernameHash: hash(username)!,
            nameEnc: encrypt('Admin Local'),
            password: await hashPassword('admin123', 12),
            roleEnc: encrypt('ADMIN'),
            departmentEnc: encrypt('IT'),
        },
    })

    console.log('Admin created:', admin)
}

main()
    .catch((e) => {
        console.error('Error creating admin:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
