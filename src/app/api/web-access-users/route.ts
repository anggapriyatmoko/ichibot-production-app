import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const MASTER_API_URL = "http://localhost:8000/api/web-access-users";

export async function GET() {
    try {
        await requireAdmin();
        const res = await fetch(MASTER_API_URL, {
            cache: 'no-store'
        });

        if (!res.ok) throw new Error("Failed to fetch from Master API");

        const result = await res.json();
        // CI-Generate returns { success: true, data: [...] } where each item has 'id'
        // Next.js components expect 'id_admin'
        const users = (result.data || []).map((u: Record<string, unknown> & { id: number }) => ({
            ...u,
            id_admin: u.id
        }));

        return NextResponse.json(users);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: message.includes('Unauthorized') ? 401 : 403 });
    }
}

export async function POST(request: Request) {
    try {
        await requireAdmin();
        const body = await request.json();

        const res = await fetch(MASTER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await res.json();

        if (!res.ok) {
            return NextResponse.json({ error: result.message || 'Failed to create user in Master API' }, { status: res.status });
        }

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
