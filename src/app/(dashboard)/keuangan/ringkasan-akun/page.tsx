import { requireAuth, isAllowedForPage } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getBankAccounts } from '@/app/actions/bank-account'
import AccountSummaryList from '@/components/keuangan/account-summary'
import { Suspense } from 'react'
import { Building2 } from 'lucide-react'

import { getSystemSetting } from '@/app/actions/system-settings'

export const dynamic = 'force-dynamic'

async function BankAccountsContent() {
    const [accounts, kursYuanStr, kursUsdStr] = await Promise.all([
        getBankAccounts(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD')
    ]);

    const kursYuan = kursYuanStr ? parseFloat(kursYuanStr) : 0;
    const kursUsd = kursUsdStr ? parseFloat(kursUsdStr) : 0;

    return <AccountSummaryList initialData={accounts} kursYuan={kursYuan} kursUsd={kursUsd} />
}

export default async function RingkasanAkunPage() {
    const session = await requireAuth()
    const allowed = await isAllowedForPage('/keuangan/ringkasan-akun')
    if (!allowed) redirect('/dashboard')

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Ringkasan Akun Bank</h1>
                <p className="text-muted-foreground">
                    Kelola dan pantau seluruh akun finansial Anda di satu tempat.
                </p>
            </div>

            <Suspense fallback={
                <div className="flex animate-pulse flex-col space-y-4">
                    <div className="h-10 bg-muted/50 rounded-lg w-1/4"></div>
                    <div className="h-[400px] bg-card rounded-xl border border-border"></div>
                </div>
            }>
                <BankAccountsContent />
            </Suspense>
        </div>
    )
}
