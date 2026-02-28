const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.storeProduct.update({
  where: { wcId: 18206 },
  data: { storeName: "Shenzhen Youxin Electronics Technology Co., Ltd.||Mumu Electronic Components Development Board" }
}).then(console.log).catch(console.error).finally(() => prisma.$disconnect());
