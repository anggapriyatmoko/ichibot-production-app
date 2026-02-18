import prisma from '@/lib/prisma'
import { Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { createRecipe } from '@/app/actions/recipe'
import RecipeList from '@/components/catalogue/recipe-list'

export const dynamic = 'force-dynamic'

import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function CataloguePage() {
    const session: any = await requireAuth()
    const allowed = await isAllowedForPage('/catalogue', ['ADMIN', 'USER', 'TEKNISI', 'HRD', 'ADMINISTRASI']);
    if (!allowed) redirect('/dashboard');


    const [recipes, categories] = await prisma.$transaction([
        prisma.recipe.findMany({
            include: {
                _count: {
                    select: { ingredients: true }
                },
                category: true
            },
            orderBy: { name: 'asc' }
        }),
        prisma.category.findMany({ orderBy: { name: 'asc' } })
    ])

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Product Ichibot</h1>
                <p className="text-muted-foreground">Manage finished goods, recipes, and BOMs.</p>
            </div>

            <RecipeList
                // @ts-ignore
                recipes={recipes}
                categories={categories}
                userRole={session?.user?.role}
            />
        </div>
    )
}
