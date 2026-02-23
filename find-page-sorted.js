
const WC_KEY = 'ck_5920ae8c9dee626161cce74f08c541d8a1587888';
const WC_SECRET = 'cs_9ea5354769141044b746c278eafdcd40aea63bcc';
const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

async function findPageSorted(targetId) {
    for (let page = 1; page <= 30; page++) {
        const url = `https://store.ichibot.id/wp-json/wc/v3/products?per_page=100&page=${page}&status=any&orderby=id&order=asc`;
        console.log(`Checking page ${page} (sorted by ID)...`);
        try {
            const resp = await fetch(url, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            const products = await resp.json();
            if (!Array.isArray(products) || products.length === 0) break;

            const found = products.find(p => p.id === targetId);
            if (found) {
                console.log(`FOUND_ON_PAGE: ${page}`);
                return;
            }
        } catch (e) {
            console.error(`Error on page ${page}:`, e.message);
        }
    }
    console.log('NOT_FOUND_IN_ANY_PAGE_SORTED_BY_ID');
}

findPageSorted(40798);
