import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const products = await prisma.product.findMany()
    console.log('Total Products:', products.length)
    let hugeImages = 0
    for (const p of products) {
        if (p.image && p.image.length > 200) {
            console.log(`Product ${p.name} (SKU: ${p.sku}) has image length: ${p.image.length}`)
            hugeImages++
        }
    }
    if (hugeImages === 0) {
        console.log('No huge image strings found.')
    } else {
        console.log(`Found ${hugeImages} products with potentially base64 images.`)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
