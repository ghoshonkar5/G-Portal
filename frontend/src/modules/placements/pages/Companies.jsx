import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { motion } from 'framer-motion';
import api from '../lib/api';

export function Companies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await api.getCompanies();
        setCompanies(data || []);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal/40" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-brand-teal flex items-center">
            <Building2 className="w-8 h-8 mr-3 text-brand-teal/80" />
            Company Directory
          </h1>
          <p className="text-brand-teal/70 mt-2">
            Browse interview experiences from top companies visiting University.
          </p>
        </div>
        
        <div className="w-full md:w-72 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-teal/50" />
          <Input 
            placeholder="Search companies..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company, i) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card hoverable className="h-full">
              <Link to={`/placements/companies/${company.id}`} className="block h-full">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center p-3 shadow-sm">
                    <img 
                      src={company.logoUrl || `https://ui-avatars.com/api/?name=${company.name}&background=0B5045&color=fff`}
                      alt={company.name} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${company.name}&background=0B5045&color=fff`;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-brand-teal">{company.name}</h3>
                    <p className="text-sm text-brand-teal/60">{company.industry}</p>
                  </div>
                  
                  <div className="pt-4 mt-auto w-full border-t border-brand-teal/5 text-sm font-medium text-brand-teal/80">
                    {company.submissionCount} Interview Experiences
                  </div>
                </CardContent>
              </Link>
            </Card>
          </motion.div>
        ))}
        
        {filteredCompanies.length === 0 && (
          <div className="col-span-full py-20 text-center text-brand-teal/50">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No companies found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
