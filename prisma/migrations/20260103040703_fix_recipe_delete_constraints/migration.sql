-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionPlan_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductionPlan" ("createdAt", "id", "month", "quantity", "recipeId", "status", "updatedAt", "year") SELECT "createdAt", "id", "month", "quantity", "recipeId", "status", "updatedAt", "year" FROM "ProductionPlan";
DROP TABLE "ProductionPlan";
ALTER TABLE "new_ProductionPlan" RENAME TO "ProductionPlan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
