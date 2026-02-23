
const WC_KEY = 'ck_5920ae8c9dee626161cce74f08c541d8a1587888';
const WC_SECRET = 'cs_9ea5354769141044b746c278eafdcd40aea63bcc';
const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

async function checkBatch(ids) {
    console.log(`Checking IDs: ${ids.join(', ')}`);
    for (let page = 1; page <= 30; page++) {
        const url = `https://store.ichibot.id/wp-json/wc/v3/products?per_page=100&page=${page}&status=any`;
        try {
            const resp = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } });
            const products = await resp.json();
            if (!Array.isArray(products) || products.length === 0) break;

            const found = products.filter(p => ids.includes(p.id));
            if (found.length > 0) {
                console.log(`Page ${page} found: ${found.map(f => f.id).join(', ')}`);
            }
        } catch (e) {
            console.error(`Error on page ${page}:`, e.message);
        }
    }
}

checkBatch([40798, 19484, 19211, 18952, 18737]);
