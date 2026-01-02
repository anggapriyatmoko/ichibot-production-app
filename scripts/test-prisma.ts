
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking Prisma Client...')
    try {
        // Check if models exist on the instance
        if (prisma.recipe) {
            console.log('SUCCESS: prisma.recipe exists')
        } else {
            console.error('FAILURE: prisma.recipe matches undefined')
        }

        if (prisma.recipeSection) {
            console.log('SUCCESS: prisma.recipeSection exists')
        } else {
            console.error('FAILURE: prisma.recipeSection matches undefined')
        }

        // Try a simple count
        const count = await prisma.recipe.count()
        console.log(`Current recipe count: ${count}`)

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
