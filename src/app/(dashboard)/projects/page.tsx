import { getProjects, getProjectCategories } from '@/app/actions/project'
import { getUsers } from '@/app/actions/user'
import ProjectManager from '@/components/projects/project-manager'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
    const user = await requireAuth()
    const projects = await getProjects()
    const categories = await getProjectCategories()
    const allUsers = await getUsers()

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Daftar Project</h1>
                <p className="text-muted-foreground mt-1">Kelola dan pantau semua project yang sedang berjalan.</p>
            </div>

            <ProjectManager
                initialProjects={projects as any}
                categories={categories}
                allUsers={allUsers as any}
                userRole={user.user.role}
            />
        </div>
    )
}
