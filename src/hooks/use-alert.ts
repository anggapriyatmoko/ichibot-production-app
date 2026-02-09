import { useConfirmation } from '@/components/providers/modal-provider'
import { useCallback } from 'react'

export function useAlert() {
    const { showConfirmation } = useConfirmation()

    const showAlert = useCallback((message: string, title = 'Attention') => {
        showConfirmation({
            title,
            message,
            type: 'alert'
        })
    }, [showConfirmation])

    const showError = useCallback((message: string) => {
        showConfirmation({
            title: 'Error',
            message,
            type: 'alert'
        })
    }, [showConfirmation])

    return { showAlert, showError }
}
