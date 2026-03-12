import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const authKey = request.headers.get('X-Auth-Key');

        if (!authKey || authKey !== process.env.AUTH_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { method, email, username, password, id } = await request.json();

        if (method === 'POST' || method === 'PUT') {
            // Upsert user
            const user = await (prisma as any).webAccessUser.upsert({
                where: { email },
                update: {
                    username,
                    password, // Already hashed from CI-Generate
                },
                create: {
                    email,
                    username,
                    password, // Already hashed from CI-Generate
                },
            });
            return NextResponse.json({ success: true, user });
        }

        if (method === 'DELETE') {
            await (prisma as any).webAccessUser.deleteMany({
                where: { email },
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Method not supported' }, { status: 400 });

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
