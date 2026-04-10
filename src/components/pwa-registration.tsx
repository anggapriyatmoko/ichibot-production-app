'use client'

import { useEffect } from 'react'

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
          })
          .catch((registrationError) => {
          })
      })
    }
  }, [])

  return null
}
