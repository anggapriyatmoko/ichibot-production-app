import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { Construction } from 'lucide-react'

export const metadata = {
    title: 'Pemasukan | Ichibot Production',
    description: 'Manajemen pemasukan'
}

export default async function PemasukanPage() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    return (
        <div className="space-y-6 h-[70vh] flex flex-col items-center justify-center">
            <div className="flex flex-col gap-4 items-center text-center max-w-md animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full">
                    <Construction className="w-16 h-16" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Sedang dimasak</h1>
                <p className="text-muted-foreground text-lg">
                    Halaman manajemen pemasukan sedang dalam tahap pengembangan. Silakan kembali lagi nanti.
                </p>
            </div>
        </div>
    )
}
