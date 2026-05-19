'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, X, Check, Trash2, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'review'>('idle')
  const [duration, setDuration] = useState(0)
  const [visualizerData, setVisualizerData] = useState<number[]>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        // We'll handle the blob in the confirm step
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setStatus('recording')
      setDuration(0)
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)

      visualize()
    } catch (err) {
      console.error('Failed to start recording', err)
      alert('Could not access microphone.')
    }
  }

  const visualize = () => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const normalizedData = Array.from(dataArray).slice(0, 16).map(v => v / 255)
    setVisualizerData(normalizedData)
    animationFrameRef.current = requestAnimationFrame(visualize)
  }

  const stopAndReview = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop()
      setStatus('review')
      cleanup()
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    setStatus('idle')
    cleanup()
    chunksRef.current = []
  }

  const confirmSend = () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
    onRecordingComplete(blob)
    setStatus('idle')
    chunksRef.current = []
  }

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-1">
      {status === 'idle' ? (
        <button
          onClick={startRecording}
          className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground"
          title="Voice message"
        >
          <Mic className="w-6 h-6" />
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-2xl px-3 py-1.5 animate-in slide-in-from-right-4">
          {status === 'recording' ? (
            <>
              <div className="flex items-center gap-1 w-24">
                {visualizerData.map((v, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-accent rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(4, v * 24)}px` }}
                  />
                ))}
              </div>
              <span className="text-xs font-mono font-bold text-accent animate-pulse">{formatTime(duration)}</span>
              <button 
                onClick={stopAndReview}
                className="p-1.5 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <span className="text-xs font-mono font-bold text-slate-400 px-2">{formatTime(duration)}</span>
              <button 
                onClick={cancelRecording}
                className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={confirmSend}
                className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 shadow-lg"
              >
                <Check className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
