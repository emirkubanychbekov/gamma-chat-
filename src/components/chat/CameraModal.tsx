'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Camera, RotateCw, Check } from 'lucide-react'

interface CameraModalProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let currentStream: MediaStream | null = null

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
          audio: false 
        })
        currentStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsReady(true)
        }
      } catch (err) {
        console.error('Camera access denied:', err)
        alert('Could not access camera. Please check your permissions.')
        onClose()
      }
    }
    startCamera()

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [onClose])

  const takePhoto = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const data = canvas.toDataURL('image/jpeg', 0.9)
    setPhotoData(data)
    setHasPhoto(true)
  }

  const handleConfirm = () => {
    if (!photoData) return
    
    // Convert base64 to file
    fetch(photoData)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        onClose()
      })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full border border-white/10 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {!hasPhoto ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              {!isReady && <div className="absolute inset-0 flex items-center justify-center text-white/50">Initializing...</div>}
            </>
          ) : (
            <img src={photoData!} className="w-full h-full object-cover" alt="Captured" />
          )}
        </div>

        <div className="p-6 flex items-center justify-center gap-6 bg-slate-900/50 backdrop-blur-xl">
          {!hasPhoto ? (
            <button 
              onClick={takePhoto}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <div className="w-14 h-14 rounded-full border-4 border-slate-900 flex items-center justify-center">
                <Camera className="w-7 h-7 text-slate-900" />
              </div>
            </button>
          ) : (
            <>
              <button 
                onClick={() => setHasPhoto(false)}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"
              >
                <RotateCw className="w-5 h-5" /> Retake
              </button>
              <button 
                onClick={handleConfirm}
                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 rounded-2xl text-white font-bold shadow-lg transition-all"
              >
                <Check className="w-5 h-5" /> Send Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
