import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    try {
        console.log('Testing hRDocument fields...')
        const doc = await (prisma as any).hRDocument.findFirst({
            include: {
                targetUsers: true
            }
        })
        console.log('Successfully queried hRDocument with targetUsers include')
        console.log('Sample doc:', JSON.stringify(doc, null, 2))
    } catch (error) {
        console.error('Error querying hRDocument:', error)
    } finally {
        await prisma.$disconnect()
    }
}

test()
