import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DB SUMMARY ---');
    const totalCount = await prisma.storeProduct.count();
    console.log(`Total products in DB: ${totalCount}`);

    console.log('\n--- TYPES IN DB ---');
    const types = await prisma.storeProduct.groupBy({
        by: ['type'],
        _count: { _all: true }
    });
    console.log(JSON.stringify(types, null, 2));

    console.log('\n--- VARIATIONS (type: "variation") ---');
    const variationsByType = await prisma.storeProduct.findMany({
        where: { type: 'variation' }
    });
    console.log(`Products with type "variation": ${variationsByType.length}`);

    console.log('\n--- HIERARCHY (parentId NOT NULL) ---');
    const variationsByParentId = await prisma.storeProduct.findMany({
        where: { parentId: { not: null } }
    });
    console.log(`Products with parentId != null: ${variationsByParentId.length}`);
    variationsByParentId.forEach(p => {
        console.log(`- ID: ${p.wcId}, parentId: ${p.parentId}, type: ${p.type}, name: ${p.name}`);
    });

    console.log('\n--- CHECKING FOR 79697 CHILDREN ---');
    const children = await prisma.storeProduct.findMany({
        where: { parentId: 79697 }
    });
    console.log(`Children found for 79697: ${children.length}`);

    console.log('\n--- CHECKING SPECIFIC ID 79697 ---');
    const parent = await prisma.storeProduct.findUnique({
        where: { wcId: 79697 }
    });
    console.log(JSON.stringify(parent, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
