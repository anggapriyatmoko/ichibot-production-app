import StorePaymentList from '@/components/store/store-payment-list';
import { getPayments } from '@/app/actions/store-payment';
import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

async function StorePaymentContent() {
    const result = await getPayments();
    const payments = result.success ? result.data : [];

    return <StorePaymentList initialPayments={payments} />;
}

export default async function StorePaymentPage() {
    const session = await requireAuth();
    const allowed = await isAllowedForPage('/store/payment');
    if (!allowed) {
        redirect('/dashboard');
    }

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Payment</h1>
                <p className="text-muted-foreground">Kelola data pembayaran store</p>
            </div>

            <Suspense fallback={<StoreSkeleton showSyncButton={false} />}>
                <StorePaymentContent />
            </Suspense>
        </div>
    );
}
