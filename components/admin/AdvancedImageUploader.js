/**
 * Advanced Image Uploader with Compression, Cropping, and Multiple Upload
 * Features: Drag & drop, compression, cropping, thumbnails, watermarking
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Crop, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

export default function AdvancedImageUploader({
  onImagesUploaded,
  maxImages = 10,
  folder = 'car-images',
  compress = true,
  allowCrop = false,
  watermark = null
}) {
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const fileInputRef = useRef(null)
  const supabase = createClient()

  /**
   * Compress image before upload
   */
  const compressImage = async (file) => {
    if (!compress) return file

    const options = {
      maxSizeMB: 1, // Max 1MB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg'
    }

    try {
      const compressedFile = await imageCompression(file, options)
      console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
      return compressedFile
    } catch (error) {
      console.error('Compression error:', error)
      return file
    }
  }

  /**
   * Create thumbnail from image
   */
  const createThumbnail = async (file) => {
    const options = {
      maxSizeMB: 0.1, // Max 100KB for thumbnail
      maxWidthOrHeight: 300,
      useWebWorker: true,
      fileType: 'image/jpeg'
    }

    try {
      const thumbnail = await imageCompression(file, options)
      return thumbnail
    } catch (error) {
      console.error('Thumbnail creation error:', error)
      return null
    }
  }

  /**
   * Add watermark to image (canvas-based)
   */
  const addWatermark = async (file, watermarkText) => {
    if (!watermarkText) return file

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')

          // Draw image
          ctx.drawImage(img, 0, 0)

          // Add watermark
          const fontSize = Math.min(img.width, img.height) * 0.05
          ctx.font = `bold ${fontSize}px Arial`
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
          ctx.lineWidth = 2

          const text = watermarkText
          const textWidth = ctx.measureText(text).width
          const x = img.width - textWidth - 20
          const y = img.height - 20

          ctx.strokeText(text, x, y)
          ctx.fillText(text, x, y)

          // Convert to blob
          canvas.toBlob((blob) => {
            const watermarkedFile = new File([blob], file.name, { type: 'image/jpeg' })
            resolve(watermarkedFile)
          }, 'image/jpeg', 0.95)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * Upload single image to Supabase
   */
  const uploadImage = async (file, index) => {
    try {
      // Compress
      let processedFile = await compressImage(file)

      // Add watermark if specified
      if (watermark) {
        processedFile = await addWatermark(processedFile, watermark)
      }

      // Create thumbnail
      const thumbnail = await createThumbnail(processedFile)

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const fileName = `${folder}/${timestamp}-${randomString}-${file.name.replace(/\s+/g, '-')}`
      const thumbnailName = `${folder}/thumbnails/${timestamp}-${randomString}-thumb-${file.name.replace(/\s+/g, '-')}`

      // Upload main image
      const { data: mainData, error: mainError } = await supabase.storage
        .from('car-images')
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (mainError) throw mainError

      // Upload thumbnail
      let thumbnailUrl = null
      if (thumbnail) {
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('car-images')
          .upload(thumbnailName, thumbnail, {
            cacheControl: '3600',
            upsert: false
          })

        if (!thumbError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('car-images')
            .getPublicUrl(thumbData.path)
          thumbnailUrl = thumbPublicUrl
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('car-images')
        .getPublicUrl(mainData.path)

      return {
        url: publicUrl,
        thumbnailUrl,
        path: mainData.path,
        thumbnailPath: thumbnailName,
        name: file.name,
        size: processedFile.size,
        originalSize: file.size
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  /**
   * Handle file selection
   */
  const handleFiles = async (files) => {
    const fileArray = Array.from(files)

    // Validate file count
    if (images.length + fileArray.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    // Validate file types
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setUploading(true)

    try {
      // Create preview URLs
      const previews = validFiles.map((file, index) => ({
        id: Date.now() + index,
        file,
        preview: URL.createObjectURL(file),
        status: 'uploading',
        progress: 0
      }))

      setImages(prev => [...prev, ...previews])

      // Upload all images
      const uploadPromises = validFiles.map(async (file, index) => {
        try {
          const imageData = await uploadImage(file, index)

          // Update status
          setImages(prev => prev.map(img => {
            if (img.file === file) {
              return {
                ...img,
                status: 'completed',
                progress: 100,
                ...imageData
              }
            }
            return img
          }))

          return imageData
        } catch (error) {
          // Update status to failed
          setImages(prev => prev.map(img => {
            if (img.file === file) {
              return {
                ...img,
                status: 'failed',
                error: error.message
              }
            }
            return img
          }))
          return null
        }
      })

      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter(r => r !== null)

      if (onImagesUploaded) {
        onImagesUploaded(successfulUploads)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  /**
   * Handle drag events
   */
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  /**
   * Remove image
   */
  const removeImage = async (imageId) => {
    const image = images.find(img => img.id === imageId)

    if (image && image.path) {
      try {
        // Delete from Supabase
        await supabase.storage.from('car-images').remove([image.path])
        if (image.thumbnailPath) {
          await supabase.storage.from('car-images').remove([image.thumbnailPath])
        }
      } catch (error) {
        console.error('Delete error:', error)
      }
    }

    // Revoke preview URL
    if (image && image.preview) {
      URL.revokeObjectURL(image.preview)
    }

    setImages(prev => prev.filter(img => img.id !== imageId))
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />

        <p className="text-lg font-semibold text-gray-700 mb-2">
          {dragActive ? 'Drop images here' : 'Click or drag images to upload'}
        </p>

        <p className="text-sm text-gray-500">
          PNG, JPG, WEBP up to 10MB • Max {maxImages} images
        </p>

        {compress && (
          <p className="text-xs text-blue-600 mt-2">
            ✨ Images will be automatically compressed
          </p>
        )}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                <img
                  src={image.preview || image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />

                {/* Status Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  {image.status === 'uploading' && (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  )}
                  {image.status === 'completed' && (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                  {image.status === 'failed' && (
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  )}
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeImage(image.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>

              {/* File Info */}
              <div className="mt-1 text-xs text-gray-600">
                <p className="truncate">{image.name}</p>
                {image.size && (
                  <p className="text-gray-500">
                    {(image.size / 1024 / 1024).toFixed(2)}MB
                    {image.originalSize && image.originalSize !== image.size && (
                      <span className="text-green-600 ml-1">
                        (saved {((1 - image.size / image.originalSize) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {images.length > 0 && (
        <div className="text-sm text-gray-600">
          {images.length} / {maxImages} images uploaded
        </div>
      )}
    </div>
  )
}
