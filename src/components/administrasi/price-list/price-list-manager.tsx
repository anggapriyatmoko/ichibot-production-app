'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPriceListGroup } from '@/app/actions/price-list'
import PriceListGroupComponent from './price-list-group'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/hooks/use-alert'

export default function PriceListManager({ initialGroups }: { initialGroups: any[] }) {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { showAlert, showError } = useAlert()

    const handleCreate = async () => {
        if (!newGroupName.trim()) return
        setLoading(true)
        const res = await createPriceListGroup(newGroupName)
        setLoading(false)

        if (res.error) {
            showError(res.error)
        } else {
            setNewGroupName('')
            setIsCreateOpen(false)
            router.refresh()
            showAlert('Grup berhasil dibuat', 'Berhasil')
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Daftar Harga</h1>
                    <p className="text-muted-foreground">
                        Kelola daftar harga barang dan jasa.
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Grup
                </Button>

                <Modal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    title="Buat Grup Baru"
                    maxWidth="md"
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                            <Button onClick={handleCreate} disabled={loading || !newGroupName.trim()}>
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nama Grup/Kategori</Label>
                            <Input
                                placeholder="Contoh: Sparepart 2024"
                                value={newGroupName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGroupName(e.target.value)}
                            />
                        </div>
                    </div>
                </Modal>
            </div>

            <div className="space-y-8">
                {initialGroups.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/10">
                        <p className="text-muted-foreground">Belum ada grup daftar harga.</p>
                        <Button variant="link" onClick={() => setIsCreateOpen(true)}>
                            Buat Grup Pertama
                        </Button>
                    </div>
                ) : (
                    initialGroups.map((group) => (
                        <PriceListGroupComponent key={group.id} group={group} />
                    ))
                )}
            </div>
        </div>
    )
}
