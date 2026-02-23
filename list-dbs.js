
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listDbs() {
    try {
        const result = await prisma.$queryRawUnsafe('SHOW DATABASES;');
        console.log('DATABASES:', JSON.stringify(result, null, 2));

        const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
        console.log('TABLES:', JSON.stringify(tables, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listDbs();
