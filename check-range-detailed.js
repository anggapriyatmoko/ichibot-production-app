
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRangeDetailed() {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                wcId: { gte: 18000, lte: 20000 }
            },
            orderBy: { wcId: 'asc' },
            select: { wcId: true, name: true }
        });

        console.log('COUNT_IN_RANGE:', products.length);
        if (products.length > 0) {
            console.log('FIRST_20_IN_RANGE:', JSON.stringify(products.slice(0, 20), null, 2));
            console.log('LAST_20_IN_RANGE:', JSON.stringify(products.slice(-20), null, 2));
        } else {
            console.log('NO_PRODUCTS_IN_RANGE_18000_20000');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkRangeDetailed();
