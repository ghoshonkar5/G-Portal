import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Flag, CheckCircle, Trash2, RotateCcw } from "lucide-react";

interface Flag {
  id: number;
  item_type: string;
  item_id: number;
  reason: string;
  flagged_at: string;
  flagged_by: string;
  status: string;
  faculty_note?: string;
  resolved_at?: string;
  approved_at?: string;
  item_title: string;
    reflag_count?: number;

}

import { useState, useEffect } from 'react';


interface FlagReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyName: string;
  flags: Flag[];
  onApprove: (flagId: number) => Promise<void>;
  onApproveAll: (flagIds: number[]) => Promise<void>;
  onDelete: (flagId: number) => Promise<void>;
  onRefresh: () => void;
}

function AdminFlagHistory({ flagId }: { flagId: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && history.length === 0) {
      fetch(`/api/flags/${flagId}/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      })
        .then(r => r.json())
        .then(d => { if (d.success) setHistory(d.data); });
    }
  }, [expanded]);

  return (
    <div className="mb-3 border border-orange-100 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-2 py-1.5 bg-orange-50 text-xs font-semibold text-orange-700 flex items-center justify-between">
        📋 Flag History ({history.length} previous cycle{history.length > 1 ? 's' : ''})
        <span>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-orange-50">
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-2">Loading...</p>
          ) : history.map((h, i) => (
            <div key={h.id} className="px-2 py-2 bg-white">
              <p className="text-xs font-semibold text-gray-500 mb-1">Cycle {i + 1}</p>
              <p className="text-xs text-gray-600 mb-0.5">
                <span className="font-medium">Reason:</span> {h.reason}
              </p>
              {h.faculty_note && (
                <p className="text-xs text-gray-600 mb-0.5">
                  <span className="font-medium">Faculty note:</span> {h.faculty_note}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(h.reflagged_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  if (status === 'flagged') return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'flagBlink 1s infinite' }} />
      Awaiting Faculty
    </span>
  );
  if (status === 'pending_review') return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" style={{ animation: 'flagBlink 1s infinite' }} />
      Pending Review
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" />
      Resolved
    </span>
  );
}

export function FlagReviewModal({
  isOpen, onClose, facultyName, flags: initialFlags,
  onApprove, onApproveAll, onDelete, onRefresh
}: FlagReviewModalProps) {
  // ── FIX 2: local flags state so UI updates instantly after any action ──
  const [flags, setFlags] = useState<Flag[]>(initialFlags);

// Replace the useEffect we added with this:
useEffect(() => {
  console.log('useEffect fired, isOpen:', isOpen, 'reflaggingId:', reflaggingId);
  if (isOpen) {
    setFlags(initialFlags);
    setReflaggingId(null);  // ← IS THIS SOMEWHERE IN YOUR CODE?
  }
}, [isOpen]);

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  // ── FIX 1: re-flag state ──
  const [reflaggingId, setReflaggingId] = useState<number | null>(null);
  const [reflagReasons, setReflagReasons] = useState<Record<number, string>>({});
  const [submittingReflag, setSubmittingReflag] = useState<number | null>(null);

  // Keep local state in sync if parent pushes new flags (e.g. on modal reopen)
  // We do this via key prop on the parent if needed, but useState(initialFlags) 
  // is fine since each modal open is a fresh mount.

  const pendingReviewFlags = flags.filter(f => f.status === 'pending_review');
  const awaitingFlags = flags.filter(f => f.status === 'flagged');
  const resolvedFlags = flags.filter(f => f.status === 'resolved');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const typeLabel = (type: string) => {
    if (type === 'publication') return 'Publication';
    if (type === 'conference') return 'Conference';
    return 'Book/Chapter';
  };

  // ── FIX 2: helpers that update local state immediately ──
  const removeFlag = (flagId: number) =>
    setFlags(prev => prev.filter(f => f.id !== flagId));

  const updateFlag = (updated: Flag) =>
    setFlags(prev => prev.map(f => f.id === updated.id ? updated : f));

  const handleApprove = async (flagId: number) => {
    setApprovingId(flagId);
    try {
      await onApprove(flagId);
      // Optimistically mark as resolved locally
      updateFlag({ ...flags.find(f => f.id === flagId)!, status: 'resolved', approved_at: new Date().toISOString() });
      onRefresh();
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveAll = async () => {
    setApprovingAll(true);
    try {
      const ids = pendingReviewFlags.map(f => f.id);
      await onApproveAll(ids);
      setFlags(prev => prev.map(f =>
        ids.includes(f.id) ? { ...f, status: 'resolved', approved_at: new Date().toISOString() } : f
      ));
      onRefresh();
    } finally {
      setApprovingAll(false);
    }
  };

  const handleDelete = async (flagId: number) => {
    setDeletingId(flagId);
    try {
      await onDelete(flagId);
      removeFlag(flagId); // ── FIX 2: instant removal ──
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  // ── FIX 1: re-flag handler ──
  const handleReflag = async (flagId: number) => {
    const reason = reflagReasons[flagId]?.trim();
    if (!reason) return;
    setSubmittingReflag(flagId);
    try {

      const res = await fetch(`/api/flags/${flagId}/reflag`, {
  method: 'PUT',
  headers: { 
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  },
  body: JSON.stringify({ reason }),
});


      const data = await res.json();
      if (data.success) {
        updateFlag({ ...flags.find(f => f.id === flagId)!, ...data.data }); // ── FIX 2: instant update ──
        setReflaggingId(null);
        setReflagReasons(prev => { const n = { ...prev }; delete n[flagId]; return n; });
        onRefresh();
      }
    } finally {
      setSubmittingReflag(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col top-[50%] translate-y-[-50%]">
        <div className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <Flag className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Flag Review</h2>
                <p className="text-xs text-gray-500">{facultyName}</p>
              </div>
            </div>
            {pendingReviewFlags.length > 1 && (
              <Button
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                {approvingAll ? 'Approving...' : `Approve All (${pendingReviewFlags.length})`}
              </Button>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Awaiting Faculty', count: awaitingFlags.length, color: 'red' },
              { label: 'Pending Review', count: pendingReviewFlags.length, color: 'amber' },
              { label: 'Resolved', count: resolvedFlags.length, color: 'green' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-xl p-3 bg-${color}-50 border border-${color}-100 text-center`}>
                <p className={`text-2xl font-semibold text-${color}-700`}>{count}</p>
                <p className={`text-xs text-${color}-600`}>{label}</p>
              </div>
            ))}
          </div>

          {flags.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No flags for this faculty member.</p>
            </div>
          ) : (
            <div className="space-y-3">

              {/* Pending Review */}
              {pendingReviewFlags.length > 0 && (
                <p className="text-xs font-semibold text-gray-500 uppercase">Pending Your Approval</p>
              )}
              {pendingReviewFlags.map(flag => (
                <div key={flag.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                     <p className="text-xs text-amber-600 font-medium mb-0.5">{typeLabel(flag.item_type)}</p>
<p className="text-sm font-medium text-gray-800 line-clamp-2">{flag.item_title}</p>
{flag.reflag_count && flag.reflag_count > 0 ? (
  <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full mt-1 inline-block">
    🔁 Reflagged {flag.reflag_count} time{flag.reflag_count > 1 ? 's' : ''}
  </span>
) : null}
                    </div>
                    <StatusBadge status={flag.status} />
                  </div>

                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Original reason:</p>
                    <p className="text-xs text-gray-700 bg-white rounded-lg px-2 py-1.5 border border-gray-100">{flag.reason}</p>
                  </div>

                  {flag.faculty_note && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">Faculty note:</p>
                      <p className="text-xs text-gray-700 bg-white rounded-lg px-2 py-1.5 border border-amber-100">{flag.faculty_note}</p>
                    </div>
                  )}

<p className="text-xs text-gray-400 mb-3">Faculty resolved on {formatDate(flag.resolved_at)}</p>
{flag.reflag_count && flag.reflag_count > 0 ? (
  <AdminFlagHistory flagId={flag.id} />
) : null}
                  {/* ── FIX 1: Re-flag inline form ── */}
                  {reflaggingId === flag.id ? (
<div id={`reflag-${flag.id}`} className="mb-3 bg-white rounded-lg border border-orange-200 p-2">
                      <p className="text-xs font-semibold text-orange-700 mb-1">Enter new reason for re-flagging:</p>
                      <textarea
                        value={reflagReasons[flag.id] || ''}
                        onChange={e => setReflagReasons(prev => ({ ...prev, [flag.id]: e.target.value }))}
                        placeholder="Explain why the resolution is unsatisfactory..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none mb-2"
                      />
<div className="flex flex-col gap-2">
                     <button
  onClick={() => handleReflag(flag.id)}
  disabled={submittingReflag === flag.id}
  style={{ backgroundColor: '#f97316', color: 'white', fontSize: '12px', height: '28px', padding: '0 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer' }}
>
  <RotateCcw className="w-3 h-3" />
  {submittingReflag === flag.id ? 'Sending...' : 'Send Back to Faculty'}
</button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReflaggingId(null)}
                          className="text-xs h-7 px-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(flag.id)}
                      disabled={approvingId === flag.id || reflaggingId === flag.id}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {approvingId === flag.id ? 'Approving...' : 'Approve Resolution'}
                    </Button>
                    {/* ── FIX 1: Re-flag button ── */}
                    {reflaggingId !== flag.id && (
                      <Button
                        size="sm"
                        variant="outline"
onClick={() => {
  setReflaggingId(flag.id);
  setTimeout(() => {
    document.getElementById(`reflag-${flag.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}}                        className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs h-7 px-3"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Re-flag
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(flag.id)}
                      disabled={deletingId === flag.id}
                      className="text-red-500 border-red-200 hover:bg-red-50 text-xs h-7 px-3"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {deletingId === flag.id ? 'Deleting...' : 'Delete Flag'}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Awaiting Faculty */}
              {awaitingFlags.length > 0 && (
                <p className="text-xs font-semibold text-gray-500 uppercase mt-4">Awaiting Faculty Action</p>
              )}
              {awaitingFlags.map(flag => (
                <div key={flag.id} className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs text-red-600 font-medium mb-0.5">{typeLabel(flag.item_type)}</p>
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">{flag.item_title}</p>
                    </div>
                    <StatusBadge status={flag.status} />
                  </div>
                  <p className="text-xs text-gray-700 bg-white rounded-lg px-2 py-1.5 border border-gray-100 mb-2">{flag.reason}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Flagged on {formatDate(flag.flagged_at)}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(flag.id)}
                      disabled={deletingId === flag.id}
                      className="text-red-500 border-red-200 hover:bg-red-50 text-xs h-7 px-3"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {deletingId === flag.id ? 'Removing...' : 'Remove Flag'}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Resolved */}
              {resolvedFlags.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase mt-4">Resolved</p>
                  {resolvedFlags.map(flag => (
                    <div key={flag.id} className="rounded-xl border border-green-200 bg-green-50 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-700 line-clamp-2">{flag.item_title}</p>
                        <StatusBadge status={flag.status} />
                      </div>
                      <p className="text-xs text-gray-400">
                        Resolved on {formatDate(flag.resolved_at)} · Approved on {formatDate(flag.approved_at)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end mt-5">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>

        <style>{`
          @keyframes flagBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}