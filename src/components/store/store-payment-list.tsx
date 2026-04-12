'use client'

import { useState, useMemo } from 'react'
import { Search, X, RefreshCw, Trash2, CreditCard, Plus, Loader2, Link2, Copy, Check, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/utils/format'
import { checkPaymentStatus, deletePayment } from '@/app/actions/store-payment'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/modal'
import CreatePaymentModal from './create-payment-modal'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableHeaderContent,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TablePagination,
    TableMobileCard,
    TableMobileCardHeader,
    TableMobileCardContent,
    TableMobileCardFooter
} from '@/components/ui/table'

export interface Payment {
    id: string
    invoiceNumber: string
    nama: string
    tanggal: string
    keterangan: string
    nominal: number
    status: 'pending' | 'lunas' | 'gagal' | 'expired'
    paymentUrl?: string
}

interface StorePaymentListProps {
    initialPayments?: Payment[]
}

const statusConfig: Record<string, { label: string; bg: string }> = {
    pending: { label: 'Pending', bg: '#ea580c' },
    lunas: { label: 'Lunas', bg: '#16a34a' },
    gagal: { label: 'Gagal', bg: '#dc2626' },
    expired: { label: 'Expired', bg: '#4b5563' },
}

function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.pending
    return (
        <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm"
            style={{ backgroundColor: config.bg, color: '#fff' }}
        >
            {config.label}
        </span>
    )
}

export default function StorePaymentList({ initialPayments = [] }: StorePaymentListProps) {
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const itemsPerPage = 20
    const [linkPayment, setLinkPayment] = useState<{ nama: string; invoiceNumber: string; url: string } | null>(null)
    const [linkCopied, setLinkCopied] = useState(false)
    const { showError, showAlert } = useAlert()
    const { showConfirmation } = useConfirmation()
    const router = useRouter()


    const handleCopyLink = async (url: string) => {
        await navigator.clipboard.writeText(url)
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
    }

    const filtered = useMemo(() => {
        let data = initialPayments

        if (statusFilter !== 'all') {
            data = data.filter(p => p.status === statusFilter)
        }

        if (search.trim()) {
            const q = search.toLowerCase()
            data = data.filter(p =>
                p.nama.toLowerCase().includes(q) ||
                p.keterangan.toLowerCase().includes(q) ||
                p.invoiceNumber.toLowerCase().includes(q)
            )
        }

        return data
    }, [initialPayments, search, statusFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const handleCheckStatus = async (invoiceNumber: string, id: string) => {
        setLoadingId(id)
        try {
            const res = await checkPaymentStatus(invoiceNumber)
            if (res.success) {
                showAlert(`Status: ${res.data?.status || 'pending'}`, 'Status Payment')
                router.refresh()
            } else {
                showError(res.error || 'Gagal cek status')
            }
        } catch {
            showError('Gagal cek status')
        } finally {
            setLoadingId(null)
        }
    }

    const handleDelete = (payment: Payment) => {
        if (payment.status !== 'pending' && payment.status !== 'expired') {
            showError('Hanya payment pending/expired yang bisa dihapus')
            return
        }
        showConfirmation({
            title: 'Hapus Payment',
            message: `Yakin ingin menghapus payment "${payment.nama}" (${payment.invoiceNumber})?`,
            type: 'confirm',
            action: async () => {
                const res = await deletePayment(payment.id)
                if (res.success) {
                    router.refresh()
                } else {
                    showError(res.error || 'Gagal menghapus')
                }
            },
        })
    }

    return (
        <>
            <TableWrapper>
                <TableHeaderContent
                    title="Daftar Payment"
                    description={`${filtered.length} data payment`}
                    icon={<CreditCard className="w-5 h-5" />}
                    actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Buat Payment
                            </button>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari nama, invoice, keterangan..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                                    className="w-full sm:w-64 pl-9 pr-9 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                    </button>
                                )}
                            </div>
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                                className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="all">Semua Status</option>
                                <option value="pending">Pending</option>
                                <option value="lunas">Lunas</option>
                                <option value="gagal">Gagal</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    }
                />

                {/* Desktop Table */}
                <TableScrollArea className="hidden md:block">
                    <Table className="table-fixed min-w-[1000px]">
                        <colgroup>
                            <col className="w-[5%]" />
                            <col className="w-[22%]" />
                            <col className="w-[12%]" />
                            <col className="w-[20%]" />
                            <col className="w-[15%]" />
                            <col className="w-[12%]" />
                            <col className="w-[14%]" />
                        </colgroup>
                        <TableHeader>
                            <TableRow>
                                <TableHead align="center">No</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead align="right">Nominal</TableHead>
                                <TableHead align="center">Status</TableHead>
                                <TableHead align="center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableEmpty colSpan={7} message="Belum ada data payment" />
                            ) : (
                                paginated.map((payment, idx) => (
                                    <TableRow key={payment.id}>
                                        <TableCell align="center" className="text-muted-foreground">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{payment.nama}</p>
                                                <p className="text-xs text-muted-foreground">{payment.invoiceNumber}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{payment.tanggal}</TableCell>
                                        <TableCell className="text-muted-foreground truncate">{payment.keterangan}</TableCell>
                                        <TableCell align="right" className="font-mono">{formatCurrency(payment.nominal)}</TableCell>
                                        <TableCell align="center">
                                            <StatusBadge status={payment.status} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <div className="flex items-center justify-center gap-1">
                                                {payment.paymentUrl && (
                                                    <button
                                                        onClick={() => setLinkPayment({ nama: payment.nama, invoiceNumber: payment.invoiceNumber, url: payment.paymentUrl! })}
                                                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                                        title="Lihat Link Pembayaran"
                                                    >
                                                        <Link2 className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                )}
                                                {payment.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCheckStatus(payment.invoiceNumber, payment.id)}
                                                        disabled={loadingId === payment.id}
                                                        className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                                                        title="Cek Status"
                                                    >
                                                        {loadingId === payment.id
                                                            ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                            : <RefreshCw className="w-4 h-4 text-muted-foreground" />
                                                        }
                                                    </button>
                                                )}
                                                {(payment.status === 'pending' || payment.status === 'expired') && (
                                                    <button
                                                        onClick={() => handleDelete(payment)}
                                                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableScrollArea>

                {/* Mobile Cards */}
                <div className="md:hidden">
                    {paginated.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">Belum ada data payment</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {paginated.map((payment) => (
                                <TableMobileCard key={payment.id}>
                                    <TableMobileCardHeader>
                                        <div className="flex items-center justify-between w-full">
                                            <div>
                                                <span className="font-medium text-sm">{payment.nama}</span>
                                                <p className="text-xs text-muted-foreground">{payment.invoiceNumber}</p>
                                            </div>
                                            <StatusBadge status={payment.status} />
                                        </div>
                                    </TableMobileCardHeader>
                                    <TableMobileCardContent>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Tanggal</span>
                                                <p>{payment.tanggal}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Nominal</span>
                                                <p className="font-mono">{formatCurrency(payment.nominal)}</p>
                                            </div>
                                        </div>
                                        {payment.keterangan && (
                                            <div className="text-sm mt-2">
                                                <span className="text-muted-foreground">Keterangan</span>
                                                <p>{payment.keterangan}</p>
                                            </div>
                                        )}
                                    </TableMobileCardContent>
                                    <TableMobileCardFooter>
                                        <div className="flex items-center gap-2">
                                            {payment.paymentUrl && (
                                                <button
                                                    onClick={() => setLinkPayment({ nama: payment.nama, invoiceNumber: payment.invoiceNumber, url: payment.paymentUrl! })}
                                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                                    title="Lihat Link Pembayaran"
                                                >
                                                    <Link2 className="w-4 h-4 text-blue-500" />
                                                </button>
                                            )}
                                            {payment.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCheckStatus(payment.invoiceNumber, payment.id)}
                                                    disabled={loadingId === payment.id}
                                                    className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                                                    title="Cek Status"
                                                >
                                                    {loadingId === payment.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                        : <RefreshCw className="w-4 h-4 text-muted-foreground" />
                                                    }
                                                </button>
                                            )}
                                            {(payment.status === 'pending' || payment.status === 'expired') && (
                                                <button
                                                    onClick={() => handleDelete(payment)}
                                                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </button>
                                            )}
                                        </div>
                                    </TableMobileCardFooter>
                                </TableMobileCard>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filtered.length > itemsPerPage && (
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalCount={filtered.length}
                        itemsPerPage={itemsPerPage}
                    />
                )}
            </TableWrapper>

            <CreatePaymentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />

            {/* Link Payment Modal */}
            <Modal
                isOpen={!!linkPayment}
                onClose={() => { setLinkPayment(null); setLinkCopied(false) }}
                title="Link Pembayaran"
                maxWidth="md"
            >
                {linkPayment && (
                    <div className="space-y-3">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Nama:</span>{' '}
                            <span className="font-medium">{linkPayment.nama}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Invoice:</span>{' '}
                            <span className="font-medium">{linkPayment.invoiceNumber}</span>
                        </div>
                        <div>
                            <label className="block text-sm text-muted-foreground mb-1">Link</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={linkPayment.url}
                                    className="flex-1 px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg truncate"
                                />
                                <button
                                    onClick={() => handleCopyLink(linkPayment.url)}
                                    className="px-3 py-2 text-sm font-medium bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    {linkCopied ? 'Tersalin' : 'Salin'}
                                </button>
                            </div>
                        </div>
                        <a
                            href={linkPayment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Buka Halaman Pembayaran
                        </a>
                    </div>
                )}
            </Modal>
        </>
    )
}
