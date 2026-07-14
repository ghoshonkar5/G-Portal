import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'
import { getMyAchievements } from '../../api/achievementsApi'
import type { Achievement } from '../../types'

export default function FacultyDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyAchievements()
      .then(setAchievements)
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'Faculty'
  const submitted = achievements.filter(a => a.status !== 'draft').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {firstName}!</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your achievements and view your students' submissions.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border bg-[#E5DDC6]/30 border-[#E5DDC6]/60 text-[#101A24] p-4 text-center">
          <div className="text-2xl font-bold">{loading ? '…' : submitted}</div>
          <div className="text-xs font-semibold mt-0.5 opacity-80">My Submissions</div>
        </div>
        <div className="rounded-xl border bg-purple-50 border-purple-100 text-purple-700 p-4 text-center">
          <div className="text-2xl font-bold">→</div>
          <div className="text-xs font-semibold mt-0.5 opacity-80">Student Achievements</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => navigate('/achievements/submit')}
          className="w-full py-3 bg-[#101A24] text-white text-sm font-semibold rounded-xl hover:bg-[#16222E] transition-colors text-left px-5">
          + Submit My Achievement
        </button>
        <button onClick={() => navigate('/achievements/mine')}
          className="w-full py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors text-left px-5">
          My Achievements
        </button>
        <button onClick={() => navigate('/achievements/students')}
          className="w-full py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors text-left px-5">
          View Student Achievements
        </button>
      </div>
    </div>
  )
}
