'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseIdleTimeoutOptions {
    /** Timeout duration in milliseconds (default: 1 hour) */
    timeout?: number
    /** Warning duration before logout in milliseconds (default: 5 minutes) */
    warningDuration?: number
    /** Callback when warning should be shown */
    onWarning?: () => void
    /** Callback when timeout is reached */
    onTimeout?: () => void
    /** Callback when session is extended */
    onExtend?: () => void
}

interface UseIdleTimeoutReturn {
    /** Whether the warning modal should be shown */
    isWarningVisible: boolean
    /** Remaining time in seconds before logout */
    remainingSeconds: number
    /** Function to extend the session */
    extendSession: () => void
}

// Events that indicate user activity
const ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'wheel'
]

export function useIdleTimeout({
    timeout = 60 * 60 * 1000, // 1 hour
    warningDuration = 5 * 60 * 1000, // 5 minutes
    onWarning,
    onTimeout,
    onExtend
}: UseIdleTimeoutOptions = {}): UseIdleTimeoutReturn {
    const [isWarningVisible, setIsWarningVisible] = useState(false)
    const [remainingSeconds, setRemainingSeconds] = useState(warningDuration / 1000)

    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    // Clear all timers
    const clearAllTimers = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current)
            warningTimeoutRef.current = null
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
        }
    }, [])

    // Start countdown timer for warning modal
    const startCountdown = useCallback(() => {
        const seconds = Math.floor(warningDuration / 1000)
        setRemainingSeconds(seconds)

        countdownIntervalRef.current = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(countdownIntervalRef.current!)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [warningDuration])

    // Reset timeout timers
    const resetTimer = useCallback(() => {
        clearAllTimers()
        setIsWarningVisible(false)
        lastActivityRef.current = Date.now()

        // Set warning timeout (timeout - warningDuration)
        warningTimeoutRef.current = setTimeout(() => {
            setIsWarningVisible(true)
            startCountdown()
            onWarning?.()
        }, timeout - warningDuration)

        // Set logout timeout
        timeoutRef.current = setTimeout(() => {
            onTimeout?.()
        }, timeout)
    }, [clearAllTimers, timeout, warningDuration, startCountdown, onWarning, onTimeout])

    // Extend session (called when user clicks "Extend Session" button)
    const extendSession = useCallback(() => {
        resetTimer()
        onExtend?.()
    }, [resetTimer, onExtend])

    // Handle user activity
    const handleActivity = useCallback(() => {
        // Only reset if warning is not visible (to prevent dismissing warning by activity)
        if (!isWarningVisible) {
            lastActivityRef.current = Date.now()
            resetTimer()
        }
    }, [isWarningVisible, resetTimer])

    // Set up event listeners and initial timer
    useEffect(() => {
        // Start the timer
        resetTimer()

        // Add activity event listeners with throttling
        let throttleTimeout: NodeJS.Timeout | null = null
        const throttledHandler = () => {
            if (!throttleTimeout) {
                throttleTimeout = setTimeout(() => {
                    handleActivity()
                    throttleTimeout = null
                }, 1000) // Throttle to once per second
            }
        }

        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, throttledHandler, { passive: true })
        })

        return () => {
            clearAllTimers()
            if (throttleTimeout) {
                clearTimeout(throttleTimeout)
            }
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, throttledHandler)
            })
        }
    }, [resetTimer, handleActivity, clearAllTimers])

    return {
        isWarningVisible,
        remainingSeconds,
        extendSession
    }
}
