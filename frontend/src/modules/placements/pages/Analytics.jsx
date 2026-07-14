import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { AnalyticsErrorBoundary } from '../components/analytics/ErrorBoundary';
import { TopicHeatmap } from '../components/analytics/TopicHeatmap';
import { TopicFrequency } from '../components/analytics/TopicFrequency';
import { TopQuestions } from '../components/analytics/TopQuestions';
import { SearchGaps } from '../components/analytics/SearchGaps';
import { ContributorLeaderboard } from '../components/analytics/ContributorLeaderboard';
import { BarChart3, Shield, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'];
const BATCH_YEARS = [2024, 2025, 2026, 2027];

export function Analytics() {
  const { user } = useAuth();
  const isModerator = user?.role === 'moderator';
  
  const [activeTab, setActiveTab] = useState('intelligence');
  const [branch, setBranch] = useState('');
  const [batchYear, setBatchYear] = useState('');

  // Placement Intelligence data
  const [heatmapData, setHeatmapData] = useState({ data: null, loading: true });
  const [frequencyData, setFrequencyData] = useState({ data: null, loading: true });
  const [questionsData, setQuestionsData] = useState({ data: null, loading: true });

  // Platform Health data (moderator only)
  const [searchGapsData, setSearchGapsData] = useState({ data: null, loading: true });
  const [leaderboardData, setLeaderboardData] = useState({ data: null, loading: true });

  const fetchIntelligenceData = useCallback(async () => {
    const params = {};
    if (branch) params.branch = branch;
    if (batchYear) params.batch_year = batchYear;

    setHeatmapData(prev => ({ ...prev, loading: true }));
    setFrequencyData(prev => ({ ...prev, loading: true }));
    setQuestionsData(prev => ({ ...prev, loading: true }));

    try {
      const [heatmap, frequency, questions] = await Promise.allSettled([
        api.getTopicHeatmap(params),
        api.getTopicFrequency(params),
        api.getTopQuestions(15),
      ]);

      setHeatmapData({ data: heatmap.status === 'fulfilled' ? heatmap.value : [], loading: false });
      setFrequencyData({ data: frequency.status === 'fulfilled' ? frequency.value : [], loading: false });
      setQuestionsData({ data: questions.status === 'fulfilled' ? questions.value : [], loading: false });
    } catch (err) {
      console.error('Failed to fetch intelligence data:', err);
    }
  }, [branch, batchYear]);

  const fetchHealthData = useCallback(async () => {
    if (!isModerator) return;

    setSearchGapsData(prev => ({ ...prev, loading: true }));
    setLeaderboardData(prev => ({ ...prev, loading: true }));

    try {
      const [gaps, leaderboard] = await Promise.allSettled([
        api.getSearchGaps(),
        api.getContributorLeaderboard(),
      ]);

      setSearchGapsData({ data: gaps.status === 'fulfilled' ? gaps.value : [], loading: false });
      setLeaderboardData({ data: leaderboard.status === 'fulfilled' ? leaderboard.value : [], loading: false });
    } catch (err) {
      console.error('Failed to fetch health data:', err);
    }
  }, [isModerator]);

  useEffect(() => {
    fetchIntelligenceData();
  }, [fetchIntelligenceData]);

  useEffect(() => {
    if (activeTab === 'health' && isModerator) {
      fetchHealthData();
    }
  }, [activeTab, fetchHealthData, isModerator]);

  const tabs = [
    { id: 'intelligence', label: 'Placement Intelligence', icon: BarChart3 },
    ...(isModerator ? [{ id: 'health', label: 'Platform Health', icon: Shield }] : []),
  ];

  return (
    <AnalyticsErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold font-outfit text-brand-teal flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-brand-teal/80" />
            Analytics
          </h1>
          <p className="text-brand-teal/70 mt-2">
            Insights from {isModerator ? 'placement data and platform usage' : 'placement interview data across University'}
          </p>
        </div>

        {/* Tab Bar */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-brand-teal/10 w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'text-brand-teal/60 hover:text-brand-teal hover:bg-brand-teal/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'intelligence' && (
            <motion.div
              key="intelligence"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Filter Bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-brand-teal/70">
                      <Filter className="w-4 h-4" />
                      Filter by:
                    </div>
                    <select
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      className="h-9 rounded-lg border border-brand-teal/20 bg-white px-3 text-sm text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    >
                      <option value="">All Branches</option>
                      {BRANCHES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <select
                      value={batchYear}
                      onChange={e => setBatchYear(e.target.value)}
                      className="h-9 rounded-lg border border-brand-teal/20 bg-white px-3 text-sm text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    >
                      <option value="">All Batch Years</option>
                      {BATCH_YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    {(branch || batchYear) && (
                      <button
                        onClick={() => { setBranch(''); setBatchYear(''); }}
                        className="text-xs text-brand-teal/50 hover:text-brand-teal underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                  <TopicHeatmap data={heatmapData.data} isLoading={heatmapData.loading} />
                </div>
                <div className="lg:col-span-2">
                  <TopicFrequency data={frequencyData.data} isLoading={frequencyData.loading} />
                </div>
                <div className="lg:col-span-2">
                  <TopQuestions data={questionsData.data} isLoading={questionsData.loading} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'health' && isModerator && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ContributorLeaderboard data={leaderboardData.data} isLoading={leaderboardData.loading} />
                <div className="lg:col-span-2">
                  <SearchGaps data={searchGapsData.data} isLoading={searchGapsData.loading} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnalyticsErrorBoundary>
  );
}
