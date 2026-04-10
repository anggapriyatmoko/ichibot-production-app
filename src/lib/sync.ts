import { getSystemSetting } from '@/app/actions/system-settings';

export async function syncToCiGenerate(method: string, data: Record<string, unknown>) {
    try {
        const endpoint = await getSystemSetting('API_ENDPOINT');
        if (!endpoint) {
            return;
        }
        const ciGenerateUrl = `${endpoint.replace(/\/$/, '')}/web-access-users`;
        const authKey = process.env.AUTH_KEY;

        let url = ciGenerateUrl;
        if (method === 'PUT' || method === 'DELETE') {
            // Find the ID mapping or use email as identifier for Laravel side
            // For now, Laravel will use email to find the user
            url = `${ciGenerateUrl}/sync-from-nextjs`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Key': authKey || '',
            },
            body: JSON.stringify({
                method,
                ...data
            }),
        });

        if (!response.ok) {
        }
    } catch (error) {
        console.error('Error syncing to CI-Generate:', error);
    }
}
