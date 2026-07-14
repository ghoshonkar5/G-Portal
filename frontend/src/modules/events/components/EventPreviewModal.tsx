import { useState, useEffect } from 'react'
import { X, Calendar, Award, Users, MapPin, Monitor, FileText, Edit2, AlertCircle } from 'lucide-react'
import type { Event } from '../types'

interface Props {
  event: Event
  onClose: () => void
  onEdit: () => void
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
const isPending = (e: Event) => e.docs_status && e.docs_status !== 'complete'
const isIncomplete = (e: Event) => e.status === 'draft' || isPending(e)
const resolveUrl = (url: string) => url

export default function EventPreviewModal({ event, onClose, onEdit }: Props) {
  const incomplete = isIncomplete(event)
  const photos = event.photo_urls || []
  const [photoIndex, setPhotoIndex] = useState(0)

  useEffect(() => {
    setPhotoIndex(0)
    if (photos.length <= 1) return
    const t = setInterval(() => {
      setPhotoIndex(p => (p + 1) % photos.length)
    }, 3000)
    return () => clearInterval(t)
  }, [photos.length])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero photo slideshow */}
        <div className="h-64 w-full rounded-t-2xl overflow-hidden relative flex-shrink-0">
          {photos.length === 0 ? (
            <div className="h-full w-full bg-gradient-to-br from-[#101A24] via-[#16222E] to-teal-900">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl" />
            </div>
          ) : (
            photos.map((url, i) => (
              <img
                key={i}
                src={resolveUrl(url)}
                alt={`Photo ${i + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                  i === photoIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent" />

          {/* Dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === photoIndex ? 'bg-white w-3' : 'bg-white/40 w-1.5'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold border border-white/20">
                {event.event_type}
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                event.status === 'draft' ? 'text-amber-300 bg-amber-900/40' :
                isPending(event) ? 'text-red-300 bg-red-900/40' : 'text-emerald-300 bg-emerald-900/40'
              }`}>
                {event.status === 'draft' ? 'Draft' : isPending(event) ? 'Docs missing' : 'Submitted'}
              </span>
            </div>
            <h2 className="text-white font-bold text-xl leading-snug line-clamp-2">{event.event_title}</h2>
          </div>

          {/* Edit / Close controls */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-md hover:bg-white/30 text-white text-xs font-semibold transition-colors border border-white/20"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md hover:bg-white/30 text-white transition-colors border border-white/20"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Incomplete warning */}
          {incomplete && (
            <div className={`rounded-xl p-4 flex items-start gap-3 border ${
              event.status === 'draft' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            }`}>
              <AlertCircle size={18} className={`flex-shrink-0 mt-0.5 ${event.status === 'draft' ? 'text-amber-500' : 'text-red-500'}`} />
              <div>
                <p className={`text-sm font-bold ${event.status === 'draft' ? 'text-amber-700' : 'text-red-700'}`}>
                  {event.status === 'draft' ? 'This event is a draft' : 'Documents required'}
                </p>
                <p className={`text-xs mt-0.5 ${event.status === 'draft' ? 'text-amber-600' : 'text-red-600'}`}>
                  {event.status === 'draft'
                    ? 'Complete and submit this event to include it in your portfolio.'
                    : 'Upload the missing certificate and photo to complete this event.'}
                </p>
                <button onClick={onEdit} className="mt-2 text-xs font-bold underline text-[#101A24] hover:text-[#101A24]">
                  {event.status === 'draft' ? 'Complete event form →' : 'Upload documents →'}
                </button>
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: 'Role', value: event.role_at_event },
              { icon: Award, label: 'Level', value: event.level },
              { icon: Calendar, label: 'Date', value: fmt(event.start_date) + (event.start_date !== event.end_date ? ` – ${fmt(event.end_date)}` : '') },
              { icon: Monitor, label: 'Mode', value: event.mode },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E5DDC6]/30 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-[#101A24]" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-[#101A24] mt-0.5">{value}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 col-span-2">
              <div className="w-8 h-8 rounded-lg bg-[#E5DDC6]/30 flex items-center justify-center flex-shrink-0">
                <Users size={15} className="text-[#101A24]" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Organizer</p>
                <p className="text-sm font-semibold text-[#101A24] mt-0.5">{event.organizer}</p>
              </div>
            </div>
            {event.venue && (
              <div className="flex items-start gap-3 col-span-2">
                <div className="w-8 h-8 rounded-lg bg-[#E5DDC6]/30 flex items-center justify-center flex-shrink-0">
                  <MapPin size={15} className="text-[#101A24]" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Venue</p>
                  <p className="text-sm font-semibold text-[#101A24] mt-0.5">{event.venue}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="bg-[#E5DDC6]/30/50 border border-[#E5DDC6]/60 rounded-xl p-4">
              <p className="text-[11px] text-[#101A24]/80 font-semibold uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-[#101A24] leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Certificates */}
          {event.certificate_urls?.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FileText size={13} /> Certificates ({event.certificate_urls.length})
              </p>
              <div className="space-y-2">
                {event.certificate_urls.map((url, i) => {
                  const isImg = /\.(jpg|jpeg|png|webp)$/i.test(url)
                  return isImg ? (
                    <a key={i} href={resolveUrl(url)} target="_blank" rel="noreferrer">
                      <img src={resolveUrl(url)} alt={`Certificate ${i + 1}`}
                        className="w-full max-h-48 object-contain rounded-lg border border-[#E5DDC6]/60 hover:opacity-90 transition-opacity cursor-pointer" />
                    </a>
                  ) : (
                    <a key={i} href={resolveUrl(url)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-[#E5DDC6]/60 hover:bg-[#E5DDC6]/30 transition-colors">
                      <FileText size={18} className="text-[#101A24] flex-shrink-0" />
                      <span className="text-sm text-[#101A24] font-medium">Certificate {i + 1} — click to open</span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {!incomplete && photos.length === 0 && event.certificate_urls?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No attachments uploaded.</p>
          )}
        </div>
      </div>
    </div>
  )
}