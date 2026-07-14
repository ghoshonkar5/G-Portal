import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { motion } from 'framer-motion';
import api from '../lib/api';

export function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Fetch real data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [subsData, compsData] = await Promise.allSettled([
          api.getSubmissions({ sort: 'recent', limit: 5 }),
          api.getCompanies(),
        ]);
        if (subsData.status === 'fulfilled') setSubmissions(subsData.value.data || []);
        if (compsData.status === 'fulfilled') setCompanies(compsData.value || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Debounced live search — fires 300ms after user stops typing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchSubmissions(searchQuery.trim());
        setSearchResults(results.data || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e) => {
    e?.preventDefault();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Show search results if there are any
  const displayedSubmissions = searchResults !== null ? searchResults : submissions;

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-teal px-6 py-20 text-center sm:px-12 md:py-32">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mx-auto max-w-3xl space-y-6"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            Ace your <span className="text-brand-cream">Placements</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-brand-cream/80 sm:text-xl">
            Read real interview experiences, round-by-round questions, and tips from University alumni.
          </p>
          
          <form onSubmit={handleSearch} className="mx-auto max-w-xl mt-8 relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-teal/50 z-10" />
            <Input 
              type="text" 
              placeholder="Search companies, roles, or topics..." 
              className="pl-12 h-14 text-base rounded-full shadow-lg border-0 focus-visible:ring-4 focus-visible:ring-brand-cream/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              type="submit" 
              size="lg" 
              className="absolute right-1.5 top-1.5 bottom-1.5 rounded-full h-auto px-6"
              disabled={searching}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </form>
        </motion.div>
      </section>

      {/* Search results banner */}
      {searchResults !== null && (
        <div className="flex items-center justify-between bg-brand-teal/5 rounded-xl px-6 py-3 border border-brand-teal/10">
          <p className="text-sm text-brand-teal">
            {searchResults.length > 0 
              ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `No results found for "${searchQuery}"`
            }
          </p>
          <button onClick={clearSearch} className="text-sm text-brand-teal/60 hover:text-brand-teal underline">
            Clear search
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-outfit text-brand-teal flex items-center">
              <Clock className="w-6 h-6 mr-2 text-brand-teal/70" />
              {searchResults !== null ? 'Search Results' : 'Recent Experiences'}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-teal/40" />
            </div>
          ) : displayedSubmissions.length > 0 ? (
            <div className="space-y-4">
              {displayedSubmissions.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Card hoverable className="block transition-all hover:-translate-y-1 hover:shadow-lg">
                    <Link to={`/placements/submissions/${sub.id}`}>
                      <CardContent className="p-6 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                        <img 
                          src={sub.company?.logoUrl || `https://ui-avatars.com/api/?name=${sub.company?.name}&background=0B5045&color=fff`} 
                          alt={sub.company?.name} 
                          className="w-16 h-16 rounded-xl object-contain bg-gray-50 border border-gray-100 p-2"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${sub.company?.name || 'C'}&background=0B5045&color=fff`;
                          }}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h3 className="text-xl font-bold text-brand-teal">
                                {sub.company?.name} <span className="text-brand-teal/60 font-medium text-lg">· {sub.roleApplied}</span>
                              </h3>
                              <p className="text-sm text-brand-teal/70 mt-1">
                                {sub.interviewDate && `Interviewed ${new Date(sub.interviewDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                                {sub.ctc && ` · ${sub.ctc}`}
                              </p>
                            </div>
                          </div>
                          
                          {sub.overallTips && (
                            <p className="text-brand-teal/80 line-clamp-2 mt-2">
                              {sub.overallTips}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t border-brand-teal/5">
                            <div className="flex flex-wrap gap-2">
                              {sub.rounds?.flatMap(r => r.tags || []).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map(tag => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                            <div className="text-sm text-brand-teal/60 font-medium">
                              {sub.user ? `By ${sub.user.name} (${sub.user.batchYear})` : 'Anonymous'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-brand-teal/50">
              <p className="text-lg">No experiences found.</p>
              <Link to="/placements/submit">
                <Button variant="outline" className="mt-4">Be the first to share</Button>
              </Link>
            </div>
          )}
          
          {searchResults === null && submissions.length > 0 && (
            <div className="flex justify-center pt-4">
              <Link to="/placements/companies">
                <Button variant="outline" className="w-full sm:w-auto">
                  View All Experiences
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-brand-teal/70" />
                Top Companies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {companies.slice(0, 6).map(company => (
                <Link key={company.id} to={`/placements/companies/${company.id}`} className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-brand-teal/5 transition-colors">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={company.logoUrl || `https://ui-avatars.com/api/?name=${company.name}&background=0B5045&color=fff`} 
                      alt={company.name} 
                      className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100 p-1"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${company.name}&background=0B5045&color=fff`;
                      }}
                    />
                    <div>
                      <p className="font-semibold text-brand-teal group-hover:text-brand-teal/80">{company.name}</p>
                      <p className="text-xs text-brand-teal/60">{company.industry}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{company.submissionCount} posts</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
