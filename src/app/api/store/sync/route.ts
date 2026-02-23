
import { NextRequest } from 'next/server';
import { performStoreSync } from '@/app/actions/store-product';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendLog = (message: string) => {
                const data = JSON.stringify({ message, timestamp: new Date().toISOString() });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            try {
                sendLog('Inisialisasi koneksi sinkronisasi...');
                const result = await performStoreSync(sendLog);

                if (result.success) {
                    sendLog(`Selesai: ${result.count} produk disinkronkan.`);
                } else {
                    sendLog(`Gagal: ${result.error}`);
                }
            } catch (error: any) {
                sendLog(`Gagal total: ${error.message}`);
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
