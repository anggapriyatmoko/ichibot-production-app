import AssetManager from '@/components/assets/asset-manager'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { requireAuth, isAllowedForPage } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'Aset Mesin/Alat | Ichibot Production',
    description: 'Kelola aset mesin dan alat produksi'
}

export const dynamic = 'force-dynamic'

export default async function AssetsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const sessionSession: any = await requireAuth()
    const allowed = await isAllowedForPage('/assets', ['ADMIN', 'USER', 'TEKNISI', 'HRD', 'ADMINISTRASI']);
    if (!allowed) redirect('/dashboard');

    const params = await searchParams
    const session: any = await getServerSession(authOptions)
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1
    const search = typeof params.search === 'string' ? params.search : ''
    const limit = typeof params.limit === 'string' ? parseInt(params.limit) : 10
    const skip = (page - 1) * limit

    // Search logic: split by whitespace and match ALL words (AND)
    const where: any = search ? {
        AND: search.split(/\s+/).filter(Boolean).map(word => ({
            OR: [
                { name: { contains: word } },
                { code: { contains: word } },
                { location: { contains: word } },
                { specification: { contains: word } }
            ]
        }))
    } : {}

    const [assets, totalCount, allAssets] = await prisma.$transaction([
        prisma.machineAsset.findMany({
            where,
            orderBy: { name: 'asc' },
            take: limit,
            skip: skip
        }),
        prisma.machineAsset.count({ where }),
        // Get all assets for summary calculation (without pagination)
        prisma.machineAsset.findMany({
            orderBy: { name: 'asc' }
        })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Aset Mesin/Alat</h1>
                <p className="text-muted-foreground">Kelola aset mesin dan alat produksi.</p>
            </div>

            <AssetManager
                initialAssets={assets as any}
                allAssets={allAssets as any}
                totalPages={totalPages}
                currentPage={page}
                totalCount={totalCount}
                itemsPerPage={limit}
                userRole={session?.user?.role}
            />
        </div>
    )
}
