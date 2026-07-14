import { useState, useEffect } from 'react'
import type { Achievement } from '../types'

interface Props {
  mode: 'submit' | 'edit'
  initial?: Achievement
  loading: boolean
  onSubmit: (fd: FormData, action: 'submit' | 'draft') => Promise<void>
  onCancel?: () => void
}

const EVENT_TYPES  = ['academic', 'technical', 'sports', 'cultural', 'other']
const LEVELS       = ['international', 'national', 'state', 'university', 'college']
const RESULTS      = ['winner', 'runner_up', 'participant', 'merit']

const INPUT  = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white'
const LABEL  = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide'

export default function AchievementForm({ mode, initial, loading, onSubmit, onCancel }: Props) {
  const [title,     setTitle]     = useState(initial?.title     || '')
  const [eventName, setEventName] = useState(initial?.event_name || '')
  const [organiser, setOrganiser] = useState(initial?.organiser_name || '')
  const [eventType, setEventType] = useState(initial?.event_type || '')
  const [level,     setLevel]     = useState(initial?.level     || '')
  const [result,    setResult]    = useState(initial?.result    || '')
  const [position,  setPosition]  = useState(initial?.position  || '')
  const [place,     setPlace]     = useState(initial?.place_held || '')
  const [startDate, setStartDate] = useState(initial?.start_date?.slice(0, 10) || '')
  const [endDate,   setEndDate]   = useState(initial?.end_date?.slice(0, 10)   || '')
  const [desc,      setDesc]      = useState(initial?.description || '')
  const [certFiles,  setCertFiles]  = useState<FileList | null>(null)
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null)
  const [duration, setDuration]   = useState<string | null>(null)
  const [durErr,   setDurErr]     = useState(false)
  const [error,    setError]      = useState('')

  useEffect(() => {
    if (!startDate || !endDate) { setDuration(null); setDurErr(false); return }
    const s = new Date(startDate), e = new Date(endDate)
    if (e < s) { setDurErr(true); setDuration(null); return }
    setDurErr(false)
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
    setDuration(`${days} day${days > 1 ? 's' : ''}`)
  }, [startDate, endDate])

  const buildFd = (action: 'submit' | 'draft') => {
    const fd = new FormData()
    fd.append('status',         action === 'draft' ? 'draft' : 'pending')
    fd.append('title',          title)
    fd.append('event_name',     eventName)
    fd.append('organiser_name', organiser)
    fd.append('event_type',     eventType)
    fd.append('level',          level)
    fd.append('result',         result)
    fd.append('position',       position)
    fd.append('place_held',     place)
    fd.append('start_date',     startDate)
    fd.append('end_date',       endDate)
    fd.append('description',    desc)
    if (certFiles)  Array.from(certFiles).forEach(f  => fd.append('certificate', f))
    if (photoFiles) Array.from(photoFiles).forEach(f => fd.append('photos', f))
    return fd
  }

  const handleAction = async (action: 'submit' | 'draft') => {
    setError('')
    if (action === 'submit') {
      const missing: string[] = []
      if (!title)     missing.push('Achievement Title')
      if (!eventName) missing.push('Event Name')
      if (!organiser) missing.push('Organiser Name')
      if (!eventType) missing.push('Event Type')
      if (!level)     missing.push('Level')
      if (!result)    missing.push('Result')
      if (!position)  missing.push('Position')
      if (!place)     missing.push('Place Held')
      if (!startDate) missing.push('Start Date')
      if (!endDate)   missing.push('End Date')
      if (mode === 'submit' && !certFiles?.length)  missing.push('Certificate')
      if (mode === 'submit' && !photoFiles?.length) missing.push('Proof Photos')
      if (missing.length) { setError(`Required: ${missing.join(', ')}`); return }
      if (durErr) { setError('End date must be after start date.'); return }
    }
    try {
      await onSubmit(buildFd(action), action)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.')
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={LABEL}>Achievement Title *</label>
          <input className={INPUT} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. First Place in National Hackathon" />
        </div>

        <div>
          <label className={LABEL}>Event Name *</label>
          <input className={INPUT} value={eventName} onChange={e => setEventName(e.target.value)}
            placeholder="e.g. Smart India Hackathon 2024" />
        </div>

        <div>
          <label className={LABEL}>Organiser Name *</label>
          <input className={INPUT} value={organiser} onChange={e => setOrganiser(e.target.value)}
            placeholder="e.g. Ministry of Education" />
        </div>

        <div>
          <label className={LABEL}>Event Type *</label>
          <select className={INPUT} value={eventType} onChange={e => setEventType(e.target.value)}>
            <option value="">Select type</option>
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Level *</label>
          <select className={INPUT} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">Select level</option>
            {LEVELS.map(l => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Result *</label>
          <select className={INPUT} value={result} onChange={e => setResult(e.target.value)}>
            <option value="">Select result</option>
            {RESULTS.map(r => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Position *</label>
          <input className={INPUT} value={position} onChange={e => setPosition(e.target.value)}
            placeholder="e.g. 1st, Runner-up, Top 10" />
        </div>

        <div className="md:col-span-2">
          <label className={LABEL}>Place Held *</label>
          <input className={INPUT} value={place} onChange={e => setPlace(e.target.value)}
            placeholder="e.g. IIT Bombay, Mumbai" />
        </div>

        <div>
          <label className={LABEL}>Start Date *</label>
          <input type="date" className={INPUT} value={startDate}
            onChange={e => setStartDate(e.target.value)} />
        </div>

        <div>
          <label className={LABEL}>End Date *</label>
          <input type="date" className={INPUT} value={endDate}
            onChange={e => setEndDate(e.target.value)} />
        </div>

        {(duration || durErr) && (
          <div className="md:col-span-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border ${
              durErr
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-[#E5DDC6]/30 border-[#E5DDC6] text-[#101A24]'
            }`}>
              {durErr ? 'End date must be after start date' : `Duration: ${duration}`}
            </span>
          </div>
        )}

        <div className="md:col-span-2">
          <label className={LABEL}>Description</label>
          <textarea className={INPUT + ' resize-none'} rows={3} value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Brief description of the achievement..." />
        </div>

        <div>
          <label className={LABEL}>Certificate(s) {mode === 'submit' ? '*' : ''}</label>
          <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.webp"
            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E5DDC6]/30 file:text-[#101A24] hover:file:bg-[#E5DDC6]/50 cursor-pointer"
            onChange={e => setCertFiles(e.target.files)} />
          {initial?.certificate_url && !certFiles && (
            <p className="text-xs text-gray-400 mt-1">
              Existing certificate kept unless a new one is uploaded.
            </p>
          )}
        </div>

        <div>
          <label className={LABEL}>Proof Photos {mode === 'submit' ? '*' : ''}</label>
          <input type="file" multiple accept=".jpg,.jpeg,.png,.webp"
            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E5DDC6]/30 file:text-[#101A24] hover:file:bg-[#E5DDC6]/50 cursor-pointer"
            onChange={e => setPhotoFiles(e.target.files)} />
          {initial?.photo_urls && !photoFiles && (
            <p className="text-xs text-gray-400 mt-1">
              Existing photos kept unless new ones are uploaded.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        <button onClick={() => handleAction('submit')} disabled={loading}
          className="px-5 py-2 bg-[#101A24] text-white text-sm font-semibold rounded-lg hover:bg-[#16222E] disabled:opacity-50 transition-colors">
          {loading
            ? 'Submitting…'
            : mode === 'edit' && initial?.status === 'draft'
              ? 'Complete & Submit'
              : 'Submit Achievement'}
        </button>
        <button onClick={() => handleAction('draft')} disabled={loading}
          className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
          Save as Draft
        </button>
        {onCancel && (
          <button onClick={onCancel} disabled={loading}
            className="px-5 py-2 text-gray-500 text-sm font-semibold hover:text-gray-700 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
