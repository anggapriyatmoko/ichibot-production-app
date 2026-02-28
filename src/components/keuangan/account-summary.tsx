'use client'

import { useState } from 'react'
import { Plus, Building2, Edit2, Trash2, Wallet, Info, Activity } from 'lucide-react'
import { BankAccountData, deleteBankAccount } from '@/app/actions/bank-account'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import AccountFormModal from './account-form-modal'
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TableHeaderContent
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export default function AccountSummaryList({
    initialData,
    kursYuan = 0,
    kursUsd = 0
}: {
    initialData: BankAccountData[],
    kursYuan?: number,
    kursUsd?: number
}) {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<BankAccountData | null>(null)
    const { showError } = useAlert()
    const { showConfirmation } = useConfirmation()

    const getBalanceInIdr = (account: BankAccountData) => {
        if (account.currency === 'USD') return account.balance * kursUsd
        if (account.currency === 'CNY') return account.balance * kursYuan
        return account.balance
    }

    const totalBalance = initialData.reduce((acc, curr) => acc + getBalanceInIdr(curr), 0)

    const handleDelete = (account: BankAccountData) => {
        showConfirmation({
            title: 'Hapus Akun',
            message: `Apakah Anda yakin ingin menghapus akun ${account.bankName} - ${account.accountNumber}?`,
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            type: 'confirm',
            action: async () => {
                const result = await deleteBankAccount(account.id)
                if (!result.success) {
                    showError(result.error || 'Gagal menghapus akun')
                }
            }
        })
    }

    const openEditForm = (account: BankAccountData) => {
        setEditingAccount(account)
        setIsFormModalOpen(true)
    }

    return (
        <div className="space-y-6">
            <TableWrapper>
                <TableHeaderContent
                    title="Ringkasan Akun Bank"
                    description="Kelola seluruh akun bank dan pantau distribusi saldo."
                    icon={<Building2 className="w-5 h-5 font-bold" />}
                    actions={
                        <button
                            onClick={() => {
                                setEditingAccount(null)
                                setIsFormModalOpen(true)
                            }}
                            className="flex items-center justify-center gap-2 px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 shadow-sm whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Akun
                        </button>
                    }
                />

                <TableScrollArea className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Bank</TableHead>
                                <TableHead>Atas Nama</TableHead>
                                <TableHead>No. Rekening</TableHead>
                                <TableHead align="right">Saldo</TableHead>
                                <TableHead align="center" className="w-[120px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialData.length > 0 ? (
                                initialData.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground">{account.bankName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-foreground">{account.accountName}</span>
                                        </TableCell>
                                        <TableCell>
                                            {account.accountNumber ? (
                                                <span className="font-mono text-sm text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                                    {account.accountNumber}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm italic">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-lg text-primary">
                                                    {account.currency === 'USD' ? '$' : account.currency === 'CNY' ? '¥' : 'Rp'}{' '}
                                                    {formatNumber(account.balance)}
                                                </span>
                                                {account.currency !== 'IDR' && (
                                                    <span className="text-xs text-muted-foreground font-medium mt-0.5">
                                                        (Rp {formatNumber(getBalanceInIdr(account))})
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                                    Diperbarui: {formatDateTime(account.updatedAt)}, {
                                                        (() => {
                                                            const now = new Date();
                                                            const updated = new Date(account.updatedAt);

                                                            // Set both dates to midnight to compare calendar days
                                                            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                                            const updatedMidnight = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());

                                                            const diffMs = todayMidnight.getTime() - updatedMidnight.getTime();
                                                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                                                            if (diffDays === 0) return 'hari ini';
                                                            if (diffDays === 1) return 'kemarin';
                                                            return `${diffDays} hari yang lalu`;
                                                        })()
                                                    }
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell align="center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => openEditForm(account)}
                                                    className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Edit Akun"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(account)}
                                                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Hapus Akun"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableEmpty
                                    colSpan={5}
                                    icon={<Building2 className="w-12 h-12 opacity-10" />}
                                    message="Belum ada akun bank"
                                    description={<p>Klik "Tambah Akun" untuk mulai mencatat saldo.</p>}
                                />
                            )}
                        </TableBody>
                    </Table>
                </TableScrollArea>

                {/* Mobile View (List) */}
                <div className="block md:hidden mt-4">
                    {initialData.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-border border-dashed mx-4">
                            Belum ada akun bank
                        </div>
                    ) : (
                        <div className="divide-y divide-border border-t border-b border-border">
                            {initialData.map((account) => (
                                <div key={account.id} className="py-4 px-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-foreground text-sm leading-tight">{account.bankName}</h4>
                                            <p className="font-medium text-foreground text-xs">{account.accountName}</p>
                                            <div className="mt-1">
                                                {account.accountNumber ? (
                                                    <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                                        {account.accountNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">-</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="font-bold text-foreground text-sm whitespace-nowrap">
                                                {account.currency === 'USD' ? '$' : account.currency === 'CNY' ? '¥' : 'Rp'}{' '}
                                                {formatNumber(account.balance)}
                                            </span>
                                            {account.currency !== 'IDR' && (
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    (Rp {formatNumber(getBalanceInIdr(account))})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-1">
                                        <div className="text-[10px] text-muted-foreground">
                                            Diperbarui: {formatDateTime(account.updatedAt)}, {
                                                (() => {
                                                    const now = new Date();
                                                    const updated = new Date(account.updatedAt);

                                                    // Set both dates to midnight to compare calendar days
                                                    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                                    const updatedMidnight = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());

                                                    const diffMs = todayMidnight.getTime() - updatedMidnight.getTime();
                                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                                                    if (diffDays === 0) return 'hari ini';
                                                    if (diffDays === 1) return 'kemarin';
                                                    return `${diffDays} hari yang lalu`;
                                                })()
                                            }
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditForm(account)}
                                                className="p-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-md transition-colors flex items-center gap-1"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-medium hidden sm:inline">Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(account)}
                                                className="p-1.5 text-red-600 bg-red-50/50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors flex items-center gap-1"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </TableWrapper>

            {/* Analytics Section */}
            {initialData.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Analisis Saldo</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 p-5 rounded-xl bg-primary/5 border border-primary/10 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-2 text-primary">
                                <Wallet className="w-4 h-4" />
                                <h3 className="text-sm font-semibold uppercase tracking-wider">Total Saldo Gabungan</h3>
                            </div>
                            <span className="text-3xl font-black text-primary break-words">
                                {formatCurrency(totalBalance)}
                            </span>
                            <div className="mt-3 flex gap-2 p-2 bg-muted/50 rounded text-xs items-center">
                                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground leading-tight">Total dari {initialData.length} akun bank aktif.</span>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Distribusi Aset</h3>
                            <div className="space-y-3">
                                {initialData.map((account) => {
                                    const accountBalanceIdr = getBalanceInIdr(account)
                                    const percentage = totalBalance > 0 ? (accountBalanceIdr / totalBalance) * 100 : 0
                                    return (
                                        <div key={account.id} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-semibold text-foreground truncate max-w-[200px]" title={account.accountNumber ? `${account.bankName} - ${account.accountNumber}` : account.bankName}>
                                                    {account.bankName}
                                                    {account.accountNumber && (
                                                        <span className="text-muted-foreground font-normal text-xs ml-1">
                                                            ({account.accountNumber.length > 4 ? account.accountNumber.slice(-4) : account.accountNumber})
                                                        </span>
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground">
                                                        {account.currency === 'USD' ? '$' : account.currency === 'CNY' ? '¥' : 'Rp'}{' '}
                                                        {formatNumber(account.balance)}
                                                        {account.currency !== 'IDR' && <span className="text-muted-foreground text-xs ml-1 font-normal">(Rp {formatNumber(accountBalanceIdr)})</span>}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs w-10 text-right">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", percentage > 50 ? 'bg-primary' : percentage > 20 ? 'bg-blue-500' : 'bg-emerald-500')}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AccountFormModal
                isOpen={isFormModalOpen}
                initialData={editingAccount}
                onClose={() => setIsFormModalOpen(false)}
                kursYuan={kursYuan}
                kursUsd={kursUsd}
            />
        </div>
    )
}
