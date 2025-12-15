/**
 * Virtual Car Tour Component
 * 360° panoramic viewer for car interiors and exteriors
 * Uses react-photo-sphere-viewer for immersive experience
 */

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Maximize2, Minimize2, RotateCw, Eye, AlertCircle } from 'lucide-react'

// Dynamically import PhotoSphereViewer to avoid SSR issues
const ReactPhotoSphereViewer = dynamic(
  () => import('react-photo-sphere-viewer').then((mod) => mod.ReactPhotoSphereViewer),
  { ssr: false }
)

export default function VirtualCarTour({ tour360Images = [], carName }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewerReady, setViewerReady] = useState(false)

  // Check if tour images are available
  if (!tour360Images || tour360Images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
        <Eye size={48} className="text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">360° Tour Not Available</h3>
        <p className="text-gray-600">This car doesn't have a virtual tour yet</p>
      </div>
    )
  }

  const currentImage = tour360Images[currentImageIndex]

  const handleFullscreen = () => {
    const element = document.getElementById('virtual-tour-container')
    if (!document.fullscreenElement) {
      element.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % tour360Images.length)
  }

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => (prev - 1 + tour360Images.length) % tour360Images.length)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Eye className="mr-2 text-blue-600" size={24} />
            360° Virtual Tour
          </h3>
          <p className="text-sm text-gray-600">
            {currentImage?.label || `View ${currentImageIndex + 1} of ${tour360Images.length}`}
          </p>
        </div>
        <button
          onClick={handleFullscreen}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center text-sm"
        >
          {isFullscreen ? <Minimize2 size={18} className="mr-2" /> : <Maximize2 size={18} className="mr-2" />}
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>

      {/* 360° Viewer Container */}
      <div id="virtual-tour-container" className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
        <div className="aspect-video">
          {currentImage && (
            <ReactPhotoSphereViewer
              src={currentImage.url}
              height="100%"
              width="100%"
              container="virtual-tour-viewer"
              navbar={[
                'autorotate',
                'zoom',
                'move',
                'fullscreen'
              ]}
              defaultZoomLvl={0}
              fisheye={false}
              mousewheel={true}
              touchmoveTwoFingers={false}
              defaultLong={0}
              defaultLat={0}
              onReady={() => setViewerReady(true)}
              littlePlanet={false}
              caption={currentImage.label}
            />
          )}
        </div>

        {/* Loading Overlay */}
        {!viewerReady && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <RotateCw size={48} className="animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold">Loading 360° View...</p>
            </div>
          </div>
        )}

        {/* Navigation Controls (if multiple views) */}
        {tour360Images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                title="Previous view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-sm font-semibold text-gray-900">
                {currentImageIndex + 1} / {tour360Images.length}
              </span>

              <button
                onClick={handleNext}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                title="Next view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Thumbnails */}
      {tour360Images.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tour360Images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition ${
                currentImageIndex === index
                  ? 'border-blue-600 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-400'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Eye size={24} className="mx-auto mb-1" />
                  <p className="text-xs font-semibold">{image.label || `View ${index + 1}`}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How to use the 360° viewer:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Drag</strong> to look around the car interior/exterior</li>
              <li>• <strong>Scroll</strong> to zoom in and out</li>
              <li>• <strong>Double-click</strong> to reset the view</li>
              <li>• Click <strong>Fullscreen</strong> for immersive experience</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Example usage:
 *
 * const tour360Images = [
 *   {
 *     url: '/360/car-interior.jpg',
 *     label: 'Interior View'
 *   },
 *   {
 *     url: '/360/car-exterior.jpg',
 *     label: 'Exterior 360°'
 *   },
 *   {
 *     url: '/360/car-dashboard.jpg',
 *     label: 'Dashboard & Controls'
 *   }
 * ]
 *
 * <VirtualCarTour tour360Images={tour360Images} carName="2024 Toyota Camry" />
 */
