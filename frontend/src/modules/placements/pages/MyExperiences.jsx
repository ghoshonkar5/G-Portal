import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, Eye, Loader2, Calendar, Building2, Trash2, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export function MyExperiences() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchMySubmissions() {
      try {
        const data = await api.getMySubmissions();
        setSubmissions(data);
      } catch (err) {
        console.error('Failed to load my submissions:', err);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchMySubmissions();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSubmission(deleteTarget.id);
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete submission:', err);
      alert('Failed to delete submission. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-brand-teal/60 text-lg">Please <Link to="/login" className="underline font-medium text-brand-teal">log in</Link> to view your experiences.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal/40" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-outfit text-brand-teal">My Experiences</h1>
        <p className="text-brand-teal/60 mt-2">Interview experiences you've shared with the community.</p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-brand-teal/50 text-lg mb-4">You haven't shared any experiences yet.</p>
            <Link to="/placements/submit" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-brand-teal text-white font-semibold hover:bg-brand-teal/90 transition-colors">
              Share Your First Experience
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub, idx) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={`/placements/submissions/${sub.id}`}>
                <Card className="hover:shadow-md hover:border-brand-teal/20 transition-all duration-200 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center p-2 border border-gray-100">
                          <img
                            src={sub.company?.logoUrl || `https://ui-avatars.com/api/?name=${sub.company?.name}&background=0B5045&color=fff`}
                            alt={sub.company?.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${sub.company?.name || 'C'}&background=0B5045&color=fff`;
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-brand-teal font-outfit">
                            {sub.company?.name} · {sub.roleApplied}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-brand-teal/60">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {sub.interviewDate && new Date(sub.interviewDate).toLocaleDateString()}
                            </span>
                            {sub.ctc && (
                              <Badge variant="success">{sub.ctc}</Badge>
                            )}
                            <Badge variant={sub.status === 'approved' ? 'success' : sub.status === 'pending' ? 'warning' : 'secondary'}>
                              {sub.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 text-sm">
                        <div className="flex items-center gap-1.5 text-brand-teal/70">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="font-bold text-brand-teal text-lg">{sub.upvoteCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-brand-teal/50">
                          <Eye className="w-4 h-4" />
                          <span className="font-medium">{sub.viewCount || 0}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteTarget(sub);
                          }}
                          className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                          title="Delete experience"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => !deleting && setDeleteTarget(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-outfit">Delete Experience</h2>
              </div>

              <p className="text-gray-600 mb-2">
                Are you sure you want to delete your experience at{' '}
                <span className="font-semibold text-brand-teal">{deleteTarget.company?.name}</span> for the{' '}
                <span className="font-semibold text-brand-teal">{deleteTarget.roleApplied}</span> role?
              </p>
              <p className="text-sm text-red-500 mb-6">
                This action cannot be undone. All comments, upvotes, and bookmarks associated with this experience will also be removed.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
