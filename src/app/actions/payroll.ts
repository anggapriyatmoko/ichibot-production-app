'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import { encrypt, decrypt } from '@/lib/crypto'

// Helper to encrypt a number value
function encryptNumber(value: number): string {
    return encrypt(value.toString()) || ''
}

// Helper to decrypt to a number
function decryptNumber(encryptedValue: string | null | undefined): number {
    const decrypted = decrypt(encryptedValue)
    return decrypted ? parseFloat(decrypted) : 0
}

// Helper to save file
async function saveFile(file: File, oldPath?: string | null): Promise<string> {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine upload directory - use environment variable or default
    // In production (Docker), we expect a volume mount at /app/uploads
    let baseUploadDir = process.env.UPLOAD_DIR
    if (!baseUploadDir) {
        baseUploadDir = path.join(process.cwd(), 'uploads')
        // Fallback for local dev if 'uploads' doesn't exist but 'public/uploads' does
        if (!fs.existsSync(baseUploadDir) && fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
            baseUploadDir = path.join(process.cwd(), 'public', 'uploads')
        }
    }

    const uploadDir = path.join(baseUploadDir, 'salary-slips')
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filename = `${uuidv4()}-${file.name.replace(/\s+/g, '-')}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    // Return path for API route access
    const relativePath = `/api/uploads/salary-slips/${filename}`

    // Delete old file if exists
    if (oldPath) {
        try {
            // Handle both old public path and new API path
            let oldFilename = oldPath
            if (oldPath.startsWith('/api/uploads/salary-slips/')) {
                oldFilename = oldPath.replace('/api/uploads/salary-slips/', '')
            } else if (oldPath.startsWith('/uploads/salary-slips/')) {
                oldFilename = oldPath.replace('/uploads/salary-slips/', '')
            }
            const oldFilepath = path.join(uploadDir, oldFilename)
            if (fs.existsSync(oldFilepath)) {
                await unlink(oldFilepath)
            }
        } catch (error) {
            console.error('Error deleting old salary slip:', error)
        }
    }

    return relativePath
}

export async function upsertPayroll(formData: FormData) {
    try {
        const userId = formData.get('userId') as string
        const month = parseInt(formData.get('month') as string)
        const year = parseInt(formData.get('year') as string)
        const basicSalary = parseFloat(formData.get('basicSalary') as string)
        const salarySlipFile = formData.get('salarySlip') as File | null
        const removeSalarySlip = formData.get('removeSalarySlip') === 'true'

        // Parse dynamic items
        const rawItems = formData.get('items') as string
        const items = JSON.parse(rawItems) as { componentId: string, amount: number }[]

        // Check if payroll exists
        const existingPayroll = await prisma.payroll.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month,
                    year
                }
            }
        })

        let salarySlipPath = existingPayroll?.salarySlipEnc ? decrypt(existingPayroll.salarySlipEnc) : null

        // Handle file removal
        if (removeSalarySlip && salarySlipPath) {
            try {
                // Determine upload directory
                let baseUploadDir = process.env.UPLOAD_DIR
                if (!baseUploadDir) {
                    baseUploadDir = path.join(process.cwd(), 'uploads')
                    if (!fs.existsSync(baseUploadDir) && fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
                        baseUploadDir = path.join(process.cwd(), 'public', 'uploads')
                    }
                }
                const salarySlipsDir = path.join(baseUploadDir, 'salary-slips')

                // Extract filename
                let filename = salarySlipPath
                if (salarySlipPath.startsWith('/api/uploads/salary-slips/')) {
                    filename = salarySlipPath.replace('/api/uploads/salary-slips/', '')
                } else if (salarySlipPath.startsWith('/uploads/salary-slips/')) {
                    filename = salarySlipPath.replace('/uploads/salary-slips/', '')
                }

                const oldFilepath = path.join(salarySlipsDir, filename)
                if (fs.existsSync(oldFilepath)) {
                    await unlink(oldFilepath)
                }
            } catch (error) {
                console.error('Error deleting salary slip:', error)
            }
            salarySlipPath = null
        }

        // Handle file upload
        if (salarySlipFile && salarySlipFile.size > 0) {
            salarySlipPath = await saveFile(salarySlipFile, salarySlipPath)
        }

        // Calculate Net Salary
        // Net = Basic + Additions - Deductions
        let netSalary = basicSalary

        // Fetch component types to calculate net salary correctly
        const components = await prisma.salaryComponent.findMany({
            where: {
                id: {
                    in: items.map(i => i.componentId)
                }
            }
        })

        const componentMap = new Map(components.map(c => [c.id, c.type]))

        for (const item of items) {
            const type = componentMap.get(item.componentId)
            if (type === 'ADDITION') {
                netSalary += item.amount
            } else if (type === 'DEDUCTION') {
                netSalary -= item.amount
            }
        }

        // Transaction to update payroll and items
        await prisma.$transaction(async (tx) => {
            // Upsert Payroll with encrypted values
            const payroll = await tx.payroll.upsert({
                where: {
                    userId_month_year: {
                        userId,
                        month,
                        year
                    }
                },
                create: {
                    userId,
                    month,
                    year,
                    monthEnc: encryptNumber(month),
                    yearEnc: encryptNumber(year),
                    basicSalaryEnc: encryptNumber(basicSalary),
                    netSalaryEnc: encryptNumber(netSalary),
                    salarySlipEnc: encrypt(salarySlipPath)
                },
                update: {
                    monthEnc: encryptNumber(month),
                    yearEnc: encryptNumber(year),
                    basicSalaryEnc: encryptNumber(basicSalary),
                    netSalaryEnc: encryptNumber(netSalary),
                    salarySlipEnc: encrypt(salarySlipPath)
                }
            })

            // Update Items: Delete all and recreate
            await tx.payrollItem.deleteMany({
                where: {
                    payrollId: payroll.id
                }
            })

            if (items.length > 0) {
                await tx.payrollItem.createMany({
                    data: items.map(item => ({
                        payrollId: payroll.id,
                        componentId: item.componentId,
                        amountEnc: encryptNumber(item.amount)
                    }))
                })
            }
        })

        revalidatePath('/hrd-dashboard')
        revalidatePath('/dashboard') // In case user views their own salary
        return { success: true }
    } catch (error) {
        console.error('Error upserting payroll:', error)
        return { success: false, error: 'Failed to save payroll data' }
    }
}

export async function getPayroll(userId: string, month: number, year: number) {
    try {
        const payroll = await prisma.payroll.findUnique({
            where: {
                userId_month_year: {
                    userId,
                    month,
                    year
                }
            },
            include: {
                items: {
                    include: {
                        component: true
                    }
                }
            }
        })

        if (!payroll) {
            return { success: true, data: null }
        }

        // Decrypt salary data for frontend consumption
        const decryptedPayroll = {
            ...payroll,
            basicSalary: decryptNumber(payroll.basicSalaryEnc),
            netSalary: decryptNumber(payroll.netSalaryEnc),
            salarySlip: decrypt(payroll.salarySlipEnc),
            items: payroll.items.map(item => ({
                ...item,
                amount: decryptNumber(item.amountEnc)
            }))
        }

        return { success: true, data: decryptedPayroll }
    } catch (error) {
        console.error('Error fetching payroll:', error)
        return { success: false, error: 'Failed to fetch payroll' }
    }
}

export async function deletePayroll(id: string) {
    try {
        const payroll = await prisma.payroll.findUnique({
            where: { id }
        })

        // Decrypt and delete salary slip file if exists
        if (payroll?.salarySlipEnc) {
            const salarySlipPath = decrypt(payroll.salarySlipEnc)
            if (salarySlipPath) {
                try {
                    // Determine upload directory
                    let baseUploadDir = process.env.UPLOAD_DIR
                    if (!baseUploadDir) {
                        baseUploadDir = path.join(process.cwd(), 'uploads')
                        if (!fs.existsSync(baseUploadDir) && fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
                            baseUploadDir = path.join(process.cwd(), 'public', 'uploads')
                        }
                    }
                    const salarySlipsDir = path.join(baseUploadDir, 'salary-slips')

                    // Extract filename
                    let filename = salarySlipPath
                    if (salarySlipPath.startsWith('/api/uploads/salary-slips/')) {
                        filename = salarySlipPath.replace('/api/uploads/salary-slips/', '')
                    } else if (salarySlipPath.startsWith('/uploads/salary-slips/')) {
                        filename = salarySlipPath.replace('/uploads/salary-slips/', '')
                    }

                    const oldFilepath = path.join(salarySlipsDir, filename)
                    if (fs.existsSync(oldFilepath)) {
                        await unlink(oldFilepath)
                    }
                } catch (error) {
                    console.error('Error deleting salary slip:', error)
                }
            }
        }

        await prisma.payroll.delete({
            where: { id }
        })

        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting payroll:', error)
        return { success: false, error: 'Failed to delete payroll' }
    }
}

export async function getMonthlyPayrollRecap(month: number, year: number) {
    try {
        // Get all users with roles that should have payroll (excluding maybe super admins if needed, 
        // but for now let's get all active users or filter by role if required)
        // We want ALL users, and attach their payroll if it exists for this month/year.

        const users = await prisma.user.findMany({
            where: {
                role: {
                    in: ['USER', 'HRD', 'TEKNISI', 'ADMIN'] // All roles
                }
            },
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true,
                role: true,
                department: true,
                payrolls: {
                    where: {
                        month,
                        year
                    },
                    include: {
                        items: {
                            include: {
                                component: true
                            }
                        }
                    }
                }
            }
        })

        // Transform data with decryption
        const data = users.map(userItem => {
            const user = userItem as any
            const payroll = user.payrolls[0] || null
            let totalDeductions = 0
            let totalAdditions = 0

            if (payroll) {
                payroll.items.forEach((item: any) => {
                    // Decrypt the amount
                    const decryptedAmount = decryptNumber(item.amountEnc)
                    if (item.component.type === 'DEDUCTION') {
                        totalDeductions += decryptedAmount
                    } else if (item.component.type === 'ADDITION') {
                        totalAdditions += decryptedAmount
                    }
                })
            }

            return {
                id: user.id,
                payrollId: payroll?.id,
                name: user.name,
                role: user.role,
                department: user.department,
                hasPayroll: !!payroll,
                basicSalary: payroll ? decryptNumber(payroll.basicSalaryEnc) : 0,
                totalDeductions,
                totalAdditions,
                netSalary: payroll ? decryptNumber(payroll.netSalaryEnc) : 0,
                salarySlip: payroll?.salarySlipEnc ? decrypt(payroll.salarySlipEnc) : null,
                items: payroll?.items?.map((item: any) => ({
                    ...item,
                    amount: decryptNumber(item.amountEnc)
                })) || []
            }
        })

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching monthly recap:', error)
        return { success: false, error: 'Failed to fetch recap' }
    }
}
