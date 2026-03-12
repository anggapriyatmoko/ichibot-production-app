import { NextResponse } from 'next/server';

const MASTER_VERIFY_URL = "http://localhost:8000/api/web-access-users/verify";

export async function POST(request: Request) {
    try {
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
