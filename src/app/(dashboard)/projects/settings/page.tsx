import { getProjectCategories } from '@/app/actions/project'
import CategoryManager from '@/components/projects/category-manager'
import { requireAdmin } from '@/lib/auth'

export default async function ProjectSettingsPage() {
    const session = await requireAdmin()


    const categories = await getProjectCategories()

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Setting Project</h1>
                <p className="text-muted-foreground mt-1">Kelola kategori untuk pengorganisasian project.</p>
            </div>

            <CategoryManager initialCategories={categories} />
        </div>
    )
}
