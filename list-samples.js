
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listSamples() {
    try {
        const products = await prisma.storeProduct.findMany({
            take: 5,
            select: { wcId: true, name: true, sku: true, isMissingFromWoo: true }
        });
        console.log('SAMPLE_PRODUCTS:', JSON.stringify(products, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listSamples();
