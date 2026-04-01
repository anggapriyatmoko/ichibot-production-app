import { Metadata } from 'next'
import SalesRecapClient from './sales-recap-client'

export const metadata: Metadata = {
  title: 'Rekap Penjualan | Sigma Ichibot',
  description: 'Rekap penjualan toko Ichibot',
}

export default function SalesRecapPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Rekap Penjualan</h1>
        <p className="text-muted-foreground">Log data penjualan otomatis dari POS & Webhook WooCommerce.</p>
      </div>

      <SalesRecapClient />
    </div>
  )
}
