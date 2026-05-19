'use client'

import { useState, useEffect } from 'react'
import { Bell, X, ShieldCheck } from 'lucide-react'
import { requestNotificationPermission, registerServiceWorker } from '@/lib/notifications'
import { cn } from '@/lib/utils'

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if permission is already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      const dismissed = localStorage.getItem('push-banner-dismissed')
      if (!dismissed) {
        setShow(true)
      }
    }
  }, [])

  const handleEnable = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      await registerServiceWorker()
      setShow(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('push-banner-dismissed', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:w-[400px] z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="glass border border-primary/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          
          <div className="space-y-1 pr-6">
            <h3 className="font-bold text-slate-100">Enable Notifications</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never miss a message! Get real-time updates for new messages, mentions, and calls even when you're away.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleEnable}
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-2xl transition-all glow flex items-center justify-center gap-2 text-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            Enable Now
          </button>
          <button 
            onClick={handleDismiss}
            className="px-6 hover:bg-white/5 text-muted-foreground font-medium rounded-2xl transition-colors text-sm"
          >
            Later
          </button>
        </div>

        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-full text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
