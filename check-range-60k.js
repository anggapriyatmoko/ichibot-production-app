
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRange() {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                wcId: { gte: 60000, lte: 60100 }
            },
            select: { wcId: true, name: true }
        });
        console.log('PRODUCTS_IN_RANGE:', JSON.stringify(products, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkRange();
