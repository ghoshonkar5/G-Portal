import type { Achievement } from '../types'
import { formatDate, capitalize } from '../utils'

interface Props {
  achievement: Achievement
  showActions?: boolean
  onView: (a: Achievement) => void
  onEdit?: (a: Achievement) => void
  onDelete?: (id: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  academic:  'bg-[#E5DDC6]/30 text-[#101A24]',
  technical: 'bg-purple-50 text-purple-700',
  sports:    'bg-green-50 text-green-700',
  cultural:  'bg-orange-50 text-orange-700',
  other:     'bg-gray-100 text-gray-600',
}

export default function AchievementCard({
  achievement: a, showActions = true, onView, onEdit, onDelete,
}: Props) {
  const isDraft = a.status === 'draft'
  const tag     = 'px-2 py-0.5 rounded-full text-xs font-medium'

  return (
    <div className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow ${
      isDraft ? 'border-dashed border-gray-300 bg-gray-50/50' : 'border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {a.title || <em className="text-gray-400 font-normal not-italic">Untitled Draft</em>}
            </h3>
            {isDraft && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                Draft
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {a.event_name || '—'} · {formatDate(a.start_date)}
          </p>
          {/* shown when admin/faculty views student achievements */}
          {a.student_name && (
            <p className="text-xs font-semibold text-[#101A24] mt-1">
              {a.student_name}{a.roll_number ? ` (${a.roll_number})` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {a.event_type && (
          <span className={`${tag} ${TYPE_COLORS[a.event_type] || TYPE_COLORS.other}`}>
            {capitalize(a.event_type)}
          </span>
        )}
        {a.level && (
          <span className={`${tag} bg-gray-100 text-gray-600`}>{capitalize(a.level)}</span>
        )}
        {a.result && (
          <span className={`${tag} bg-[#E5DDC6]/30 text-[#101A24]`}>{capitalize(a.result)}</span>
        )}

        <div className="ml-auto flex gap-2 shrink-0">
          <button onClick={() => onView(a)}
            className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            View
          </button>
          {showActions && onEdit && (
            <button onClick={() => onEdit(a)}
              className="px-3 py-1 text-xs font-medium bg-[#E5DDC6]/30 text-[#101A24] border border-[#E5DDC6] rounded-md hover:bg-[#E5DDC6]/50 transition-colors">
              {isDraft ? 'Complete & Submit' : 'Edit'}
            </button>
          )}
          {showActions && onDelete && (
            <button onClick={() => onDelete(a.id)}
              className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
