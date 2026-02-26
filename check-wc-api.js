const fs = require('fs');

async function testWc() {
  const url = process.env.NEXT_PUBLIC_WC_URL + '/wp-json/wc/v3/products?per_page=1';
  console.log(url);
  const auth = Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  const data = await res.json();
  console.log(JSON.stringify(data[0].images, null, 2));
}

testWc();
