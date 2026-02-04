import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.user.create({
        data: {
            id: randomUUID(),
            email: 'admin@ichibot.id',
            username: 'admin',
            name: 'Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            department: 'Management',
            updatedAt: new Date(),
        }
    })

    console.log('✅ Admin user created successfully!')
    console.log('Email:', admin.email)
    console.log('Username:', admin.username)
    console.log('Role:', admin.role)
}

main()
    .catch((e) => {
        console.error('Error creating admin:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
