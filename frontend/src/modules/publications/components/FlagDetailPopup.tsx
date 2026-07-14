import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Flag, BookOpen, Users, FileText, ChevronRight, CheckCircle, Clock, AlertCircle, Pencil, ArrowRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

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
  item_title: string;
  reflag_count?: number;
}

interface FlagDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  flags: Flag[];
  onMarkResolved: (flagId: number, note: string) => Promise<void>;
  onEditItem?: (itemId: number) => void;
  initialEditConfirmed?: Set<number>;
}

// ── Flag History (expandable previous cycles) ─────────────────────────────────
function FlagHistory({ flagId }: { flagId: number }) {
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

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          fontSize: '11px', fontWeight: 600, color: '#b45309',
          display: 'flex', alignItems: 'center', gap: '4px',
          marginBottom: '8px', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}
      >
        📋 View flag history ({history.length === 0 ? 'load' : history.length + ' cycle' + (history.length !== 1 ? 's' : '')})
      </button>
    );
  }

  return (
    <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #fed7aa' }}>
      <button
        onClick={() => setExpanded(false)}
        style={{
          width: '100%', textAlign: 'left', padding: '8px 12px',
          fontSize: '11px', fontWeight: 700,
          display: 'flex', justifyContent: 'space-between',
          backgroundColor: '#fff7ed', color: '#c2410c',
          border: 'none', cursor: 'pointer',
        }}
      >
        <span>📋 Flag History — {history.length} previous cycle{history.length !== 1 ? 's' : ''}</span>
        <span>▲</span>
      </button>
      <div style={{ backgroundColor: 'white' }}>
        {history.length === 0 ? (
          <p style={{ fontSize: '11px', color: '#9ca3af', padding: '8px 12px' }}>Loading...</p>
        ) : history.map((h, i) => (
          <div key={h.id} style={{ padding: '10px 12px', borderTop: i > 0 ? '1px solid #fff7ed' : 'none' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#c2410c', marginBottom: '6px' }}>Round {i + 1}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ backgroundColor: '#fff7ed', borderRadius: '6px', padding: '6px 8px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', marginBottom: '2px' }}>Admin flagged:</p>
                <p style={{ fontSize: '11px', color: '#374151' }}>{h.reason}</p>
              </div>
              {h.faculty_note && (
                <div style={{ backgroundColor: '#f0fdf4', borderRadius: '6px', padding: '6px 8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', marginBottom: '2px' }}>Your response:</p>
                  <p style={{ fontSize: '11px', color: '#374151' }}>{h.faculty_note}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>
              {new Date(h.reflagged_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'flagged') return (
    <span style={{
      backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '11px',
      fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', animation: 'flagBlink 1s infinite', flexShrink: 0 }} />
      Action Needed
    </span>
  );
  if (status === 'pending_review') return (
    <span style={{
      backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px',
      fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block', animation: 'flagBlink 1s infinite', flexShrink: 0 }} />
      Pending Review
    </span>
  );
  return (
    <span style={{
      backgroundColor: '#dcfce7', color: '#166534', fontSize: '11px',
      fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      <CheckCircle style={{ width: '11px', height: '11px' }} />
      Resolved
    </span>
  );
}

// ── Step indicator pill ───────────────────────────────────────────────────────
function StepPill({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        width: '20px', height: '20px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontWeight: 700, flexShrink: 0,
        backgroundColor: done ? '#22c55e' : active ? '#101A24' : '#e5e7eb',
        color: done || active ? 'white' : '#9ca3af',
      }}>
        {done ? '✓' : num}
      </span>
      <span style={{ fontSize: '11px', fontWeight: 600, color: done ? '#16a34a' : active ? '#101A24' : '#9ca3af' }}>
        {label}
      </span>
    </div>
  );
}

// ── Inline toast ──────────────────────────────────────────────────────────────
function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
      borderRadius: '8px', padding: '8px 10px', marginTop: '6px',
    }}>
      <AlertCircle style={{ width: '13px', height: '13px', color: '#dc2626', flexShrink: 0 }} />
      <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>{message}</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function FlagDetailPopup({ isOpen, onClose, flags, onMarkResolved, onEditItem, initialEditConfirmed }: FlagDetailPopupProps) {
  const navigate = useNavigate();
  // Which flag has the resolve panel open
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  // Tracks flags where the faculty has confirmed they made edits (unlocks Step 2)
  const [editConfirmed, setEditConfirmed] = useState<Set<number>>(new Set());
  // Note text per flag
  const [notes, setNotes] = useState<Record<number, string>>({});
  // Submission state
  const [submitting, setSubmitting] = useState<number | null>(null);
  // Per-flag inline errors
  const [errors, setErrors] = useState<Record<number, string>>({});

  // When popup opens with pre-confirmed edits (post-edit flow), apply them
  useEffect(() => {
    if (isOpen && initialEditConfirmed && initialEditConfirmed.size > 0) {
      setEditConfirmed(new Set(initialEditConfirmed));
      const firstId = [...initialEditConfirmed][0];
      setResolvingId(firstId);
    }
  }, [isOpen]);

  // Reset on close
  const handleClose = () => {
    setResolvingId(null);
    setEditConfirmed(new Set());
    setNotes({});
    setErrors({});
    onClose();
  };

  const confirmEdit = (flagId: number) => {
    setEditConfirmed(prev => new Set([...prev, flagId]));
    setErrors(prev => ({ ...prev, [flagId]: '' }));
  };

  const navigateToEdit = (route: string) => {
    handleClose();
    navigate(route);
  };

  const handleResolve = async (flagId: number) => {
    const note = notes[flagId]?.trim();
    if (!note) {
      setErrors(prev => ({ ...prev, [flagId]: 'Please describe what you fixed before submitting.' }));
      return;
    }
    setErrors(prev => ({ ...prev, [flagId]: '' }));
    setSubmitting(flagId);
    try {
      await onMarkResolved(flagId, note);
      setResolvingId(null);
      setEditConfirmed(prev => { const n = new Set(prev); n.delete(flagId); return n; });
      setNotes(prev => { const n = { ...prev }; delete n[flagId]; return n; });
    } catch {
      setErrors(prev => ({ ...prev, [flagId]: 'Submission failed. Please try again.' }));
    } finally {
      setSubmitting(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatDateShort = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const accentColor   = (s: string) => s === 'flagged' ? '#ef4444' : s === 'pending_review' ? '#f59e0b' : '#22c55e';
  const cardBg        = (s: string) => s === 'flagged' ? '#fff5f5' : s === 'pending_review' ? '#fffbeb' : '#f0fdf4';
  const cardBorder    = (s: string) => s === 'flagged' ? '#fca5a5' : s === 'pending_review' ? '#fcd34d' : '#86efac';

  const routeForType = (type: string) =>
    type === 'publication' ? '/publications/publications' : type === 'conference' ? '/publications/conferences' : '/publications/books';

  const labelForType = (type: string) =>
    type === 'publication' ? 'Publication' : type === 'conference' ? 'Conference' : 'Book/Chapter';

  const publications = flags.filter(f => f.item_type === 'publication');
  const conferences  = flags.filter(f => f.item_type === 'conference');
  const books        = flags.filter(f => f.item_type === 'book');

  const actionCount  = flags.filter(f => f.status === 'flagged').length;
  const pendingCount = flags.filter(f => f.status === 'pending_review').length;

  const renderFlagCard = (flag: Flag) => {
    const isResolvingThis = resolvingId === flag.id;
    const hasConfirmedEdit = editConfirmed.has(flag.id);
    const itemLabel = labelForType(flag.item_type);
    const route = routeForType(flag.item_type);

    return (
      <div
        key={flag.id}
        style={{
          borderRadius: '12px',
          border: `1px solid ${cardBorder(flag.status)}`,
          backgroundColor: cardBg(flag.status),
          overflow: 'hidden',
          display: 'flex',
          marginBottom: '10px',
        }}
      >
        {/* Left accent bar */}
        <div style={{ width: '4px', flexShrink: 0, backgroundColor: accentColor(flag.status) }} />

        {/* Card body */}
        <div style={{ padding: '14px 16px', flex: 1, minWidth: 0 }}>

          {/* Title + status row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: 1.4, marginBottom: '4px' }}>
                {flag.item_title}
              </p>
              {flag.reflag_count && flag.reflag_count > 0 ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', fontWeight: 600, color: '#c2410c',
                  backgroundColor: '#ffedd5', border: '1px solid #fed7aa',
                  padding: '2px 8px', borderRadius: '999px',
                }}>
                  🔁 Reflagged {flag.reflag_count}×
                </span>
              ) : null}
            </div>
            <StatusBadge status={flag.status} />
          </div>

          {/* Admin reason */}
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Admin flagged reason
            </p>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
              {flag.reason}
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
            <AlertCircle style={{ width: '11px', height: '11px', color: '#9ca3af', flexShrink: 0 }} />
            <p style={{ fontSize: '11px', color: '#9ca3af' }}>
              Flagged by <span style={{ fontWeight: 600, color: '#6b7280' }}>{flag.flagged_by}</span> · {formatDateShort(flag.flagged_at)}
            </p>
          </div>

          {/* History cycles */}
          {flag.reflag_count && flag.reflag_count > 0 ? <FlagHistory flagId={flag.id} /> : null}

          {/* ── RESOLVE SECTION — status: flagged ─────────────────────────── */}
          {flag.status === 'flagged' && (
            <>
              {!isResolvingThis ? (
                <button
                  onClick={() => setResolvingId(flag.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    marginTop: '4px', fontSize: '12px', fontWeight: 600,
                    color: '#101A24', backgroundColor: 'white',
                    border: '1.5px solid #101A24', padding: '7px 14px',
                    borderRadius: '8px', cursor: 'pointer',
                  }}
                >
                  <CheckCircle style={{ width: '13px', height: '13px' }} />
                  Mark as Resolved
                </button>
              ) : (
                <div style={{
                  marginTop: '8px', backgroundColor: 'white',
                  borderRadius: '12px', border: '1.5px solid #d1fae5',
                  overflow: 'hidden',
                }}>
                  {/* Step header */}
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0fdf4', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#f8fffe' }}>
                    <StepPill num={1} label="Edit the record"        active={!hasConfirmedEdit} done={hasConfirmedEdit} />
                    <div style={{ width: '20px', height: '1px', backgroundColor: '#d1d5db' }} />
                    <StepPill num={2} label="Describe your fix"      active={hasConfirmedEdit}  done={false} />
                    <div style={{ width: '20px', height: '1px', backgroundColor: '#d1d5db' }} />
                    <StepPill num={3} label="Submit for review"      active={false}             done={false} />
                  </div>

                  <div style={{ padding: '14px' }}>

                    {/* ── STEP 1: Edit gate ── */}
                    {!hasConfirmedEdit && (
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                          First, fix the issue in your {itemLabel.toLowerCase()}
                        </p>
                        <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5 }}>
                          Admin flagged a problem with this record. Please edit it to address the reason above, then come back here to describe what you changed.
                        </p>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {/* Navigate to edit */}
                          <button
                            onClick={() => {
                              if (onEditItem) {
                                handleClose();
                                onEditItem(flag.item_id);
                              } else {
                                navigateToEdit(route);
                              }
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              backgroundColor: '#101A24', color: 'white',
                              fontSize: '12px', fontWeight: 600,
                              padding: '8px 14px', borderRadius: '8px',
                              border: 'none', cursor: 'pointer',
                            }}
                          >
                            <Pencil style={{ width: '13px', height: '13px' }} />
                            Go Edit {itemLabel}
                            <ArrowRight style={{ width: '12px', height: '12px' }} />
                          </button>

                          {/* Already edited */}
                          <button
                            onClick={() => confirmEdit(flag.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              backgroundColor: 'white', color: '#101A24',
                              fontSize: '12px', fontWeight: 600,
                              padding: '8px 14px', borderRadius: '8px',
                              border: '1.5px solid #101A24', cursor: 'pointer',
                            }}
                          >
                            <CheckCircle style={{ width: '13px', height: '13px' }} />
                            I've Already Fixed It
                          </button>

                          <button
                            onClick={() => setResolvingId(null)}
                            style={{
                              fontSize: '12px', fontWeight: 500, color: '#9ca3af',
                              padding: '8px 12px', borderRadius: '8px',
                              border: '1px solid #e5e7eb', backgroundColor: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 2: Describe fix ── */}
                    {hasConfirmedEdit && (
                      <div>
                        {/* Confirmation pill */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          backgroundColor: '#dcfce7', border: '1px solid #86efac',
                          borderRadius: '8px', padding: '6px 10px', marginBottom: '12px',
                        }}>
                          <CheckCircle style={{ width: '12px', height: '12px', color: '#16a34a' }} />
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>
                            Edit confirmed — now describe what you changed
                          </span>
                        </div>

                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                          What did you fix? <span style={{ color: '#ef4444' }}>*</span>
                        </p>
                        <textarea
                          value={notes[flag.id] || ''}
                          onChange={e => {
                            setNotes(prev => ({ ...prev, [flag.id]: e.target.value }));
                            if (errors[flag.id]) setErrors(prev => ({ ...prev, [flag.id]: '' }));
                          }}
                          placeholder="Describe exactly what you changed or corrected — e.g. 'Updated journal name from X to Y and added the correct DOI'..."
                          rows={3}
                          style={{
                            width: '100%',
                            border: `1.5px solid ${errors[flag.id] ? '#ef4444' : '#d1d5db'}`,
                            borderRadius: '8px', padding: '8px 10px',
                            fontSize: '12px', resize: 'none', outline: 'none',
                            marginBottom: '4px', boxSizing: 'border-box',
                            lineHeight: 1.5,
                          }}
                        />

                        <InlineError message={errors[flag.id] || ''} />

                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleResolve(flag.id)}
                            disabled={submitting === flag.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              backgroundColor: '#101A24', color: 'white',
                              fontSize: '12px', fontWeight: 600,
                              padding: '8px 16px', borderRadius: '8px',
                              border: 'none', cursor: submitting === flag.id ? 'not-allowed' : 'pointer',
                              opacity: submitting === flag.id ? 0.7 : 1,
                            }}
                          >
                            <CheckCircle style={{ width: '13px', height: '13px' }} />
                            {submitting === flag.id ? 'Submitting...' : 'Submit for Admin Review'}
                          </button>

                          {/* Back to step 1 */}
                          <button
                            onClick={() => setEditConfirmed(prev => { const n = new Set(prev); n.delete(flag.id); return n; })}
                            style={{
                              fontSize: '12px', color: '#6b7280',
                              padding: '8px 12px', borderRadius: '8px',
                              border: '1px solid #e5e7eb', backgroundColor: 'white',
                              cursor: 'pointer', fontWeight: 500,
                            }}
                          >
                            ← Back
                          </button>

                          <button
                            onClick={() => { setResolvingId(null); setEditConfirmed(prev => { const n = new Set(prev); n.delete(flag.id); return n; }); setErrors(prev => ({ ...prev, [flag.id]: '' })); }}
                            style={{
                              fontSize: '12px', color: '#9ca3af',
                              padding: '8px 12px', borderRadius: '8px',
                              border: '1px solid #e5e7eb', backgroundColor: 'white',
                              cursor: 'pointer', fontWeight: 500,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PENDING REVIEW ── */}
          {flag.status === 'pending_review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fef3c7', borderRadius: '8px', padding: '8px 10px' }}>
                <Clock style={{ width: '13px', height: '13px', color: '#d97706', flexShrink: 0 }} />
                <p style={{ fontSize: '11px', color: '#92400e', fontWeight: 500 }}>
                  Awaiting admin review · Submitted {flag.resolved_at ? formatDateShort(flag.resolved_at) : '—'}
                </p>
              </div>
              {flag.faculty_note && (
                <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '8px 10px', border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', marginBottom: '2px' }}>Your note:</p>
                  <p style={{ fontSize: '11px', color: '#374151' }}>{flag.faculty_note}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (sectionFlags: Flag[], label: string, Icon: any, route: string) => {
    if (sectionFlags.length === 0) return null;
    const needAction = sectionFlags.filter(f => f.status === 'flagged').length;

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#E6F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon style={{ width: '14px', height: '14px', color: '#101A24' }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>{label}</p>
            {needAction > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '999px' }}>
                {needAction} need action
              </span>
            )}
          </div>
          <button
            onClick={() => { handleClose(); navigate(route); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 600, color: '#101A24', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Go to {label} <ChevronRight style={{ width: '13px', height: '13px' }} />
          </button>
        </div>
        {sectionFlags.map(flag => renderFlagCard(flag))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col top-[50%] translate-y-[-50%]">
<div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)', transform: 'translateZ(0)', willChange: 'transform' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Flag style={{ width: '18px', height: '18px', color: '#dc2626' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Flagged Items</h2>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {actionCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>{actionCount} need your action</span>}
                {actionCount > 0 && pendingCount > 0 && ' · '}
                {pendingCount > 0 && <span style={{ color: '#92400e' }}>{pendingCount} pending admin review</span>}
              </p>
            </div>
            {/* How it works note */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 10px', maxWidth: '200px' }}>
              <p style={{ fontSize: '10px', color: '#166534', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700 }}>How to resolve:</span> Edit the record → confirm → describe your fix → submit
              </p>
            </div>
          </div>

          {flags.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#E6F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: '#101A24' }} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>All clear!</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>No flagged items at the moment</p>
            </div>
          ) : (
            <>
              {renderSection(publications, 'Publications',     FileText, '/publications/publications')}
{renderSection(conferences,  'Conferences',      Users,    '/publications/conferences')}
{renderSection(books,        'Books & Chapters', BookOpen, '/publications/books')}
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            <button
              onClick={handleClose}
              style={{ fontSize: '13px', fontWeight: 500, color: '#4b5563', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer' }}
            >
              Close
            </button>
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