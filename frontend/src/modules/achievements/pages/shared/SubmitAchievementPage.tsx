import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AchievementForm from '../../components/AchievementForm'
import { submitAchievement } from '../../api/achievementsApi'

export default function SubmitAchievementPage() {
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (fd: FormData, action: 'submit' | 'draft') => {
    setLoading(true)
    try {
      await submitAchievement(fd)
      setToast(action === 'draft' ? 'Draft saved!' : 'Achievement submitted successfully!')
      setTimeout(() => navigate('/achievements/mine'), 1500)
    } catch (err: any) {
      throw new Error(err?.response?.data?.error || 'Submission failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Submit Achievement</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the details below. You can save a draft and come back later.
        </p>
      </div>

      {toast && (
        <div className="mb-4 bg-[#E5DDC6]/30 border border-[#E5DDC6] text-[#101A24] px-4 py-3 rounded-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <AchievementForm
          mode="submit"
          loading={loading}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/achievements')}
        />
      </div>
    </div>
  )
}
