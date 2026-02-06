
/**
 * Formats a number to have a maximum of 2 decimal places.
 * Removes trailing zeros (e.g., 2.50 -> 2.5, 2.00 -> 2).
 * Use this for all quantity displays.
 */
export function formatNumber(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'

    // Round to 2 decimal places to avoid floating point precision issues
    // Math.round(1.005 * 100) / 100 = 1.01
    return (Math.round((num + Number.EPSILON) * 100) / 100).toString()
}

/**
 * Formats a number/string to IDR currency format (without Rp symbol by default).
 * Adds dots for thousands separators.
 */
export function formatCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'

    return new Intl.NumberFormat('id-ID').format(num)
}
