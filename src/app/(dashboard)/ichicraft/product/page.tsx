import IchicraftProductManager from '@/components/ichicraft/ichicraft-product-manager'
import { getIchicraftCategories } from '@/app/actions/ichicraft-product'

export const metadata = {
    title: 'Ichicraft Product | Ichibot Production',
    description: 'Kelola produk Ichicraft'
}


export default async function IchicraftProductPage() {
    const result = await getIchicraftCategories()
    const categories = result.success ? (result.data || []) : []

    return (
        <IchicraftProductManager initialCategories={categories as any} />
    )
}
