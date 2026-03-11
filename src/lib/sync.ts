export async function syncToCiGenerate(method: string, data: Record<string, unknown>) {
    try {
        const ciGenerateUrl = "http://localhost:8000/api/web-access-users"; // Replace with production domain later
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
            console.warn('Sync to CI-Generate failed:', await response.text());
        }
    } catch (error) {
        console.error('Error syncing to CI-Generate:', error);
    }
}
