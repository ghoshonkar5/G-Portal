import { useState } from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';

interface Flag {
  id: number;
  item_type: string;
  item_id: number;
  reason: string;
  flagged_at: string;
  status: string;
  item_title: string;
}

interface FlagNotificationBannerProps {
  flags: Flag[];
  onViewDetails: () => void;
  onDismiss: () => void;
}

export function FlagNotificationBanner({ flags, onViewDetails, onDismiss }: FlagNotificationBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible || flags.length === 0) return null;

  const redCount = flags.filter(f => f.status === 'flagged').length;
  const amberCount = flags.filter(f => f.status === 'pending_review').length;

  return (
    <div className="relative mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Blinking dot */}
        <span
          className="inline-block w-3 h-3 rounded-full bg-red-500 flex-shrink-0"
          style={{ animation: 'flagBlink 1s infinite' }}
        />

        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">
            {flags.length} item{flags.length > 1 ? 's' : ''} flagged for your attention
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            {redCount > 0 && `${redCount} need${redCount === 1 ? 's' : ''} your action`}
            {redCount > 0 && amberCount > 0 && ' · '}
            {amberCount > 0 && `${amberCount} pending admin review`}
          </p>
        </div>

        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          View Details
          <ChevronRight className="w-3 h-3" />
        </button>

        <button
          onClick={() => { setVisible(false); onDismiss(); }}
          className="text-red-400 hover:text-red-600 transition-colors ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Blink keyframe injected inline */}
      <style>{`
        @keyframes flagBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}