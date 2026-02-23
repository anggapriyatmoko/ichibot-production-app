
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findBySku() {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                sku: 'E8-D12'
            }
        });
        console.log('FOUND_PRODUCTS_SKU:', JSON.stringify(products, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findBySku();
