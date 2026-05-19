'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Paperclip, X, File, FileText, Image as ImageIcon, Film, Music, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface AttachmentPickerProps {
  onFilesSelected: (files: File[]) => void
  pendingFiles: File[]
  onRemoveFile: (index: number) => void
  uploading: boolean
  progress: number
}

export function AttachmentPicker({ 
  onFilesSelected, 
  pendingFiles, 
  onRemoveFile, 
  uploading,
  progress 
}: AttachmentPickerProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 100MB)`)
        return false
      }
      return true
    })
    onFilesSelected(validFiles)
  }, [onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true, // We have a dedicated button
  })

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (type.startsWith('video/')) return <Film className="w-4 h-4" />
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-sm border-2 border-dashed border-primary rounded-2xl flex items-center justify-center transition-all">
          <div className="text-primary font-bold animate-bounce flex flex-col items-center gap-2">
            <Paperclip className="w-12 h-12" />
            Drop to attach
          </div>
        </div>
      )}

      {/* Preview Strip */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 animate-in slide-in-from-bottom-2 px-2">
          {pendingFiles.map((file, i) => (
            <div key={i} className="glass flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 text-xs max-w-[200px]">
              <span className="text-primary">{getFileIcon(file.type)}</span>
              <span className="truncate flex-1">{file.name}</span>
              <button 
                onClick={() => onRemoveFile(i)}
                className="hover:text-accent transition-colors"
                disabled={uploading}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          
          {uploading && (
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
