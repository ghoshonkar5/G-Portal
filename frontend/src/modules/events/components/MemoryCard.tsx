import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ChevronRight, Clock, CalendarDays, Sparkles } from 'lucide-react'
import type { Memory } from '../types'

interface MemoryCardProps {
  memories: Memory[]
  onViewEvent: (eventId: number) => void
}

const resolveUrl = (url: string) => url

export default function MemoryCard({ memories, onViewEvent }: MemoryCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [collageVisible, setCollageVisible] = useState(true)

  if (memories.length === 0) return null

  const memory = memories[currentIndex]
  const photos = memory.photos

  const goToNext = useCallback(() => {
    if (isAnimating || memories.length <= 1) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % memories.length)
      setIsAnimating(false)
    }, 350)
  }, [isAnimating, memories.length])

  // Preload next memory's photos
  useEffect(() => {
    const next = memories[(currentIndex + 1) % memories.length]
    next?.photos.forEach(url => {
      const img = new Image()
      img.src = resolveUrl(url)
    })
  }, [currentIndex, memories])

  // Reset photo state when memory changes
  useEffect(() => {
    setPhotoIndex(0)
    if (photos.length > 1) {
      setCollageVisible(true)
      const t = setTimeout(() => setCollageVisible(false), 3000)
      return () => clearTimeout(t)
    } else {
      setCollageVisible(false)
    }
  }, [currentIndex, photos.length])

  // Slideshow after collage fades
  useEffect(() => {
    if (collageVisible || photos.length <= 1) return
    const t = setInterval(() => {
      setPhotoIndex(p => (p + 1) % photos.length)
    }, 3000)
    return () => clearInterval(t)
  }, [collageVisible, photos.length, currentIndex])

  // Auto-rotate every 3 minutes
  useEffect(() => {
    if (memories.length <= 1) return
    const t = setInterval(goToNext, 3 * 60 * 1000)
    return () => clearInterval(t)
  }, [goToNext, memories.length])

  const getIcon = (type: string) => {
    if (type === 'on_this_day') return <Clock size={12} className="text-amber-200" />
    if (type === 'monthly_recap') return <CalendarDays size={12} className="text-[#E5DDC6]" />
    return <Sparkles size={12} className="text-teal-200" />
  }

  const renderCollage = () => {
    if (photos.length === 0) return (
      <div className="h-full w-full bg-gradient-to-br from-[#101A24] via-[#16222E] to-teal-900 relative">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-teal-300 opacity-10 rounded-full blur-xl" />
      </div>
    )
    if (photos.length === 1) return (
      <img src={resolveUrl(photos[0])} alt="Memory" className="w-full h-full object-cover" />
    )
    if (photos.length === 2) return (
      <div className="grid grid-cols-2 gap-0.5 w-full h-full">
        {photos.slice(0, 2).map((p, i) => (
          <img key={i} src={resolveUrl(p)} alt={`Memory ${i + 1}`} className="w-full h-full object-cover" />
        ))}
      </div>
    )
    return (
      <div className="grid grid-cols-3 gap-0.5 w-full h-full">
        <div className="col-span-2 overflow-hidden">
          <img src={resolveUrl(photos[0])} alt="Memory main" className="w-full h-full object-cover" />
        </div>
        <div className="col-span-1 flex flex-col gap-0.5">
          <img src={resolveUrl(photos[1])} alt="Memory 2" className="w-full h-1/2 object-cover" />
          <div className="relative h-1/2 overflow-hidden">
            <img src={resolveUrl(photos[2])} alt="Memory 3" className="w-full h-full object-cover" />
            {photos.length > 3 && (
              <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-white font-bold text-xl">+{photos.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5DDC6]/60 overflow-hidden">
      <div className={`relative transition-opacity duration-350 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <div className="h-64 w-full rounded-t-xl overflow-hidden relative bg-teal-900">

          {/* Collage layer — fades out after 3s */}
          <div className={`absolute inset-0 transition-opacity duration-700 ${collageVisible && photos.length > 1 ? 'opacity-100' : 'opacity-0'}`}>
            {renderCollage()}
          </div>

          {/* Slideshow layer — always rendered, fades in after collage */}
          {photos.length > 0 && (
            <div className={`absolute inset-0 transition-opacity duration-700 ${!collageVisible || photos.length === 1 ? 'opacity-100' : 'opacity-0'}`}>
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={resolveUrl(p)}
                  alt={`Memory ${i + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === photoIndex ? 'opacity-100' : 'opacity-0'}`}
                />
              ))}
            </div>
          )}

          {/* No photos fallback */}
          {photos.length === 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#101A24] via-[#16222E] to-teal-900">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-teal-300 opacity-10 rounded-full blur-xl" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent" />

          {/* Slideshow dots */}
          {photos.length > 1 && !collageVisible && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === photoIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`}
                />
              ))}
            </div>
          )}

          {/* Memory counter dots */}
          {memories.length > 1 && (
            <div className="absolute top-3 right-3 flex gap-1">
              {memories.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'bg-white w-4' : 'bg-white/30 w-1'}`}
                />
              ))}
            </div>
          )}

          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5 border border-white/20">
                {getIcon(memory.type)}
                {memory.type.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="text-white font-bold text-2xl mb-1.5 leading-tight">{memory.headline}</h3>
            <p className="text-teal-50 text-sm font-medium line-clamp-2 max-w-lg opacity-90">
              {memory.subtext}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3.5 px-5 flex items-center justify-between bg-white border-t border-[#E5DDC6]/40">
        <button
          onClick={goToNext}
          disabled={isAnimating || memories.length <= 1}
          className="text-[#101A24] hover:text-[#101A24] hover:bg-[#E5DDC6]/30 px-3 py-1.5 rounded-md font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={isAnimating ? 'animate-spin' : ''} />
          Show another
        </button>
        <button
          onClick={() => memory.events[0] && onViewEvent(memory.events[0].id)}
          className="text-[#101A24] font-bold text-sm hover:underline flex items-center gap-1"
        >
          View event details <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}