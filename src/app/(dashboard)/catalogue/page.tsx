import prisma from '@/lib/prisma'
import { Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { createRecipe } from '@/app/actions/recipe'
import RecipeList from '@/components/catalogue/recipe-list'

export const dynamic = 'force-dynamic'

export default async function CataloguePage() {
    const recipes = await prisma.recipe.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: {
                select: { ingredients: true }
            }
        }
    })

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Produk (Recipes)</h1>
                    <p className="text-muted-foreground">Manage your finished goods and their recipes/BOM.</p>
                </div>
            </div>

            <RecipeList recipes={recipes} />
        </div>
    )
}
