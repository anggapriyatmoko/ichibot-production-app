
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const roles = await prisma.user.groupBy({
        by: ['role'],
    })
    console.log('Unique roles in DB:', roles)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
