import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import IngredientManager from '@/components/catalogue/ingredient-manager'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
                orderBy: [
                    { order: 'asc' },
                    { createdAt: 'asc' }
                ],
                select: {
                    id: true,
                    name: true,
                    order: true,
                    category: true
                }
            }
        }
    })

    if (!recipe) notFound()

    const allProducts = await prisma.product.findMany({
        orderBy: { name: 'asc' }
    })

    const existingSections = await prisma.recipeSection.findMany({
        distinct: ['name'],
        select: { name: true },
        orderBy: { name: 'asc' }
    })
    const existingSectionNames = existingSections.map(s => s.name)

    const sectionCategories = await prisma.sectioncategory.findMany({
        orderBy: { name: 'asc' }
    })

    const session: any = await getServerSession(authOptions)

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
                <IngredientManager
                    recipeId={recipe.id}
                    recipeName={recipe.name}
                    initialIngredients={recipe.ingredients}
                    initialSections={recipe.sections}
                    allProducts={allProducts}
                    userRole={session?.user?.role}
                    existingSectionNames={existingSectionNames}
                    sectionCategories={sectionCategories.map(c => c.name)}
                />
            </div>
        </div>
    )
}
