import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export function SubmitExperience() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [roleApplied, setRoleApplied] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [ctc, setCtc] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [rounds, setRounds] = useState([
    { id: Date.now(), type: 'Technical', difficulty: 'medium', questions: '', tags: [] }
  ]);
  
  const [overallTips, setOverallTips] = useState('');

  const addRound = () => {
    setRounds([...rounds, { id: Date.now(), type: 'Technical', difficulty: 'medium', questions: '', tags: [] }]);
  };

  const removeRound = (id) => {
    setRounds(rounds.filter(r => r.id !== id));
  };

  const updateRound = (id, field, value) => {
    setRounds(rounds.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!user) {
      setError('You must be logged in to submit an experience.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.createSubmission({
        companyName: companyName.trim(),
        roleApplied,
        interviewDate: interviewDate || null,
        ctc: ctc || null,
        isAnonymous,
        overallTips,
        rounds: rounds.map(r => ({
          roundType: r.type,
          difficulty: r.difficulty,
          questions: r.questions,
        })),
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto" />
        </motion.div>
        <h1 className="text-3xl font-bold font-outfit text-brand-teal">Experience Submitted!</h1>
        <p className="text-brand-teal/70 text-lg">
          Thank you for sharing your interview experience. It's now live and helping juniors prepare!
        </p>
        <div className="pt-8">
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-outfit text-brand-teal">Share Your Experience</h1>
        <p className="text-brand-teal/70 mt-2">
          Help your juniors by sharing details about your placement process.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between relative mb-12">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-brand-teal/10 rounded-full z-0"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-teal rounded-full z-0 transition-all duration-300"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        ></div>
        
        {[1, 2, 3].map((num) => (
          <div 
            key={num} 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-colors ${
              step >= num ? 'bg-brand-teal text-white' : 'bg-white text-brand-teal/40 border-2 border-brand-teal/10'
            }`}
          >
            {num}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-bold text-brand-teal mb-4">Basic Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label="Company Name" 
                      required 
                      placeholder="e.g. Amazon, TCS, Google..." 
                      value={companyName} 
                      onChange={e => setCompanyName(e.target.value)} 
                    />
                    <Input label="Role Applied" required placeholder="e.g. Software Engineer" value={roleApplied} onChange={e => setRoleApplied(e.target.value)} />
                    <Input label="Interview Date" type="date" required value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
                    <Input label="CTC Offered (Optional)" placeholder="e.g. 12 LPA" value={ctc} onChange={e => setCtc(e.target.value)} />
                  </div>

                  <div className="pt-4 flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="anonymous" 
                      className="w-5 h-5 rounded text-brand-teal focus:ring-brand-teal"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    <label htmlFor="anonymous" className="text-brand-teal/80">
                      Post anonymously <span className="text-sm text-brand-teal/50">(Your name will be hidden publicly)</span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-brand-teal">Interview Rounds</h2>
                <Button type="button" variant="outline" size="sm" onClick={addRound}>
                  <Plus className="w-4 h-4 mr-2" /> Add Round
                </Button>
              </div>

              {rounds.map((round, index) => (
                <Card key={round.id} className="relative overflow-visible">
                  {rounds.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeRound(round.id)}
                      className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full p-1.5 hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-brand-teal/50">#{index + 1}</span>
                      <select 
                        className="flex h-11 w-full md:w-1/3 rounded-lg border border-brand-teal/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        value={round.type}
                        onChange={(e) => updateRound(round.id, 'type', e.target.value)}
                      >
                        <option value="OA">Online Assessment (OA)</option>
                        <option value="Technical">Technical Interview</option>
                        <option value="HR">HR Interview</option>
                        <option value="Managerial">Managerial Round</option>
                        <option value="GD">Group Discussion</option>
                      </select>
                      
                      <select 
                        className="flex h-11 w-full md:w-1/3 rounded-lg border border-brand-teal/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        value={round.difficulty}
                        onChange={(e) => updateRound(round.id, 'difficulty', e.target.value)}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-brand-teal/80">Questions Asked (One per line)</label>
                      <textarea 
                        required
                        className="flex w-full rounded-lg border border-brand-teal/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal min-h-[100px]"
                        placeholder={"1. Write a program to reverse a linked list...\n2. Difference between thread and process..."}
                        value={round.questions}
                        onChange={(e) => updateRound(round.id, 'questions', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-bold text-brand-teal mb-4">Overall Experience & Tips</h2>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-brand-teal/80">Your Advice for Juniors</label>
                    <textarea 
                      required
                      className="flex w-full rounded-lg border border-brand-teal/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal min-h-[200px]"
                      placeholder="What should they focus on? How was the interview environment? Any specific resources you used to prepare?"
                      value={overallTips}
                      onChange={(e) => setOverallTips(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-8 pt-6 border-t border-brand-teal/10">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setStep(step - 1)}
            disabled={step === 1 || isSubmitting}
          >
            Back
          </Button>
          
          <Button type="submit" isLoading={isSubmitting}>
            {step === 3 ? 'Submit Experience' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}
