
/**
 * Formats a number to have a maximum of 2 decimal places.
 * Removes trailing zeros (e.g., 2.50 -> 2.5, 2.00 -> 2).
 * Use this for all quantity displays.
 */
export function formatNumber(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num)
}

/**
 * Formats a number/string to IDR currency format (without Rp symbol by default).
 * Adds dots for thousands separators.
 */
export function formatCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return 'Rp 0'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return 'Rp 0'

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num)
}

/**
 * Formats a date to a string with date and time in Indonesian locale.
 * Example: 6 Feb 2026, 23:40
 */
export function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d)
}
