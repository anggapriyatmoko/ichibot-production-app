import { syncStoreProducts } from '@/app/actions/store-product';

async function main() {
    console.log('--- STARTING MANUAL SYNC ---');
    try {
        const result = await syncStoreProducts();
        console.log('--- SYNC RESULT ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('--- SYNC FAILED ---');
        console.error(error);
    }
}

main();
