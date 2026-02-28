const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.storeProduct.findMany({
        where: { storeName: { not: null, contains: ',' } },
        select: { wcId: true, name: true, storeName: true }
    });
    console.log("Products with commas in storeName:", JSON.stringify(products, null, 2));

    const suppliers = await prisma.storeSupplier.findMany();
    console.log("All suppliers:", suppliers.map(s => s.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
