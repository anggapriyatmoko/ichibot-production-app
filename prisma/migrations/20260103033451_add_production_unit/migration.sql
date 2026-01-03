-- CreateTable
CREATE TABLE "ProductionUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionPlanId" TEXT NOT NULL,
    "unitNumber" INTEGER NOT NULL,
    "productIdentifier" TEXT,
    "completed" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionUnit_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
