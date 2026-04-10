import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSystemSetting } from '@/app/actions/system-settings';

async function getMasterApiUrl() {
    const endpoint = await getSystemSetting('API_ENDPOINT');
    if (!endpoint) throw new Error('API Endpoint belum dikonfigurasi di Settings');
    return `${endpoint.replace(/\/$/, '')}/web-access-users`;
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();
        const MASTER_API_URL = await getMasterApiUrl();
        const { id } = await params;
        const body = await request.json();

        const res = await fetch(`${MASTER_API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await res.json();

        if (!res.ok) {
            return NextResponse.json({ error: result.message || 'Failed to update user in Master API' }, { status: res.status });
        }

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();
        const MASTER_API_URL = await getMasterApiUrl();
        const { id } = await params;

        const res = await fetch(`${MASTER_API_URL}/${id}`, {
            method: 'DELETE',
        });

        const result = await res.json();

        if (!res.ok) {
            return NextResponse.json({ error: result.message || 'Failed to delete user in Master API' }, { status: res.status });
        }

        return NextResponse.json({ message: 'Admin deleted successfully' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
