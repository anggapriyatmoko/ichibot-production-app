import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import IngredientManager from '@/components/catalogue/ingredient-manager'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
            ingredients: {
                include: { product: true }
            },
            sections: {
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })

    if (!recipe) notFound()

    const allProducts = await prisma.product.findMany({
        orderBy: { name: 'asc' }
    })

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Link href="/catalogue" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Produk
            </Link>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h1 className="text-3xl font-bold text-foreground mb-2">{recipe.name}</h1>
                <p className="text-muted-foreground">{recipe.description || 'No description provided.'}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Ingredients (BOM)</h2>
                    <p className="text-sm text-muted-foreground">List of materials required to produce one unit.</p>
                </div>

                <IngredientManager
                    recipeId={recipe.id}
                    recipeName={recipe.name}
                    initialIngredients={recipe.ingredients}
                    initialSections={recipe.sections}
                    allProducts={allProducts}
                />
            </div>
        </div>
    )
}
