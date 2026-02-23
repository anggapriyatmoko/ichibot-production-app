
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProduct() {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                name: { contains: 'Transistor 2N3906' }
            }
        });
        console.log('FOUND_PRODUCTS:', JSON.stringify(products, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findProduct();
