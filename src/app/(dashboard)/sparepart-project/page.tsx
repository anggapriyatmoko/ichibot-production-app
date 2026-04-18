import SparepartProjectList from '@/components/sparepart-project/sparepart-project-list'
import { getSparepartProjectsPaginated } from '@/app/actions/sparepart-project'
import { getSession } from '@/lib/auth'


export default async function SparepartProjectPage() {
    const session: any = await getSession()
    const result = await getSparepartProjectsPaginated({ page: 1, perPage: 20 })

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Sparepart Project</h1>
                <p className="text-muted-foreground">Manage spare parts for projects.</p>
            </div>

            <SparepartProjectList
                initialItems={result.items}
                initialTotalCount={result.totalCount}
                initialTotalPages={result.totalPages}
                serverSidePagination={true}
                userRole={session?.user?.role}
            />
        </div>
    )
}
