import SparepartProjectList from '@/components/sparepart-project/sparepart-project-list'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export default async function SparepartProjectPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const session: any = await getServerSession(authOptions)
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1
    const search = typeof params.search === 'string' ? params.search : ''
    const limit = 20
    const skip = (page - 1) * limit

    const where: any = search ? {
        AND: search.split(/\s+/).filter(Boolean).map(word => ({
            OR: [
                { name: { contains: word } },
                { notes: { contains: word } }
            ]
        }))
    } : {}

    const [items, totalCount] = await prisma.$transaction([
        prisma.sparepartProject.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip
        }),
        prisma.sparepartProject.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Sparepart Project</h1>
                <p className="text-muted-foreground">Manage spare parts for projects.</p>
            </div>

            <SparepartProjectList
                initialItems={items}
                userRole={session?.user?.role}
                totalPages={totalPages}
                currentPage={page}
            />
        </div>
    )
}
