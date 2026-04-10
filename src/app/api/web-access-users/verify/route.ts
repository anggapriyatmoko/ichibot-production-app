import { NextResponse } from 'next/server';
import { getSystemSetting } from '@/app/actions/system-settings';

export async function POST(request: Request) {
    try {
        const endpoint = await getSystemSetting('API_ENDPOINT');
        if (!endpoint) {
            return NextResponse.json({ error: 'API Endpoint belum dikonfigurasi di Settings' }, { status: 500 });
        }
        const MASTER_VERIFY_URL = `${endpoint.replace(/\/$/, '')}/web-access-users/verify`;

        const body = await request.json();

        // Proxy the request to CI-Generate
        const res = await fetch(MASTER_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await res.json();

        if (!res.ok) {
            return NextResponse.json({ error: result.message || 'Verification failed in Master API' }, { status: res.status });
        }

        // Return user info in the format expected by clients
        return NextResponse.json({
            success: true,
            user: result.data // result.data contains {id, username, email}
        });

    } catch (error: unknown) {
        console.error('Login verification proxy error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
