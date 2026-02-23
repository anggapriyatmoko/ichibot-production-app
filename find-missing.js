
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMissing() {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                isMissingFromWoo: true
            },
            take: 10,
            select: { wcId: true, name: true }
        });
        console.log('MISSING_PRODUCTS:', JSON.stringify(products, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findMissing();
