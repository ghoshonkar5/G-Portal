import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Globe, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { motion } from 'framer-motion';
import api from '../lib/api';

export function CompanyDetail() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [compData, subsData] = await Promise.allSettled([
          api.getCompany(id),
          api.getSubmissions({ companyId: id }),
        ]);
        if (compData.status === 'fulfilled') setCompany(compData.value);
        if (subsData.status === 'fulfilled') setSubmissions(subsData.value.data || []);
      } catch (err) {
        console.error('Failed to load company data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal/40" />
      </div>
    );
  }

  if (!company) {
    return <div className="text-center py-20 text-brand-teal/50 text-xl font-medium">Company not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link to="/placements/companies" className="inline-flex items-center text-sm font-medium text-brand-teal/60 hover:text-brand-teal transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Directory
      </Link>

      <div className="bg-white rounded-3xl p-8 border border-brand-teal/10 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="w-32 h-32 bg-gray-50 rounded-2xl flex-shrink-0 flex items-center justify-center p-4 border border-gray-100 z-10">
          <img 
            src={company.logoUrl || `https://ui-avatars.com/api/?name=${company.name}&background=0B5045&color=fff`}
            alt={company.name} 
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${company.name}&background=0B5045&color=fff`;
            }}
          />
        </div>
        
        <div className="text-center md:text-left z-10 flex-1">
          <h1 className="text-3xl font-bold font-outfit text-brand-teal">{company.name}</h1>
          <p className="text-lg text-brand-teal/70 mt-1">{company.industry}</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6">
            <div className="flex items-center text-sm text-brand-teal/80">
              <Briefcase className="w-4 h-4 mr-1.5 opacity-70" />
              {submissions.length} Experiences
            </div>
            <div className="flex items-center text-sm text-brand-teal/80">
              <MapPin className="w-4 h-4 mr-1.5 opacity-70" />
              Pan India
            </div>
            <div className="flex items-center text-sm text-brand-teal/80">
              <Globe className="w-4 h-4 mr-1.5 opacity-70" />
              {company.name.toLowerCase().replace(/\s+/g, '')}.com
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-outfit text-brand-teal">Interview Experiences</h2>
        
        {submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              >
                <Card hoverable>
                  <Link to={`/placements/submissions/${sub.id}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-brand-teal">{sub.roleApplied}</h3>
                          <p className="text-sm text-brand-teal/70 mt-1">
                            {sub.interviewDate && `Interviewed on ${new Date(sub.interviewDate).toLocaleDateString()}`}
                            {sub.ctc && ` · ${sub.ctc}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {sub.rounds?.map((r, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-brand-teal/5 text-brand-teal/80">
                            {r.roundType} ({r.difficulty})
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="text-sm text-brand-teal/60 font-medium flex justify-between items-center pt-4 border-t border-brand-teal/5">
                        <span>{sub.user ? `By ${sub.user.name} (${sub.user.batchYear})` : 'Anonymous'}</span>
                        <span className="flex items-center gap-1">
                          👍 {sub.upvoteCount || 0} upvotes
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-brand-teal/10">
            <p className="text-brand-teal/60">No interview experiences posted for this company yet.</p>
            <Link to="/placements/submit">
              <Button variant="outline" className="mt-4">Be the first to share</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
