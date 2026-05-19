import { SupabaseClient } from '@supabase/supabase-js'
import { compressImage } from './utils/image'

export interface UploadMetadata {
  filename: string
  content_type: string
  size_bytes: number
  width?: number
  height?: number
  duration_seconds?: number
  thumbnail_path?: string
}

export async function processAndUploadFile(
  supabase: SupabaseClient,
  file: File,
  channelId: string,
  messageId: string,
  onProgress?: (progress: number) => void
) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${messageId}_${Date.now()}.${fileExt}`
  const filePath = `${channelId}/${messageId}/${fileName}`
  
  let uploadFile: Blob | File = file
  let metadata: Partial<UploadMetadata> = {
    filename: file.name,
    content_type: file.type,
    size_bytes: file.size,
  }

  // 1. Process Images
  if (file.type.startsWith('image/')) {
    const compressed = await compressImage(file, 1920, 1920, 0.8)
    uploadFile = compressed
    
    // Get dimensions
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await new Promise((resolve) => (img.onload = resolve))
    metadata.width = img.width
    metadata.height = img.height
    metadata.size_bytes = compressed.size
  }

  // 2. Process Videos (Thumbnail extraction)
  if (file.type.startsWith('video/')) {
    const { thumbnail, duration, width, height } = await extractVideoMetadata(file)
    metadata.duration_seconds = duration
    metadata.width = width
    metadata.height = height

    if (thumbnail) {
      const thumbPath = `${channelId}/${messageId}/thumb_${messageId}.jpg`
      await supabase.storage.from('attachments').upload(thumbPath, thumbnail)
      metadata.thumbnail_path = thumbPath
    }
  }

  // 3. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, uploadFile, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  // 4. Save to Database
  const { data, error: dbError } = await supabase
    .from('attachments')
    .insert({
      message_id: messageId,
      filename: metadata.filename,
      file_path: filePath,
      content_type: metadata.content_type,
      size_bytes: metadata.size_bytes,
      width: metadata.width,
      height: metadata.height,
      duration_seconds: metadata.duration_seconds,
      thumbnail_url: metadata.thumbnail_path,
    })
    .select()
    .single()

  if (dbError) throw dbError

  return data
}

async function extractVideoMetadata(file: File): Promise<{ thumbnail: Blob | null, duration: number, width: number, height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      video.currentTime = 1 // Capture at 1 second
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        resolve({
          thumbnail: blob,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        })
      }, 'image/jpeg', 0.7)
    }
  })
}

export async function getSignedUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 3600) // 1 hour expiry
  
  if (error) throw error
  return data.signedUrl
}
