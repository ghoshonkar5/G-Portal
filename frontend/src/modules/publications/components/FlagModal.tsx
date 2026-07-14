import { useState } from 'react';
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertTriangle, Flag, X } from "lucide-react";

interface FlagItem {
  id: string;
  title: string;
}

interface FlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: FlagItem[];
  itemType: 'publication' | 'conference' | 'book';
  onSuccess: () => void;
}

export function FlagModal({ isOpen, onClose, selectedItems, itemType, onSuccess }: FlagModalProps) {
  const [sameReason, setSameReason] = useState(true);
  const [sharedReason, setSharedReason] = useState('');
  const [perItemReasons, setPerItemReasons] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // Validate
    if (sameReason && !sharedReason.trim()) {
      setError('Please enter a reason for flagging.'); return;
    }
    if (!sameReason) {
      const missing = selectedItems.some(item => !perItemReasons[item.id]?.trim());
      if (missing) { setError('Please enter a reason for each item.'); return; }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const flags = selectedItems.map(item => ({
        itemType,
        itemId: parseInt(item.id),
        reason: sameReason ? sharedReason.trim() : perItemReasons[item.id].trim(),
      }));

      const token = localStorage.getItem('token') || '';
      const res = await fetch(
        `/api/flags`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ flags, flaggedBy: 'Admin' }),
        }
      );

      if (!res.ok) throw new Error('Failed to create flags');
      onSuccess();
      onClose();
      // Reset
      setSharedReason('');
      setPerItemReasons({});
      setSameReason(true);
    } catch {
      setError('Failed to flag items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col top-[50%] translate-y-[-50%]">
        <div className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>


          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Flag Items</h2>
              <p className="text-xs text-gray-500">
                Flagging {selectedItems.length} {itemType}(s) for faculty attention
              </p>
            </div>
          </div>

          {/* Selected items list */}
          <div className="mb-5 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Selected Items</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedItems.map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">🚩</span>
                  <span className="text-sm text-gray-700 line-clamp-1">{item.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Same reason toggle */}
          {selectedItems.length > 1 && (
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => setSameReason(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sameReason
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                Same reason for all
              </button>
              <button
                onClick={() => setSameReason(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  !sameReason
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                Different reason per item
              </button>
            </div>
          )}

          {/* Reason input(s) */}
          {sameReason ? (
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Reason for flagging
              </label>
              <textarea
                value={sharedReason}
                onChange={e => setSharedReason(e.target.value)}
                placeholder="Explain what needs to be corrected or updated..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            </div>
          ) : (
            <div className="mb-5 space-y-4">
              {selectedItems.map(item => (
                <div key={item.id}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block line-clamp-1">
                    Reason for: <span className="text-gray-800">{item.title}</span>
                  </label>
                  <textarea
                    value={perItemReasons[item.id] || ''}
                    onChange={e => setPerItemReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Explain what needs to be corrected..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Flag className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Flagging...' : `Flag ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}