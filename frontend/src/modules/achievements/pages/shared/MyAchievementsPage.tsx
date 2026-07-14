import { useState, useEffect, useCallback } from 'react'
import AchievementCard       from '../../components/AchievementCard'
import AchievementViewModal  from '../../components/AchievementViewModal'
import AchievementForm       from '../../components/AchievementForm'
import Lightbox              from '../../components/Lightbox'
import { getMyAchievements, updateAchievement, deleteAchievement } from '../../api/achievementsApi'
import type { Achievement } from '../../types'

type Tab = 'all' | 'submitted' | 'drafts'

export default function MyAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading,  setLoading]   = useState(true)
  const [tab,      setTab]       = useState<Tab>('all')
  const [viewing,  setViewing]   = useState<Achievement | null>(null)
  const [editing,  setEditing]   = useState<Achievement | null>(null)
  const [lightbox, setLightbox]  = useState<string | null>(null)
  const [saving,   setSaving]    = useState(false)
  const [toast,    setToast]     = useState('')
  const [deleting, setDeleting]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setAchievements(await getMyAchievements()) }
    catch { setAchievements([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSaveEdit = async (fd: FormData, action: 'submit' | 'draft') => {
    if (!editing) return
    setSaving(true)
    try {
      await updateAchievement(editing.id, fd)
      showToast(action === 'submit' ? 'Achievement submitted!' : 'Changes saved.')
      setEditing(null)
      await load()
    } catch (err: any) {
      throw new Error(err?.response?.data?.error || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this achievement? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteAchievement(id)
      showToast('Achievement deleted.')
      await load()
    } finally {
      setDeleting(null) }
  }

  const submitted = achievements.filter(a => a.status !== 'draft')
  const drafts    = achievements.filter(a => a.status === 'draft')
  const list      = tab === 'submitted' ? submitted : tab === 'drafts' ? drafts : achievements

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'all',       label: 'All',       count: achievements.length },
    { key: 'submitted', label: 'Submitted', count: submitted.length    },
    { key: 'drafts',    label: 'Drafts',    count: drafts.length       },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Achievements</h1>

      {toast && (
        <div className="mb-4 bg-[#E5DDC6]/30 border border-[#E5DDC6] text-[#101A24] px-4 py-3 rounded-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'bg-[#101A24] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🏆</div>
          <p className="font-medium text-gray-500">
            {tab === 'drafts' ? 'No drafts saved.' : 'No achievements yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(a => (
            <AchievementCard
              key={a.id}
              achievement={a}
              onView={setViewing}
              onEdit={setEditing}
              onDelete={deleting ? undefined : handleDelete}
            />
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <AchievementViewModal
          achievement={viewing}
          onClose={() => setViewing(null)}
          onLightbox={setLightbox}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editing.status === 'draft' ? 'Complete & Submit' : 'Edit Achievement'}
              </h2>
              <button onClick={() => setEditing(null)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <AchievementForm
                mode="edit"
                initial={editing}
                loading={saving}
                onSubmit={handleSaveEdit}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
        </div>
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
