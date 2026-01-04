
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const units = await prisma.productionUnit.findMany({
        where: {
            OR: [
                { assembledAt: { not: null } },
                { packedAt: { not: null } }
            ]
        },
        take: 10,
        orderBy: { updatedAt: 'desc' }
    })

    console.log('Units with timestamps:', units)

    const allUnits = await prisma.productionUnit.count()
    console.log('Total units:', allUnits)
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
