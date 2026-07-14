import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { UniversityLogo as UniversityLogo } from '../../components/UniversityLogo';
import {
  BookOpen, Users, Book, LogOut, User, Mail, MapPin, Award,
  RefreshCw, Database, TrendingUp, ExternalLink, Settings, Info,
  X, Phone, Clock, Link2 as Linkedin, Globe, History
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { api } from '../../api/publicationsApi';
import { ScholarMetricsWidget } from '../../components/ScholarMetricsWidget';
import { ScholarSyncModal } from '../../components/ScholarSyncModal';
import { ScopusSyncModal } from '../../components/ScopusSyncModal';
import { ScopusMetricsWidget } from '../../components/ScopusMetricsWidget';
import { WosSyncModal } from '../../components/WosSyncModal';
import { FlagNotificationBanner } from '../../components/FlagNotificationBanner';
import { FlagDetailPopup } from '../../components/FlagDetailPopup';

interface FacultyData {
  name: string;
  facultyId: string;
  department: string;
  designation: string;
  email: string;
  mobile: string;
  researchArea: string;
}

interface AcademicStats {
  publications: { total: number; thisYear: number; journals: number };
  conferences:  { total: number; international: number; national: number };
  books:        { total: number; books: number; chapters: number };
  citations: {
    total: number;
    googleCitations: number;
    scopusCitations: number;
    wosCitations: number;
    hIndex: number;
    i10Index: number;
    hIndexSource?: 'google' | 'scopus' | 'none';
    i10IndexSource?: 'google' | 'scopus' | 'none';
  };
}

const EMPTY_STATS: AcademicStats = {
  publications: { total: 0, thisYear: 0, journals: 0 },
  conferences:  { total: 0, international: 0, national: 0 },
  books:        { total: 0, books: 0, chapters: 0 },
  citations: {
    total: 0, googleCitations: 0, scopusCitations: 0, wosCitations: 0,
    hIndex: 0, i10Index: 0, hIndexSource: 'none', i10IndexSource: 'none',
  },
};

export default function DashboardPage() {
  const { user, logout, updateProfileUrls } = useAuth();
  const navigate = useNavigate();

  const [facultyData, setFacultyData]         = useState<FacultyData | null>(null);
  const [academicStats, setAcademicStats]     = useState<AcademicStats | null>(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [lastSync, setLastSync]               = useState<Date | null>(null);
  const [showUrlEditor, setShowUrlEditor]     = useState(false);
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showScholarSync, setShowScholarSync] = useState(false);
  const [showScopusSync, setShowScopusSync]   = useState(false);
  const [showWosSync, setShowWosSync]         = useState(false);
  const [urlSaving, setUrlSaving]             = useState(false);
  const [urlSaveError, setUrlSaveError]       = useState('');
  const [urlSaveSuccess, setUrlSaveSuccess]   = useState(false);
  const [urlDraft, setUrlDraft] = useState({
    googleScholarUrl: user?.googleScholarUrl || '',
    scopusUrl:        user?.scopusUrl        || '',
    scopusUrl2:       user?.scopusUrl2       || '',
    scopusUrl3:       user?.scopusUrl3       || '',
    wosUrl:           user?.wosUrl           || '',
    wosUrl2:          user?.wosUrl2          || '',
    wosUrl3:          user?.wosUrl3          || '',
  });

  const [myFlags, setMyFlags]             = useState<any[]>([]);
  const [isFlagPopupOpen, setIsFlagPopupOpen] = useState(false);

  useEffect(() => {
    if (user?.facultyId) {
      loadFacultyData();
      loadAcademicStats();
      loadMyFlags();
    }
  }, [user]);

  useEffect(() => {
    setUrlDraft({
      googleScholarUrl: user?.googleScholarUrl || '',
      scopusUrl:        user?.scopusUrl        || '',
      scopusUrl2:       user?.scopusUrl2       || '',
      scopusUrl3:       user?.scopusUrl3       || '',
      wosUrl:           user?.wosUrl           || '',
      wosUrl2:          user?.wosUrl2          || '',
      wosUrl3:          user?.wosUrl3          || '',
    });
  }, [user?.googleScholarUrl, user?.scopusUrl, user?.scopusUrl2, user?.scopusUrl3, user?.wosUrl, user?.wosUrl2, user?.wosUrl3]);

  const loadMyFlags = async () => {
    if (!user?.facultyId) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/flags/faculty/${user.facultyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setMyFlags((json.data || []).filter((f: any) => f.status !== 'resolved'));
      }
    } catch { /* silently fail */ }
  };

  const handleMarkResolved = async (flagId: number, note: string) => {
    const token = localStorage.getItem('token') || '';
    await fetch(`/api/flags/${flagId}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ facultyNote: note }),
    });
    await loadMyFlags();
  };

  const loadFacultyData = () => {
    if (!user) return;
    setFacultyData({
      name:         user.name         || 'Faculty User',
      facultyId:    user.facultyId    || 'FAC000000',
      department:   user.department   || 'Computer Science & Engineering',
      designation:  user.designation  || 'Assistant Professor',
      email:        user.email,
      mobile:       user.mobile       || '+91-0000000000',
      researchArea: user.researchArea || 'Research Area',
    });
  };

  const loadAcademicStats = async () => {
    if (!user?.facultyId) return;
    try {
      const response = await api.getFacultyData(user.facultyId, '');
      if (response.success && response.data) {
        setAcademicStats(response.data.academicStats);
      } else {
        setAcademicStats(EMPTY_STATS);
      }
    } catch {
      setAcademicStats(EMPTY_STATS);
    }
  };

  const syncAllData = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      loadFacultyData();
      await loadAcademicStats();
      await loadMyFlags();
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUrls = async () => {
    setUrlSaving(true);
    setUrlSaveError('');
    setUrlSaveSuccess(false);
    const result = await updateProfileUrls(urlDraft);
    if (result.success) {
      setUrlSaveSuccess(true);
      setTimeout(() => { setShowUrlEditor(false); setUrlSaveSuccess(false); }, 1500);
    } else {
      setUrlSaveError(result.error || 'Failed to save URLs');
    }
    setUrlSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>

      <FlagDetailPopup
        isOpen={isFlagPopupOpen}
        onClose={() => setIsFlagPopupOpen(false)}
        flags={myFlags}
        onMarkResolved={handleMarkResolved}
      />

      {showUrlEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Academic Profile URLs</h3>
            <div className="space-y-4">
              {[
                { label: 'Google Scholar URL', key: 'googleScholarUrl', placeholder: 'https://scholar.google.com/citations?user=...' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="url"
                    value={urlDraft[key as keyof typeof urlDraft]}
                    onChange={e => setUrlDraft(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#101A24]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scopus URL(s) <span className="text-gray-400 font-normal text-xs">(up to 3)</span>
                </label>
                <div className="flex flex-col gap-2">
                  <input type="url" value={urlDraft.scopusUrl}
                    onChange={e => setUrlDraft(p => ({ ...p, scopusUrl: e.target.value }))}
                    placeholder="https://www.scopus.com/authid/detail.uri?authorId=..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#101A24]" />
                  {(urlDraft.scopusUrl || urlDraft.scopusUrl2) && (
                    <input type="url" value={urlDraft.scopusUrl2}
                      onChange={e => setUrlDraft(p => ({ ...p, scopusUrl2: e.target.value }))}
                      placeholder="Second Scopus URL (optional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#101A24]" />
                  )}
                  {urlDraft.scopusUrl && urlDraft.scopusUrl2 && (
                    <input type="url" value={urlDraft.scopusUrl3}
                      onChange={e => setUrlDraft(p => ({ ...p, scopusUrl3: e.target.value }))}
                      placeholder="Third Scopus URL (optional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#101A24]" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Web of Science URL(s) <span className="text-gray-400 font-normal text-xs">(up to 3)</span>
                </label>
                <div className="flex flex-col gap-2">
                  <input type="url" value={urlDraft.wosUrl}
                    onChange={e => setUrlDraft(p => ({ ...p, wosUrl: e.target.value }))}
                    placeholder="https://www.webofscience.com/wos/author/record/..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#101A24]" />
                  {(urlDraft.wosUrl || urlDraft.wosUrl2) && (
                    <input type="url" value={urlDraft.wosUrl2}
                      onChange={e => setUrlDraft(p => ({ ...p, wosUrl2: e.target.value }))}
                      placeholder="Second WoS URL (optional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#101A24]" />
                  )}
                  {urlDraft.wosUrl && urlDraft.wosUrl2 && (
                    <input type="url" value={urlDraft.wosUrl3}
                      onChange={e => setUrlDraft(p => ({ ...p, wosUrl3: e.target.value }))}
                      placeholder="Third WoS URL (optional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#101A24]" />
                  )}
                </div>
              </div>
            </div>
            {urlSaveError   && <p className="text-red-500 text-sm mt-3">{urlSaveError}</p>}
            {urlSaveSuccess && <p className="text-green-600 text-sm mt-3">✅ URLs saved successfully!</p>}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowUrlEditor(false); setUrlSaveError(''); setUrlSaveSuccess(false); }}>Cancel</Button>
              <Button onClick={handleSaveUrls} disabled={urlSaving} className="bg-[#101A24] hover:bg-[#16222E] text-white">
                {urlSaving ? 'Saving...' : 'Save URLs'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showProfileInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowProfileInfo(false)}>
          <div className="bg-white rounded-xl w-80 overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div className="relative px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #101A24 0%, #1C2C3B 100%)' }}>
              <button onClick={() => setShowProfileInfo(false)} className="absolute top-2.5 right-3 text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-11 h-11 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 bg-white/20">
                  {(user?.name || 'FA').split(' ').filter(Boolean).slice(0, 3).map((w: string) => w[0].toUpperCase()).join('')}
                </div>
              )}
              <div className="min-w-0 pr-6">
                <p className="font-semibold text-white text-sm leading-snug">{user?.name}</p>
                <p className="text-white text-xs opacity-90">{user?.designation}</p>
                <p className="text-white text-xs opacity-90">{user?.department}</p>
              </div>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {user?.email      && <div className="flex items-center gap-2"><Mail  className="w-3 h-3 flex-shrink-0" style={{ color: '#101A24' }} /><span className="text-sm text-gray-600 truncate">{user.email}</span></div>}
                {user?.mobile     && <div className="flex items-center gap-2"><Phone className="w-3 h-3 flex-shrink-0" style={{ color: '#101A24' }} /><span className="text-sm text-gray-600">{user.mobile}</span></div>}
                {user?.officeRoom  && <div className="flex items-center gap-2"><MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#101A24' }} /><span className="text-sm text-gray-600">{user.officeRoom}</span></div>}
                {user?.officeHours && <div className="flex items-center gap-2"><Clock  className="w-3 h-3 flex-shrink-0" style={{ color: '#101A24' }} /><span className="text-sm text-gray-600">{user.officeHours}</span></div>}
              </div>
              {user?.researchArea  && <div className="border-t border-gray-100 pt-3"><p className="text-xs text-gray-500 mb-2">Research Areas</p><div className="flex flex-wrap gap-1.5">{user.researchArea.split(',').map(s => s.trim()).filter(Boolean).map((r, i) => <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#101A24', border: '1px solid #BFDBFE' }}>{r}</span>)}</div></div>}
              {user?.coursesTaught && <div className="border-t border-gray-100 pt-3"><p className="text-xs text-gray-500 mb-2">Courses Taught</p><div className="flex flex-wrap gap-1.5">{user.coursesTaught.split(',').map(s => s.trim()).filter(Boolean).map((c, i) => <span key={i} className="text-xs px-3 py-1 rounded-full bg-[#E5DDC6]/30 text-[#101A24]" style={{ border: '1px solid #bfdbfe' }}>{c}</span>)}</div></div>}
              {user?.roles         && <div className="border-t border-gray-100 pt-3"><p className="text-xs text-gray-500 mb-2">Roles & Responsibilities</p><div className="flex flex-wrap gap-1.5">{user.roles.split(',').map(s => s.trim()).filter(Boolean).map((r, i) => <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>{r}</span>)}</div></div>}
              {(user?.linkedinUrl || user?.websiteUrl) && (
                <div className="border-t border-gray-100 pt-3 flex gap-4">
                  {user.linkedinUrl && <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#101A24] hover:underline"><Linkedin className="w-3 h-3" />LinkedIn</a>}
                  {user.websiteUrl  && <a href={user.websiteUrl}  target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: '#101A24' }}><Globe className="w-3 h-3" />Website</a>}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-4 pt-2 bg-gray-50/50 rounded-b-2xl border-t border-gray-100">
              <button onClick={() => { setShowProfileInfo(false); navigate('/publications/edit-profile'); }} className="text-xs font-medium hover:underline" style={{ color: '#101A24' }}>✏️ Edit Profile</button>
              <Button size="sm" onClick={() => setShowProfileInfo(false)} className="text-white text-xs h-7 px-3" style={{ backgroundColor: '#101A24' }}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <header className="w-full bg-gradient-to-r from-[#101A24] via-[#16222E] to-[#1C2C3B]">
        <div className="max-w-full px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <UniversityLogo tone="light" />
              <button onClick={() => navigate('/home')}
                className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span className="hidden sm:inline text-xs">Home</span>
              </button>
              <div className="w-px h-5 bg-white/20" />
              <div>
                <h1 className="text-base font-semibold text-white leading-tight">Research Management Dashboard</h1>
                <p className="text-xs text-[#E5DDC6]">University {user?.role === 'admin' ? 'Admin' : user?.role === 'student' ? 'Student' : 'Faculty'} Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={syncAllData} disabled={isLoading}
                className="text-white border text-sm h-8 px-3 flex items-center gap-2 transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync All Academic Data'}
              </Button>
              <button onClick={() => navigate('/publications/flags')} title="Flag History"
                className="relative flex items-center gap-1.5 text-white hover:text-white/80 transition-colors text-sm font-medium">
                <div className="relative">
                  <History className="w-5 h-5" />
                  {myFlags.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center text-white font-bold"
                      style={{ minWidth: 16, height: 16, borderRadius: '50%', backgroundColor: '#ef4444', fontSize: 9, border: '1.5px solid #101A24', lineHeight: 1, padding: '0 3px' }}>
                      {myFlags.length > 9 ? '9+' : myFlags.length}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-xs">Flags</span>
              </button>
              <button onClick={() => navigate('/publications/edit-profile')} title="Edit Profile" className="text-white hover:text-white/80 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={() => setShowProfileInfo(true)} title="View Profile" className="flex-shrink-0 hover:opacity-80 transition-opacity">
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" style={{ width: '36px', height: '36px', minWidth: '36px', maxWidth: '36px', minHeight: '36px', maxHeight: '36px', borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid rgba(255,255,255,0.4)' }} />
                ) : (
                  <div className="flex items-center justify-center text-white text-xs font-semibold" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)' }}>
                    {(user?.name || 'FA').split(' ').filter(Boolean).slice(0, 3).map(w => w[0].toUpperCase()).join('')}
                  </div>
                )}
              </button>
              <Button onClick={handleLogout} className="text-sm h-8 px-3 transition-colors"
                style={{ backgroundColor: 'rgba(220,50,50,0.25)', border: '1px solid rgba(255,150,150,0.35)', color: '#ffb0b0' }}>
                <LogOut className="w-3.5 h-3.5 mr-1.5" />Logout
              </Button>
            </div>
          </div>
        </div>
        <div className="relative h-8 bg-[#101A24]">
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '32px', backgroundColor: 'rgb(248,250,252)' }} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {myFlags.length > 0 && (
          <div className="mt-4">
            <FlagNotificationBanner flags={myFlags} onViewDetails={() => setIsFlagPopupOpen(true)} onDismiss={() => {}} />
          </div>
        )}

        {facultyData ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl text-black mb-2">Welcome back, {facultyData.name.split(' ')[facultyData.name.split(' ').length - 1]}!</h2>
              <p style={{ color: '#101A24' }}>Manage your academic portfolio and research activities.</p>
              {lastSync && <p className="text-sm text-gray-500 mt-1">Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}</p>}
            </div>
            <Card className="mb-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
              <CardHeader className="text-white rounded-t-xl py-4 flex flex-row items-center" style={{ background: 'linear-gradient(135deg, #101A24 0%, #1C2C3B 100%)' }}>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <User className="w-6 h-6" /><span>Faculty Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-6 pb-6">
                <div className="flex items-center gap-2 mb-6">
                  {user?.profilePhoto ? (
                    <img src={user.profilePhoto} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-[#E5DDC6]/60 flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-xl font-semibold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #101A24 0%, #1C2C3B 100%)' }}>
                      {(user?.name || 'FA').split(' ').filter(Boolean).slice(0, 3).map((w: string) => w[0].toUpperCase()).join('')}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-semibold text-gray-900">{facultyData.name}</p>
                      <button onClick={() => setShowProfileInfo(true)} title="View full profile"
                        className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors flex-shrink-0">
                        <Info className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">{facultyData.designation}</p>
                    <button onClick={() => navigate('/publications/edit-profile')} className="text-xs mt-1 hover:underline" style={{ color: '#101A24' }}>✏️ Edit Profile</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { icon: User,     label: 'Name',          value: facultyData.name },
                    { icon: Award,    label: 'Faculty ID',    value: facultyData.facultyId },
                    { icon: MapPin,   label: 'Department',    value: facultyData.department },
                    { icon: Award,    label: 'Designation',   value: facultyData.designation },
                    { icon: Mail,     label: 'Email',         value: facultyData.email },
                    { icon: BookOpen, label: 'Research Area', value: facultyData.researchArea },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E6F7F5' }}>
                        <Icon className="w-5 h-5" style={{ color: '#101A24' }} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{label}</p>
                        <p className="text-black">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <ScholarMetricsWidget />
            <ScopusMetricsWidget />
          </>
        ) : (
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-96 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: BookOpen, label: 'Publications',          desc: 'Manage your research papers, journal articles, and academic publications.', stat: academicStats?.publications.total, path: '/publications/publications' },
            { icon: Users,    label: 'Conferences',           desc: 'Track your conference presentations, proceedings, and academic events.',     stat: academicStats?.conferences.total,  path: '/publications/conferences'  },
            { icon: Book,     label: 'Books & Book Chapters', desc: 'Manage your authored books, book chapters, and editorial works.',           stat: academicStats?.books.total,        path: '/publications/books'        },
          ].map(({ icon: Icon, label, desc, stat, path }) => (
            <Card key={label} className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-200 cursor-pointer group" onClick={() => navigate(path)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ background: 'linear-gradient(135deg, #101A24 0%, #1C2C3B 100%)' }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl text-black">{stat ?? '—'}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>
                <h3 className="text-lg text-black mb-2">{label}</h3>
                <p className="text-gray-600 text-sm mb-4">{desc}</p>
                <Button className="w-full text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#101A24' }}>View {label}</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" style={{ color: '#101A24' }} />
                <span style={{ color: '#101A24' }}>Academic Impact Metrics</span>
              </div>
              <div className="text-sm text-gray-500">Auto-updated from verified sources</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {academicStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { value: academicStats.publications.total,        label: 'Total Publications', sub: null },
                  { value: academicStats.conferences.total,         label: 'Total Conferences',  sub: null },
                  { value: academicStats.books.total,               label: 'Books & Chapters',   sub: null },
                  { value: academicStats.citations.googleCitations, label: 'Google Citations',   sub: null },
                  { value: academicStats.citations.scopusCitations, label: 'Scopus Citations',   sub: null },
                  { value: academicStats.citations.hIndex,   label: 'H-Index',   sub: academicStats.citations.hIndexSource  === 'google' ? 'Google Scholar' : academicStats.citations.hIndexSource === 'scopus' ? 'Scopus' : null },
                  { value: academicStats.citations.i10Index, label: 'i10-Index', sub: academicStats.citations.i10IndexSource === 'google' ? 'Google Scholar' : null },
                ].map((item, i) => (
                  <div key={i} className="text-center p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' }}>
                    <p className="text-2xl" style={{ color: '#101A24' }}>{item.value}</p>
                    <p className="text-sm" style={{ color: '#16222E' }}>{item.label}</p>
                    {item.sub && <p className="text-xs mt-0.5" style={{ color: '#2563EB', opacity: 0.85 }}>{item.sub}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="text-center p-4 rounded-lg animate-pulse" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' }}>
                    <div className="h-8 bg-gray-300 rounded mb-2 mx-auto w-12"></div>
                    <div className="h-4 bg-gray-200 rounded mx-auto w-16"></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5" style={{ color: '#101A24' }} />
                <span style={{ color: '#101A24' }}>Academic Database Profiles</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button variant="outline" size="sm" className="border-[#E5DDC6] hover:bg-[#E5DDC6]/30 text-sm" style={{ color: '#101A24' }} onClick={() => setShowUrlEditor(true)}>
                  ✏️ Update Profile URLs
                </Button>
                <Button size="sm" className="text-white text-sm" style={{ backgroundColor: '#b45309' }} onClick={() => setShowScholarSync(true)}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Scholar
                </Button>
                <Button size="sm" className="text-white text-sm" style={{ backgroundColor: '#101A24' }} onClick={() => setShowScopusSync(true)}>
                  <Database className="w-3.5 h-3.5 mr-1.5" />Sync from Scopus
                </Button>
                <Button size="sm" className="text-white text-sm" style={{ backgroundColor: '#166534' }} onClick={() => setShowWosSync(true)}>
                  <Database className="w-3.5 h-3.5 mr-1.5" />Sync from WoS
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { url: user?.googleScholarUrl, label: 'Google Scholar', desc: 'H-index and comprehensive citations',        colorClass: 'from-orange-50 to-orange-100', textColor: 'text-orange-700', iconColor: 'text-orange-600' },
                { url: user?.scopusUrl,         label: 'Scopus',         desc: 'Publications, citations, and indexing data', colorClass: 'from-blue-50 to-blue-100',     textColor: 'text-[#101A24]',   iconColor: 'text-[#101A24]'   },
                { url: user?.wosUrl,            label: 'Web of Science', desc: 'Impact factors and citation metrics',        colorClass: 'from-green-50 to-green-100',   textColor: 'text-green-700',  iconColor: 'text-green-600'  },
              ].map(({ url, label, desc, colorClass, textColor, iconColor }) => (
                url ? (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={`text-center p-4 rounded-lg bg-gradient-to-br ${colorClass} hover:shadow-md transition-shadow cursor-pointer group`}>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className={`text-lg font-semibold ${textColor}`}>{label}</div>
                      <ExternalLink className={`w-4 h-4 ${iconColor} group-hover:translate-x-1 transition-transform`} />
                    </div>
                    <div className={`text-xs ${iconColor}`}>{desc}</div>
                  </a>
                ) : (
                  <div key={label} onClick={() => setShowUrlEditor(true)} className={`text-center p-4 rounded-lg bg-gradient-to-br ${colorClass} opacity-50 cursor-pointer hover:opacity-70 transition-opacity`}>
                    <div className={`text-lg font-semibold ${textColor} mb-1`}>{label}</div>
                    <div className={`text-xs ${iconColor}`}>URL not set — click to update</div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        <ScholarSyncModal isOpen={showScholarSync} onClose={() => { setShowScholarSync(false); loadAcademicStats(); }} onImportComplete={() => { loadAcademicStats(); }} />
        <ScopusSyncModal  isOpen={showScopusSync}  onClose={() => { setShowScopusSync(false);  loadAcademicStats(); }} onImportComplete={() => { loadAcademicStats(); }} />
        <WosSyncModal     isOpen={showWosSync}     onClose={() => { setShowWosSync(false);     loadAcademicStats(); }} onImportComplete={() => { loadAcademicStats(); }} />
      </main>
    </div>
  );
}