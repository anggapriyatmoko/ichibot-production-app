
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMaxId() {
    try {
        const maxProduct = await prisma.storeProduct.aggregate({
            _max: { wcId: true }
        });
        console.log('MAX_ID:', maxProduct._max.wcId);

        const minProduct = await prisma.storeProduct.aggregate({
            _min: { wcId: true }
        });
        console.log('MIN_ID:', minProduct._min.wcId);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkMaxId();
