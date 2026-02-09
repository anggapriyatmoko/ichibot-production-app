// Status labels for display
export const RESI_STATUS_LABELS: Record<string, string> = {
    pending: 'Menunggu',
    processing: 'Diproses',
    shipped: 'Dikirim',
    delivered: 'Terkirim',
    cancelled: 'Dibatalkan'
}

// Status colors for badges
export const RESI_STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

// Status options for dropdowns
export const RESI_STATUS_OPTIONS = [
    { value: 'pending', label: 'Menunggu' },
    { value: 'processing', label: 'Diproses' },
    { value: 'shipped', label: 'Dikirim' },
    { value: 'delivered', label: 'Terkirim' },
    { value: 'cancelled', label: 'Dibatalkan' },
]

// Re-export ResiFormData type alias for backward compatibility
export type ResiData = {
    sender_name: string
    sender_phone: string
    sender_address: string
    receiver_name: string
    receiver_phone: string
    receiver_address: string
    courier_id?: number | null
    notes?: string
    tracking_number?: string
    status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
}
