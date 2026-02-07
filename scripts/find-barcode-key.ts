
const WC_URL = 'https://store.ichibot.id'
const WC_KEY = 'ck_5920ae8c9dee626161cce74f08c541d8a1587888'
const WC_SECRET = 'cs_9ea5354769141044b746c278eafdcd40aea63bcc'

async function findBarcodeKey() {
    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
    const url = `${WC_URL}/wp-json/wc/v3/products?sku=RK11-A01`

    console.log('Fetching RK11-A01 and searching for "C4-C03" in metadata values...')
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Basic ${auth}` }
        })

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText)
            return
        }

        const products = await response.json()
        if (products.length === 0) {
            console.log('SKU RK11-A01 not found. Trying keyword search...')
            const searchUrl = `${WC_URL}/wp-json/wc/v3/products?search=ESP8266`
            const searchRes = await fetch(searchUrl, { headers: { 'Authorization': `Basic ${auth}` } })
            const searchProducts = await searchRes.json()
            searchProducts.forEach(analyze)
        } else {
            analyze(products[0])
        }

        function analyze(p: any) {
            console.log(`\nProduct: ${p.name} (SKU: ${p.sku})`)
            p.meta_data.forEach((m: any) => {
                const val = String(m.value)
                if (val.includes('C4') || val.includes('C03') || m.key.toLowerCase().includes('barcode')) {
                    console.log(`FOUND: [${m.key}] = ${m.value}`)
                }
            })
        }
    } catch (error: any) {
        console.error('Error:', error.message)
    }
}

findBarcodeKey()
