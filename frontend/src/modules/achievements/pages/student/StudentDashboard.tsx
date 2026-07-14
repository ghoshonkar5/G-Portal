import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'
import { getMyAchievements } from '../../api/achievementsApi'
import AchievementCard      from '../../components/AchievementCard'
import AchievementViewModal from '../../components/AchievementViewModal'
import Lightbox             from '../../components/Lightbox'
import type { Achievement } from '../../types'

export default function StudentDashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading,  setLoading]   = useState(true)
  const [viewing,  setViewing]   = useState<Achievement | null>(null)
  const [lightbox, setLightbox]  = useState<string | null>(null)

  useEffect(() => {
    getMyAchievements()
      .then(setAchievements)
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false))
  }, [])

  const submitted = achievements.filter(a => a.status !== 'draft')
  const drafts    = achievements.filter(a => a.status === 'draft')
  const firstName = user?.name?.split(' ')[0] || 'Student'

  const STATS = [
    { label: 'Submitted', value: submitted.length, color: 'bg-[#E5DDC6]/30 text-[#101A24] border-[#E5DDC6]/60' },
    { label: 'Drafts',    value: drafts.length,    color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
    { label: 'Total',     value: achievements.length, color: 'bg-[#E5DDC6]/30 text-[#101A24] border-[#E5DDC6]/60' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
        <p className="text-gray-500 text-sm mt-1">Track and manage your achievements here.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS.map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <button onClick={() => navigate('/achievements/submit')}
          className="px-5 py-2.5 bg-[#101A24] text-white text-sm font-semibold rounded-lg hover:bg-[#16222E] transition-colors">
          + Submit Achievement
        </button>
        <button onClick={() => navigate('/achievements/mine')}
          className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">
          My Achievements
        </button>
      </div>

      {/* Recent */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent Achievements
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-medium text-gray-500">No achievements yet.</p>
            <button onClick={() => navigate('/achievements/submit')}
              className="mt-3 text-sm text-[#101A24] font-semibold hover:underline">
              Submit your first one →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.slice(0, 4).map(a => (
              <AchievementCard key={a.id} achievement={a} showActions={false} onView={setViewing} />
            ))}
            {achievements.length > 4 && (
              <button onClick={() => navigate('/achievements/mine')}
                className="w-full py-2 text-sm text-[#101A24] font-semibold hover:underline">
                View all {achievements.length} achievements →
              </button>
            )}
          </div>
        )}
      </div>

      {viewing && (
        <AchievementViewModal achievement={viewing} onClose={() => setViewing(null)} onLightbox={setLightbox} />
      )}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
