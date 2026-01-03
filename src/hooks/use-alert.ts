import { useConfirmation } from '@/components/providers/modal-provider'

export function useAlert() {
    const { showConfirmation } = useConfirmation()

    const showAlert = (message: string, title = 'Attention') => {
        showConfirmation({
            title,
            message,
            type: 'alert'
        })
    }

    const showError = (message: string) => {
        showConfirmation({
            title: 'Error',
            message,
            type: 'alert'
        })
    }

    return { showAlert, showError }
}
