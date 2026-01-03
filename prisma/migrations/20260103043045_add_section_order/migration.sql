-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecipeSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecipeSection_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecipeSection" ("createdAt", "id", "name", "recipeId") SELECT "createdAt", "id", "name", "recipeId" FROM "RecipeSection";
DROP TABLE "RecipeSection";
ALTER TABLE "new_RecipeSection" RENAME TO "RecipeSection";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
