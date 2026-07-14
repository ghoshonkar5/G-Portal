import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import api from '../lib/api';

export function SubmissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.getSubmission(id);
        setSubmission(data);
        setUpvoteCount(data.upvoteCount || 0);
      } catch (err) {
        console.error('Failed to load submission:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleUpvote = async () => {
    if (!user) return;
    // Optimistic update — instant UI feedback
    const wasUpvoted = upvoted;
    setUpvoted(!wasUpvoted);
    setUpvoteCount(prev => wasUpvoted ? prev - 1 : prev + 1);
    try {
      await api.toggleUpvote(id);
    } catch (err) {
      // Revert on failure
      setUpvoted(wasUpvoted);
      setUpvoteCount(prev => wasUpvoted ? prev + 1 : prev - 1);
      console.error('Upvote failed:', err);
    }
  };

  const handleBookmark = async () => {
    if (!user) return;
    try {
      const result = await api.toggleBookmark(id);
      setBookmarked(result.bookmarked);
    } catch (err) {
      console.error('Bookmark failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal/40" />
      </div>
    );
  }

  if (!submission) {
    return <div className="text-center py-20 text-brand-teal/50 text-xl">Submission not found</div>;
  }

  const company = submission.company;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link to="/placements" className="inline-flex items-center text-sm font-medium text-brand-teal/60 hover:text-brand-teal transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </Link>

      <div className="bg-white rounded-2xl p-8 border border-brand-teal/10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center p-2 border border-gray-100">
              <img 
                src={company?.logoUrl || `https://ui-avatars.com/api/?name=${company?.name}&background=0B5045&color=fff`}
                alt={company?.name} 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${company?.name || 'C'}&background=0B5045&color=fff`;
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-outfit text-brand-teal">
                {company?.name} · {submission.roleApplied}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-brand-teal/70">
                <span className="font-medium">
                  {submission.user ? `By ${submission.user.name} (${submission.user.batchYear} ${submission.user.branch || ''})` : 'Anonymous'}
                </span>
                <span>·</span>
                <span>{submission.interviewDate && new Date(submission.interviewDate).toLocaleDateString()}</span>
                {submission.ctc && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">{submission.ctc}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={bookmarked ? "primary" : "outline"} 
              size="sm" 
              onClick={handleBookmark}
              disabled={!user}
            >
              {bookmarked ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
              {bookmarked ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {submission.overallTips && (
            <Card>
              <CardHeader>
                <CardTitle>Overall Experience & Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-brand-teal/80 leading-relaxed whitespace-pre-line">
                  {submission.overallTips}
                </p>
              </CardContent>
            </Card>
          )}

          <h2 className="text-2xl font-bold font-outfit text-brand-teal pt-4">Interview Rounds</h2>
          
          <div className="space-y-6">
            {submission.rounds?.sort((a,b) => a.orderIndex - b.orderIndex).map((round, idx) => (
              <motion.div
                key={round.id || idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-l-4 border-l-brand-teal">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-brand-teal">
                        Round {round.orderIndex}: {round.roundType}
                      </h3>
                      <Badge variant={round.difficulty === 'hard' ? 'warning' : round.difficulty === 'easy' ? 'success' : 'secondary'}>
                        {round.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-brand-teal/70 mb-2 uppercase tracking-wider">Questions Asked</h4>
                        <ul className="list-disc list-inside space-y-2 text-brand-teal/80">
                          {(typeof round.questions === 'string' ? round.questions.split('\n') : round.questions || [])
                            .filter(q => q.trim())
                            .map((q, i) => (
                              <li key={i} className="pl-2">{q.trim()}</li>
                            ))
                          }
                        </ul>
                      </div>
                      
                      {round.tags?.length > 0 && (
                        <div className="pt-4 border-t border-brand-teal/5 flex flex-wrap gap-2">
                          {round.tags.map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card className={`transition-all duration-300 border-2 ${upvoted ? 'border-brand-teal/30 bg-brand-teal/5 shadow-md shadow-brand-teal/10' : 'border-transparent hover:border-brand-teal/20 shadow-sm'}`}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              
              <div className="flex items-center justify-center gap-4 mb-6 mt-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-300 ${upvoted ? 'bg-brand-teal text-white' : 'bg-brand-teal/10 text-brand-teal/70'}`}>
                   <ThumbsUp className={`w-6 h-6 transition-transform duration-300 ${upvoted ? 'fill-white scale-110' : ''}`} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-4xl font-black text-brand-teal tracking-tighter leading-none">
                    {upvoteCount}
                  </span>
                  <span className="text-xs font-semibold text-brand-teal/60 uppercase tracking-widest mt-1">Upvotes</span>
                </div>
              </div>

              <Button 
                className={`w-full group transition-all duration-300 rounded-xl h-12 ${upvoted ? 'bg-brand-teal text-white shadow-md hover:bg-brand-teal/90' : 'bg-white text-brand-teal border-2 border-brand-teal/20 hover:border-brand-teal hover:bg-brand-teal/5'}`}
                onClick={handleUpvote}
                disabled={!user}
              >
                <span className="font-semibold text-base">{upvoted ? 'Upvoted' : 'Upvote Experience'}</span>
              </Button>
              {!user && (
                <p className="text-xs text-brand-teal/50 mt-4">
                  <Link to="/login" className="underline font-medium hover:text-brand-teal">Log in</Link> to upvote
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
