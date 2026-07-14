import type { Achievement } from '../types'
import { formatDate, capitalize, getFileUrl, parsePhotoUrls } from '../utils'

interface Props {
  achievement: Achievement | null
  onClose: () => void
  onLightbox: (src: string) => void
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
    <div className="text-sm font-semibold text-gray-800">{value}</div>
  </div>
)

export default function AchievementViewModal({ achievement: a, onClose, onLightbox }: Props) {
  if (!a) return null

  const photoUrls = parsePhotoUrls(a.photo_urls)
  const certFiles = a.certificate_url
    ? a.certificate_url.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-bold text-gray-900 truncate">
              {a.title || 'Achievement'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{a.event_name}</p>
          </div>
          <button onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Student/Faculty info pill — shown on admin/faculty views */}
          {a.student_name && (
            <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6]/60 rounded-lg px-4 py-3">
              <p className="text-sm font-bold text-[#101A24]">{a.student_name}</p>
              <p className="text-xs text-[#101A24] mt-0.5">
                {[a.roll_number, a.department, a.batch].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Event Type"  value={capitalize(a.event_type)} />
            <InfoRow label="Level"       value={capitalize(a.level)} />
            <InfoRow label="Result"      value={capitalize(a.result)} />
            <InfoRow label="Position"    value={a.position    || '—'} />
            <InfoRow label="Place Held"  value={a.place_held  || '—'} />
            <InfoRow label="Organiser"   value={a.organiser_name || '—'} />
            <InfoRow label="Start Date"  value={formatDate(a.start_date)} />
            <InfoRow label="End Date"    value={formatDate(a.end_date)} />
            {a.duration_days != null && (
              <InfoRow label="Duration"
                value={`${a.duration_days} day${a.duration_days !== 1 ? 's' : ''}`} />
            )}
          </div>

          {a.description && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
              {a.description}
            </p>
          )}

          {/* Photos */}
          {photoUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Proof Photos
              </p>
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((url, i) => (
                  <img key={i} src={getFileUrl(url)} alt={`photo-${i}`}
                    onClick={() => onLightbox(getFileUrl(url))}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-[#E5DDC6]/60 cursor-pointer hover:scale-105 transition-transform" />
                ))}
              </div>
            </div>
          )}

          {/* Certificates */}
          {certFiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Certificate{certFiles.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {certFiles.map((f, i) =>
                  f.toLowerCase().endsWith('.pdf') ? (
                    <a key={i} href={getFileUrl(f)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                      📄 View PDF
                    </a>
                  ) : (
                    <img key={i} src={getFileUrl(f)} alt={`cert-${i}`}
                      onClick={() => onLightbox(getFileUrl(f))}
                      className="max-w-36 max-h-36 object-contain rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
