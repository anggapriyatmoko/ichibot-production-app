-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductionUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionPlanId" TEXT NOT NULL,
    "unitNumber" INTEGER NOT NULL,
    "productIdentifier" TEXT,
    "completed" TEXT NOT NULL DEFAULT '[]',
    "isPacked" BOOLEAN NOT NULL DEFAULT false,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "marketplace" TEXT,
    "customer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionUnit_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductionUnit" ("completed", "createdAt", "id", "productIdentifier", "productionPlanId", "unitNumber", "updatedAt") SELECT "completed", "createdAt", "id", "productIdentifier", "productionPlanId", "unitNumber", "updatedAt" FROM "ProductionUnit";
DROP TABLE "ProductionUnit";
ALTER TABLE "new_ProductionUnit" RENAME TO "ProductionUnit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
