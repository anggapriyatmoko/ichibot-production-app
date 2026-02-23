
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
    try {
        const product = await prisma.storeProduct.findUnique({
            where: { wcId: 60042 }
        });
        console.log('PRODUCT_DATA:', JSON.stringify(product, null, 2));

        const count = await prisma.storeProduct.count();
        console.log('TOTAL_LOCAL_PRODUCTS:', count);

        const missingCount = await prisma.storeProduct.count({
            where: { isMissingFromWoo: true }
        });
        console.log('TOTAL_MISSING_PRODUCTS:', missingCount);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkProduct();
