
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOverlap() {
    try {
        // Just get the IDs to see what we actually have
        const products = await prisma.storeProduct.findMany({
            orderBy: { wcId: 'asc' },
            select: { wcId: true }
        });

        const idsInDb = products.map(p => p.wcId);
        console.log('TOTAL_IDS_COUNT:', idsInDb.length);
        console.log('FIRST_10_IDS:', idsInDb.slice(0, 10));
        console.log('LAST_10_IDS:', idsInDb.slice(-10));

        const screenshotIds = [40798, 19484, 19211, 18952, 18737];
        const overlap = screenshotIds.filter(id => idsInDb.includes(id));
        console.log('OVERLAP_WITH_SCREENSHOT:', overlap);

        // Let's check IDs around 18000-20000
        const aroundIds = idsInDb.filter(id => id >= 18000 && id <= 20000);
        console.log('IDS_BETWEEN_18000_AND_20000_COUNT:', aroundIds.length);
        console.log('SAMPLE_IDS_IN_RANGE:', aroundIds.slice(0, 20));

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkOverlap();
