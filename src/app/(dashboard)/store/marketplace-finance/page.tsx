import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rekap Keuangan MP | Sigma Ichibot',
  description: 'Rekap keuangan marketplace Ichibot',
}

export default function MarketplaceRecapPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Rekap Keuangan MP</h1>
        <p className="text-muted-foreground">Ringkasan keuangan dan estimasi biaya marketplace.</p>
      </div>
      
      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl bg-card">
        <p className="text-muted-foreground font-medium italic">Halaman ini sedang dalam tahap pengembangan.</p>
      </div>
    </div>
  )
}
