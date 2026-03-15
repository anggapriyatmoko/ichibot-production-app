'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    // Check if app is already installed/running as standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Detect Desktop
    const desktop = !/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    setIsDesktop(desktop);

    // Check dismissal status with 6-hour expiry
    const dismissedUntil = localStorage.getItem('pwa-prompt-dismissed-until')
    if (dismissedUntil) {
      const now = new Date().getTime()
      if (now < parseInt(dismissedUntil)) {
        setIsDismissed(true)
        return
      }
    }

    // For iOS or Desktop (if event doesn't fire), we show the prompt after a delay
    if (ios || desktop) {
      const timer = setTimeout(() => {
        // Only show if not already visible from event
        setIsVisible(prev => {
          if (prev) return prev;
          console.log(`Showing ${ios ? 'iOS' : 'Desktop'} manual prompt suggestion`);
          return true;
        });
      }, 5000); // 5 seconds delay for desktop/ios
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      console.log('beforeinstallprompt fired');
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (isIOS) return;
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)

    setDeferredPrompt(null)
    setIsVisible(false)
  }

  const handleTemporaryClose = () => {
    setIsVisible(false)
    // We don't set localStorage here, so it will reappear on reload
  }

  const handleLongDismiss = () => {
    setIsVisible(false)
    // Set expiry to 6 hours from now
    const sixHoursInMs = 6 * 60 * 60 * 1000
    const expiryTime = new Date().getTime() + sixHoursInMs
    localStorage.setItem('pwa-prompt-dismissed-until', expiryTime.toString())
    setIsDismissed(true)
  }

  if (isDismissed || !isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-[9999] md:left-auto md:right-8 md:bottom-8 md:max-w-sm"
      >
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
          
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              {isIOS ? <Smartphone className="h-6 w-6 text-white" /> : 
               isDesktop ? <Monitor className="h-6 w-6 text-white" /> : 
               <Download className="h-6 w-6 text-white" />}
            </div>
            
            <div className="flex-1 min-w-0 pr-6">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm md:text-base leading-tight">
                {isIOS ? 'Tambah ke Layar Utama' : 'Pasang Sigma Ichibot'}
              </h3>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {isIOS 
                  ? 'Ketuk ikon "Bagikan" di bawah, lalu pilih "Tambah ke Layar Utama" untuk memasang.'
                  : !deferredPrompt && isDesktop
                  ? 'Klik ikon pasang di bilah alamat browser Anda untuk memasang.'
                  : 'Pasang aplikasi kami untuk pengalaman lebih baik dan akses lebih cepat.'}
              </p>
            </div>

            <button 
              onClick={handleTemporaryClose}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            {!isIOS ? (
              <Button 
                onClick={handleInstall}
                disabled={!deferredPrompt && isDesktop}
                className={cn(
                  "flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-5 h-auto text-sm font-medium transition-all active:scale-[0.98]",
                  !deferredPrompt && isDesktop && "opacity-50 cursor-not-allowed"
                )}
              >
                <Download className="mr-2 h-4 w-4" />
                {deferredPrompt ? 'Pasang Sekarang' : isDesktop ? 'Lihat Tautan di Atas' : 'Pasang Sekarang'}
              </Button>
            ) : (
              <Button 
                onClick={handleLongDismiss}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-5 h-auto text-sm font-medium transition-all active:scale-[0.98]"
              >
                Mengerti
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={handleLongDismiss}
              className="px-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl py-5 h-auto border-zinc-200 dark:border-zinc-800"
            >
              Nanti
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
