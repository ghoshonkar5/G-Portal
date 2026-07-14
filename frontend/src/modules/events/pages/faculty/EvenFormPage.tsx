import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Upload, X, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { EVENT_TYPES, ROLES_AT_EVENT, EVENT_LEVELS, EVENT_MODES, type Event } from '../../types'

import { eventApi } from '../../api/eventApi'
import Navbar from '../../components/Navbar'

interface Props { mode: 'new' | 'edit' }

interface FormErrors {
  event_title?: string; event_type?: string; role_at_event?: string
  level?: string; organizer?: string; mode?: string
  start_date?: string; end_date?: string
}

const EMPTY = {
  event_title: '', event_type: '', role_at_event: '', level: '',
  organizer: '', venue: '', mode: '', start_date: '', end_date: '', description: ''
}

const inputCls = (err: boolean) =>
  `w-full h-11 px-3 bg-[#E5DDC6]/30/80 border rounded-lg text-sm text-[#101A24] placeholder-teal-400/70 outline-none transition-colors ${err ? 'border-red-300 focus:border-red-400' : 'border-[#E5DDC6] focus:border-[#101A24]/50'}`

function Field({ label, required, error, children }: { label: React.ReactNode; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div data-error={error ? true : undefined}>
      <label className="block text-[#101A24] text-sm font-medium mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function FileThumbnail({ src, name, isImg, onRemove }: { src: string; name: string; isImg: boolean; onRemove: () => void }) {
  return (
    <div className="relative w-20 h-20 rounded-lg border border-[#E5DDC6]/60 overflow-hidden bg-gray-50 group flex-shrink-0">
      {isImg
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
          <FileText size={22} className="text-[#101A24]" />
          <span className="text-[9px] text-gray-500 text-center line-clamp-2 leading-tight">{name}</span>
        </div>
      }
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-gray-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={10} />
      </button>
    </div>
  )
}

function DropZone({ accept, onFiles, inputRef, label }: { accept: string; onFiles: (f: FileList | null) => void; inputRef: React.RefObject<HTMLInputElement | null>; label: string }) {
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files) }}
      className="border-2 border-dashed border-[#E5DDC6] hover:border-[#101A24]/50 rounded-lg p-5 text-center cursor-pointer transition-colors bg-[#E5DDC6]/30/30 hover:bg-[#E5DDC6]/30/60"
    >
      <Upload size={18} className="mx-auto text-[#101A24]/70 mb-1.5" />
      <p className="text-sm text-[#101A24] font-medium">{label}</p>
      <p className="text-xs text-[#101A24]/70 mt-0.5">{accept}</p>
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={e => onFiles(e.target.files)} />
    </div>
  )
}

export default function EventFormPage({ mode }: Props) {
  const navigate = useNavigate()
  const { id } = useParams()

  const [form, setForm] = useState(EMPTY)
  const [existingCerts, setExistingCerts] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [newCertFiles, setNewCertFiles] = useState<File[]>([])
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(mode === 'edit')
  const [docsStatus, setDocsStatus] = useState<string>('complete')
  const [docDeadline, setDocDeadline] = useState<string | null>(null)
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)
  const [newEventId, setNewEventId] = useState<number | null>(null)
  const [selectedHours, setSelectedHours] = useState<24 | 48 | 72 | null>(null)
  const [settingDeadline, setSettingDeadline] = useState(false)
  const [deadlineConfirmed, setDeadlineConfirmed] = useState(false)
  const [successModal, setSuccessModal] = useState<{ title: string; sub: string } | null>(null)


  const certRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit' && id) loadEvent()
  }, [mode, id])

  const loadEvent = async () => {
    try {
      const res = await eventApi.getMine()
      const event: Event = res.data.events.find((e: Event) => e.id === parseInt(id!))
      if (!event) { toast.error('Event not found'); navigate('/events/my-events'); return }
      setForm({
        event_title: event.event_title || '',
        event_type: event.event_type || '',
        role_at_event: event.role_at_event || '',
        level: event.level || '',
        organizer: event.organizer || '',
        venue: event.venue || '',
        mode: event.mode || '',
        start_date: event.start_date ? event.start_date.split('T')[0] : '',
        end_date: event.end_date ? event.end_date.split('T')[0] : '',
        description: event.description || '',
      })
      setExistingCerts(event.certificate_urls || [])
      setExistingPhotos(event.photo_urls || [])
      setDocsStatus(event.docs_status || 'complete')
      setDocDeadline(event.document_deadline || null)
    } catch {
      toast.error('Failed to load event'); navigate('/events/my-events')
    } finally {
      setLoading(false)
    }
  }

  const setField = (key: string, val: string) => {
    setForm(p => ({ ...p, [key]: val }))
    if (errors[key as keyof FormErrors]) setErrors(p => ({ ...p, [key]: undefined }))
  }

  const validate = () => {
    const e: FormErrors = {}
    if (!form.event_title.trim()) e.event_title = 'Required'
    if (!form.event_type) e.event_type = 'Required'
    if (!form.role_at_event) e.role_at_event = 'Required'
    if (!form.level) e.level = 'Required'
    if (!form.organizer.trim()) e.organizer = 'Required'
    if (!form.mode) e.mode = 'Required'
    if (!form.start_date) e.start_date = 'Required'
    if (!form.end_date) e.end_date = 'Required'
    else if (form.start_date && form.end_date < form.start_date) e.end_date = 'Must be on or after start date'
    setErrors(e)
    if (Object.keys(e).length > 0) {
      setTimeout(() => document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return false
    }
    return true
  }

  const buildFD = (status: 'draft' | 'submitted') => {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    fd.append('status', status)
    newCertFiles.forEach(f => fd.append('certificates', f))
    newPhotoFiles.forEach(f => fd.append('photos', f))
    return fd
  }

  const handleDraft = async () => {
    setSaving(true)
    try {
      const fd = buildFD('draft')
      if (mode === 'edit' && id) await eventApi.update(parseInt(id), fd)
      else await eventApi.create(fd)
      toast.success('Draft saved')
      navigate('/events/my-events')
    } catch { toast.error('Failed to save draft') }
    finally { setSaving(false) }
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const fd = buildFD('submitted')
      if (mode === 'edit' && id) {
        await eventApi.update(parseInt(id), fd)
        const wasCleared = docsStatus !== 'complete'
        setSuccessModal({
          title: wasCleared ? 'Documents Uploaded!' : 'Event Updated!',
          sub: wasCleared ? 'Your event is now complete.' : 'Changes saved successfully.',
        })
        setTimeout(() => navigate('/events/my-events'), 1800)
      } else {
        const res = await eventApi.create(fd)
        const created = res.data
        if (created.docs_status && created.docs_status !== 'complete') {
          setNewEventId(created.id)
          setShowDeadlinePicker(true)
        } else {
          setSuccessModal({ title: 'Event Submitted!', sub: 'Your event has been added to your portfolio.' })
          setTimeout(() => navigate('/events/my-events'), 1800)
        }
      }
    } catch { toast.error('Failed to submit event') }
    finally { setSubmitting(false) }
  }

  const handleConfirmDeadline = async () => {
    if (!selectedHours || !newEventId) return
    setSettingDeadline(true)
    try {
      await eventApi.setSingleDeadline(newEventId, selectedHours)
      setDeadlineConfirmed(true)
    } catch { toast.error('Failed to set deadline') }
    finally { setSettingDeadline(false) }
  }

  const addCerts = (files: FileList | null) => {
    if (!files) return
    const space = 5 - existingCerts.length - newCertFiles.length
    setNewCertFiles(p => [...p, ...Array.from(files)].slice(0, p.length + space))
  }

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const space = 10 - existingPhotos.length - newPhotoFiles.length
    setNewPhotoFiles(p => [...p, ...Array.from(files)].slice(0, p.length + space))
  }

  const isImg = (url: string) => /\.(jpg|jpeg|png|webp)$/i.test(url)

  const deadlineCountdown = (() => {
    if (!docDeadline || docsStatus === 'complete') return null
    const diff = new Date(docDeadline).getTime() - Date.now()
    if (diff <= 0) return 'Deadline passed'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`
  })()

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-[#101A24]" size={32} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Pending docs warning bar */}
        {mode === 'edit' && docsStatus !== 'complete' && (
          <div className={`rounded-xl p-4 mb-6 flex items-start gap-3 border ${docsStatus === 'pending_both' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
            <AlertCircle size={18} className={`flex-shrink-0 mt-0.5 ${docsStatus === 'pending_both' ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-bold ${docsStatus === 'pending_both' ? 'text-red-700' : 'text-amber-700'}`}>
                {docsStatus === 'pending_both' && 'Certificate and photo required'}
                {docsStatus === 'pending_cert' && 'Certificate required'}
                {docsStatus === 'pending_photo' && 'Photo required'}
              </p>
              <p className={`text-xs mt-0.5 ${docsStatus === 'pending_both' ? 'text-red-500' : 'text-amber-500'}`}>
                This event was imported via CSV. Upload the missing documents below.
                {deadlineCountdown && <> · <strong>{deadlineCountdown}</strong> before auto-deletion.</>}
              </p>
            </div>
          </div>
        )}

        <button onClick={() => navigate('/events/my-events')} className="inline-flex items-center gap-1.5 text-sm text-[#101A24] hover:text-[#101A24] font-medium mb-6">
          <ChevronLeft size={16} />Back to Events
        </button>

        <h2 className="text-2xl font-bold text-[#101A24] mb-6">
          {mode === 'new' ? 'Add New Event' : 'Edit Event'}
        </h2>

        <div className="space-y-6">

          {/* Section 1 */}
          <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-[#101A24] border-b border-[#E5DDC6]/40 pb-3">Event Details</h3>
            <Field label="Event Title" required error={errors.event_title}>
              <input type="text" value={form.event_title} onChange={e => setField('event_title', e.target.value)}
                placeholder="e.g. International Conference on Machine Learning"
                className={inputCls(!!errors.event_title)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Event Type" required error={errors.event_type}>
                <select value={form.event_type} onChange={e => setField('event_type', e.target.value)} className={inputCls(!!errors.event_type)}>
                  <option value="">Select type</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Your Role" required error={errors.role_at_event}>
                <select value={form.role_at_event} onChange={e => setField('role_at_event', e.target.value)} className={inputCls(!!errors.role_at_event)}>
                  <option value="">Select role</option>
                  {ROLES_AT_EVENT.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Level" required error={errors.level}>
              <select value={form.level} onChange={e => setField('level', e.target.value)} className={inputCls(!!errors.level)}>
                <option value="">Select level</option>
                {EVENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Organizer / Institution Name" required error={errors.organizer}>
              <input type="text" value={form.organizer} onChange={e => setField('organizer', e.target.value)}
                placeholder="e.g. IEEE, University" className={inputCls(!!errors.organizer)} />
            </Field>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-[#101A24] border-b border-[#E5DDC6]/40 pb-3">Logistics</h3>
            <Field label="Mode" required error={errors.mode}>
              <select value={form.mode} onChange={e => setField('mode', e.target.value)} className={inputCls(!!errors.mode)}>
                <option value="">Select mode</option>
                {EVENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label={<>Venue <span className="text-gray-400 font-normal text-xs">(optional)</span></>}>
              <input type="text" value={form.venue} onChange={e => setField('venue', e.target.value)}
                placeholder="e.g. Hyderabad, India" className={inputCls(false)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Start Date" required error={errors.start_date}>
                <input type="date" value={form.start_date} onChange={e => setField('start_date', e.target.value)}
                  className={inputCls(!!errors.start_date)} />
              </Field>
              <Field label="End Date" required error={errors.end_date}>
                <input type="date" value={form.end_date} min={form.start_date}
                  onChange={e => setField('end_date', e.target.value)} className={inputCls(!!errors.end_date)} />
              </Field>
            </div>
            <Field label={<>Description / Key Learnings <span className="text-gray-400 font-normal text-xs">(optional)</span></>}>
              <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                placeholder="Brief summary of the event, key takeaways..."
                rows={4} className={`${inputCls(false)} h-auto resize-none`} />
            </Field>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-[#101A24] border-b border-[#E5DDC6]/40 pb-3">Documents</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[#101A24] text-sm font-medium">
                  Certificates <span className="text-gray-400 font-normal text-xs">(max 5 · jpg/png/pdf)</span>
                </label>
                <span className="text-xs text-gray-400">{existingCerts.length + newCertFiles.length}/5</span>
              </div>
              {(existingCerts.length > 0 || newCertFiles.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {existingCerts.map((url, i) => (
                    <FileThumbnail key={`ec-${i}`} src={url} name={`Certificate ${i + 1}`}
                      isImg={isImg(url)} onRemove={() => setExistingCerts(p => p.filter((_, j) => j !== i))} />
                  ))}
                  {newCertFiles.map((f, i) => (
                    <FileThumbnail key={`nc-${i}`} src={URL.createObjectURL(f)} name={f.name}
                      isImg={f.type.startsWith('image/')} onRemove={() => setNewCertFiles(p => p.filter((_, j) => j !== i))} />
                  ))}
                </div>
              )}
              {existingCerts.length + newCertFiles.length < 5 && (
                <DropZone accept=".jpg,.jpeg,.png,.webp,.pdf" onFiles={addCerts} inputRef={certRef}
                  label="Drop certificates here or click to browse" />
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[#101A24] text-sm font-medium">
                  Photos <span className="text-gray-400 font-normal text-xs">(max 10 · jpg/png)</span>
                </label>
                <span className="text-xs text-gray-400">{existingPhotos.length + newPhotoFiles.length}/10</span>
              </div>
              {(existingPhotos.length > 0 || newPhotoFiles.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {existingPhotos.map((url, i) => (
                    <FileThumbnail key={`ep-${i}`} src={url} name={`Certificate ${i + 1}`}
                      isImg={true} onRemove={() => setExistingPhotos(p => p.filter((_, j) => j !== i))} />
                  ))}
                  {newPhotoFiles.map((f, i) => (
                    <FileThumbnail key={`np-${i}`} src={URL.createObjectURL(f)} name={f.name}
                      isImg={true} onRemove={() => setNewPhotoFiles(p => p.filter((_, j) => j !== i))} />
                  ))}
                </div>
              )}
              {existingPhotos.length + newPhotoFiles.length < 10 && (
                <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={addPhotos} inputRef={photoRef}
                  label="Drop photos here or click to browse" />
              )}
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
              Photos and certificates cannot be imported via CSV — upload them here.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <button onClick={handleDraft} disabled={saving || submitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 bg-white font-medium text-sm transition-colors disabled:opacity-60">
              {saving && <Loader2 size={15} className="animate-spin" />}Save as Draft
            </button>
            <button onClick={handleSubmit} disabled={saving || submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white font-medium text-sm transition-colors shadow-lg disabled:opacity-60">
              {submitting && <Loader2 size={15} className="animate-spin" />}Submit Event
            </button>
          </div>
        </div>
      </main>

      {/* Success modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-[#E5DDC6]/50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-[#101A24]" />
            </div>
            <h3 className="text-xl font-bold text-[#101A24] mb-2">{successModal.title}</h3>
            <p className="text-sm text-[#101A24]">{successModal.sub}</p>
            <p className="text-xs text-[#101A24]/70 mt-4">Redirecting…</p>
          </div>
        </div>
      )}

      {/* Deadline picker modal for new events missing docs */}
      {showDeadlinePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Documents missing</h3>
                <p className="text-xs text-gray-500 mt-0.5">You submitted without uploading both certificate and photo.</p>
              </div>
            </div>

            {!deadlineConfirmed ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Choose a deadline to upload the missing documents. The event will be <strong>permanently deleted</strong> if not completed in time.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {([24, 48, 72] as const).map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedHours(h)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedHours === h
                          ? 'border-[#101A24] bg-[#E5DDC6]/30 text-[#101A24]'
                          : 'border-gray-200 hover:border-[#E5DDC6] text-gray-600'
                        }`}
                    >
                      <span className="text-2xl font-bold">{h}</span>
                      <span className="text-xs font-medium mt-0.5">hours</span>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {h === 24 ? '1 day' : h === 48 ? '2 days' : '3 days'}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedHours && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-xs text-amber-700">
                    ⚠ This event will be deleted if documents are not uploaded within <strong>{selectedHours} hours</strong>.
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { navigate('/events/my-events') }}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleConfirmDeadline}
                    disabled={!selectedHours || settingDeadline}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {settingDeadline ? <Loader2 size={14} className="animate-spin" /> : null}
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 bg-[#E5DDC6]/30 border border-[#E5DDC6] rounded-xl mb-4">
                  <CheckCircle2 size={18} className="text-[#101A24] flex-shrink-0" />
                  <p className="text-sm font-bold text-[#101A24]">Deadline set — {selectedHours} hours</p>
                </div>
                <button
                  onClick={() => navigate('/events/my-events')}
                  className="w-full px-4 py-2 rounded-lg bg-[#101A24] text-white text-sm font-bold hover:bg-[#16222E]"
                >
                  Go to My Events
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}