import { useConfirmation } from '@/components/providers/modal-provider'
import { useCallback } from 'react'

export function useAlert() {
    const { showConfirmation } = useConfirmation()

    const showAlert = useCallback((message: string, title = 'Attention', action?: () => void) => {
        showConfirmation({
            title,
            message,
            type: 'alert',
            action
        })
    }, [showConfirmation])

    const showError = useCallback((message: string, action?: () => void) => {
        showConfirmation({
            title: 'Error',
            message,
            type: 'alert',
            action
        })
    }, [showConfirmation])

    return { showAlert, showError }
}
