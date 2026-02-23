
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
    const ids = [40798, 19484, 19211, 18952, 18737];
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                wcId: { in: ids }
            },
            select: {
                wcId: true,
                name: true,
                sku: true,
                isMissingFromWoo: true,
                stockQuantity: true
            }
        });
        console.log('PRODUCTS_FOUND:', JSON.stringify(products, null, 2));

        // Also check for any missing IDs
        const foundIds = products.map(p => p.wcId);
        const missingIds = ids.filter(id => !foundIds.includes(id));
        console.log('IDS_NOT_IN_DB:', missingIds);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkProducts();
