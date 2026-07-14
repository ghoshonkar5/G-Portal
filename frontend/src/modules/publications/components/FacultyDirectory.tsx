import { useState, useEffect } from 'react';
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Search, Mail, Phone, MapPin, BookOpen, Award, Clock,
  Globe, GraduationCap, Briefcase, FileText,
  ChevronRight, RefreshCw, Users, Edit, Save, X, CheckCircle, ExternalLink
} from "lucide-react";

interface FacultyMember {
  id: string;
  facultyId: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  mobile?: string;
  researchArea?: string;
  officeRoom?: string;
  officeHours?: string;
  coursesTaught?: string;
  roles?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  googleScholarUrl?: string;
  scopusUrl?: string;
  wosUrl?: string;
  yearsOfExperience?: number;
  profilePhoto?: string;
  publicationsCount: number;
  conferencesCount: number;
  booksCount: number;
}

// ── Initials avatar ──────────────────────────────────────────────
function Avatar({ name, photo, size = 'md' }: { name?: string; photo?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || 'FA').split(' ').filter(Boolean).slice(0, 3).map(w => w[0].toUpperCase()).join('');
  const dim = size === 'lg' ? 'w-20 h-20 text-xl' : size === 'sm' ? 'w-10 h-10 text-xs' : 'w-14 h-14 text-sm';
  if (photo) {
    return <img src={photo} alt={name} className={`${dim} rounded-full object-cover border-2 border-[#E5DDC6]/60 flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg, #101A24 0%, #1C2C3B 100%)' }}>
      {initials}
    </div>
  );
}

// ── Blinking dot (same as AdminDashboard) ────────────────────────
function BlinkingDot({ color }: { color: 'red' | 'amber' }) {
  return (
    <>
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`}
        style={{ animation: 'flagBlink 1s infinite' }}
      />
      <style>{`
        @keyframes flagBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
      `}</style>
    </>
  );
}

interface FacultyDirectoryProps {
  /** Map of faculty_code → flag[] passed down from AdminDashboard */
  flagsPerFaculty?: Record<string, any[]>;
  /** Called when admin clicks a faculty's flag badge — opens FlagReviewModal in parent */
  onReviewFaculty?: (name: string, flags: any[]) => void;
}

export function FacultyDirectory({ flagsPerFaculty = {}, onReviewFaculty }: FacultyDirectoryProps) {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDesignation, setSelectedDesignation] = useState('all');
  const [researchFilter, setResearchFilter] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<FacultyMember>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const loadFaculty = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/faculty', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const response = await res.json();
      if (response.success) {
        setFaculty(response.data || []);
      } else {
        setError('Failed to load faculty data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load faculty data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFaculty(); }, []);

  const departments = Array.from(new Set(faculty.map(f => f.department).filter(Boolean))) as string[];
  const designations = Array.from(new Set(faculty.map(f => f.designation).filter(Boolean))) as string[];

  const filtered = faculty.filter(f => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      f.name.toLowerCase().includes(term) ||
      f.facultyId.includes(term) ||
      (f.email || '').toLowerCase().includes(term);
    const matchDept  = selectedDepartment === 'all' || f.department === selectedDepartment;
    const matchDesig = selectedDesignation === 'all' || f.designation === selectedDesignation;
    const matchResearch = !researchFilter ||
      (f.researchArea || '').toLowerCase().includes(researchFilter.toLowerCase());
    return matchSearch && matchDept && matchDesig && matchResearch;
  });

  const openDetails = (f: FacultyMember) => {
    setSelectedFaculty(f);
    setEditDraft({ ...f });
    setIsEditMode(false);
    setSaveError('');
    setIsDetailsOpen(true);
  };

  const handleEdit = () => setIsEditMode(true);

  const handleCancel = () => {
    setEditDraft({ ...selectedFaculty });
    setIsEditMode(false);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!selectedFaculty) return;
    setSaving(true);
    setSaveError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/auth/admin/faculty/${selectedFaculty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editDraft),
      });
      const data = await response.json();
      if (data.success) {
        setFaculty(prev => prev.map(f => f.id === selectedFaculty.id ? { ...f, ...editDraft } as FacultyMember : f));
        setSelectedFaculty({ ...selectedFaculty, ...editDraft } as FacultyMember);
        setIsEditMode(false);
        setIsDetailsOpen(false);
        setShowSaveSuccess(true);
      } else {
        setSaveError(data.message || 'Failed to save');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: string, value: any) => setEditDraft(prev => ({ ...prev, [field]: value }));

  const parseList = (str?: string | null) =>
    str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-800 mb-2">Faculty Directory</h1>
          <p className="text-gray-600">Browse and search faculty members across all departments</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-white shadow-sm border-0">
              <CardContent className="p-6 animate-pulse">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => <div key={j} className="h-3 bg-gray-100 rounded" />)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-800 mb-2">Faculty Directory</h1>
        </div>
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadFaculty} variant="outline" style={{ borderColor: "#101A24", color: "#101A24" }}>
            <RefreshCw className="w-4 h-4 mr-2" />Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">

      {/* ── Save Success Modal ── */}
      <Dialog open={showSaveSuccess} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Faculty Details Saved!</h3>
            <p className="text-gray-600 mb-6">The faculty profile has been updated successfully.</p>
            <Button onClick={() => setShowSaveSuccess(false)} className="text-white px-8" style={{ backgroundColor: '#101A24' }}>
              Back to Faculty Directory
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-800 mb-2">Faculty Directory</h1>
          <p className="text-gray-600">Browse and search faculty members across all departments</p>
        </div>
        <Button onClick={loadFaculty} variant="outline" size="sm" style={{ borderColor: "#101A24", color: "#101A24" }}>
          <RefreshCw className="w-4 h-4 mr-1" />Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 bg-white shadow-sm border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input type="text" placeholder="Search by name, employee ID, or email..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200" />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
                <SelectValue placeholder="All Designations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <Input type="text" placeholder="Filter by research area (e.g., AI, Machine Learning, Renewable Energy...)"
              value={researchFilter} onChange={e => setResearchFilter(e.target.value)}
              className="bg-gray-50 border-gray-200" />
          </div>
        </CardContent>
      </Card>

      {/* Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-800">{filtered.length}</span> of{' '}
        <span className="font-semibold text-gray-800">{faculty.length}</span> faculty members
      </div>

      {/* Faculty Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(f => {
          // ── Flag badge for this faculty card ──
          const facultyFlags = flagsPerFaculty[f.facultyId] || [];
          const activeFlags  = facultyFlags.filter((fl: any) => fl.status !== 'resolved');
          const hasPending   = activeFlags.some((fl: any) => fl.status === 'pending_review');
          const hasActive    = activeFlags.length > 0;

          return (
            <Card key={f.id} className="bg-white shadow-sm border-0 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => openDetails(f)}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <Avatar name={f.name} photo={f.profilePhoto} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-800 truncate group-hover:text-[#101A24] transition-colors font-medium">{f.name}</h3>
                    <p className="text-sm text-gray-600">{f.designation || '—'}</p>
                    <Badge variant="outline" className="mt-1 text-xs" style={{ borderColor: "#101A24", color: "#101A24" }}>
                      ID: {f.facultyId}
                    </Badge>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: "#101A24" }} />
                    <span className="truncate">{f.department || '—'}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: "#101A24" }} />
                    <span className="truncate">{f.email}</span>
                  </div>
                  {f.mobile && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: "#101A24" }} />
                      <span>{f.mobile}</span>
                    </div>
                  )}
                  {f.officeRoom && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: "#101A24" }} />
                      <span className="truncate">{f.officeRoom}</span>
                    </div>
                  )}
                </div>

                {f.researchArea && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Research Area</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{f.researchArea}</p>
                  </div>
                )}

                {/* Live stats from DB */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg text-gray-800 font-medium">{f.publicationsCount}</p>
                    <p className="text-xs text-gray-500">Publications</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg text-gray-800 font-medium">{f.conferencesCount}</p>
                    <p className="text-xs text-gray-500">Conferences</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg text-gray-800 font-medium">{f.booksCount}</p>
                    <p className="text-xs text-gray-500">Books</p>
                  </div>
                  {f.yearsOfExperience != null && (
                    <div className="text-center">
                      <p className="text-lg text-gray-800 font-medium">{f.yearsOfExperience}</p>
                      <p className="text-xs text-gray-500">Yrs Exp.</p>
                    </div>
                  )}
                </div>

                {/* ── Flags indicator ── */}
                {hasActive && onReviewFaculty ? (
                  <button
                    onClick={e => {
                      e.stopPropagation(); // don't open faculty details
                      onReviewFaculty(f.name, facultyFlags);
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <BlinkingDot color={hasPending ? 'amber' : 'red'} />
                    <span className="text-xs font-medium text-red-700">
                      {activeFlags.length} flag{activeFlags.length > 1 ? 's' : ''} — click to review
                    </span>
                  </button>
                ) : (
                  <div className="mt-3 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-green-50">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">All clear</span>
                  </div>
                )}

                <Button variant="outline" className="w-full mt-3 group-hover:bg-[#E5DDC6]/30 group-hover:border-[#E5DDC6] transition-all"
                  style={{ borderColor: "#101A24", color: "#101A24" }}>
                  View Details <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-800 mb-2">No faculty members found</h3>
          <p className="text-gray-600 text-sm">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Faculty Details Modal — admin full edit */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => { setIsDetailsOpen(open); if (!open) setIsEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-2xl" style={{ color: "#101A24" }}>
                {isEditMode ? 'Edit Faculty Details' : 'Faculty Details'}
              </DialogTitle>
              <div className="flex gap-2">
                {!isEditMode ? (
                  <Button onClick={handleEdit} size="sm" style={{ backgroundColor: "#101A24" }} className="text-white">
                    <Edit className="w-4 h-4 mr-2" />Edit
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleCancel} size="sm" variant="outline">
                      <X className="w-4 h-4 mr-2" />Cancel
                    </Button>
                    <Button onClick={handleSave} size="sm" disabled={saving}
                      style={{ backgroundColor: "#101A24" }} className="text-white">
                      <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {saveError && <p className="text-red-500 text-sm mt-1">{saveError}</p>}
          </DialogHeader>
          {selectedFaculty && (
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <div className="space-y-6">

                {/* Profile header */}
                <div className="flex items-start gap-6 pb-6 border-b">
                  <Avatar name={selectedFaculty.name} photo={selectedFaculty.profilePhoto} size="lg" />
                  <div className="flex-1 space-y-1.5">
                    {isEditMode ? (
                      <>
                        <div><Label>Full Name</Label>
                          <Input className="mt-1" value={editDraft.name || ''} onChange={e => setField('name', e.target.value)} /></div>
                        <div><Label>Designation</Label>
                          <Input className="mt-1" value={editDraft.designation || ''} onChange={e => setField('designation', e.target.value)} /></div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-semibold text-gray-800">{selectedFaculty.name}</h2>
                        <p className="text-gray-600 mt-1">{selectedFaculty.designation}</p>
                        <div className="pt-3">
                          <Badge style={{ backgroundColor: "#101A24" }} className="text-white inline-block">
                            Employee ID: {selectedFaculty.facultyId}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Department & Contact */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2" style={{ color: "#101A24" }} />Department & Contact
                  </h3>
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div><Label className="flex items-center mb-1"><GraduationCap className="w-4 h-4 mr-2" />Department</Label>
                        <Input value={editDraft.department || ''} onChange={e => setField('department', e.target.value)} /></div>
                      <div><Label className="flex items-center mb-1"><Mail className="w-4 h-4 mr-2" />Email</Label>
                        <Input type="email" value={editDraft.email || ''} onChange={e => setField('email', e.target.value)} /></div>
                      <div><Label className="flex items-center mb-1"><Phone className="w-4 h-4 mr-2" />Mobile</Label>
                        <Input value={editDraft.mobile || ''} onChange={e => setField('mobile', e.target.value)} /></div>
                      <div><Label className="flex items-center mb-1"><MapPin className="w-4 h-4 mr-2" />Office Room</Label>
                        <Input value={editDraft.officeRoom || ''} onChange={e => setField('officeRoom', e.target.value)} /></div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {selectedFaculty.department && (
                        <div className="flex items-center text-gray-700"><GraduationCap className="w-4 h-4 mr-3 text-gray-400" />{selectedFaculty.department}</div>
                      )}
                      <div className="flex items-center text-gray-700"><Mail className="w-4 h-4 mr-3 text-gray-400" />
                        <a href={`mailto:${selectedFaculty.email}`} style={{ color: "#101A24" }} className="hover:underline">{selectedFaculty.email}</a>
                      </div>
                      {selectedFaculty.mobile && (
                        <div className="flex items-center text-gray-700"><Phone className="w-4 h-4 mr-3 text-gray-400" />{selectedFaculty.mobile}</div>
                      )}
                      {selectedFaculty.officeRoom && (
                        <div className="flex items-center text-gray-700"><MapPin className="w-4 h-4 mr-3 text-gray-400" />{selectedFaculty.officeRoom}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Research */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Award className="w-4 h-4 mr-2" style={{ color: "#101A24" }} />Research & Specialization
                  </h3>
                  {isEditMode ? (
                    <Textarea rows={3} value={editDraft.researchArea || ''} onChange={e => setField('researchArea', e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedFaculty.researchArea || '—'}</p>
                    </div>
                  )}
                </div>

                {/* Courses */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" style={{ color: "#101A24" }} />Courses Taught
                  </h3>
                  {isEditMode ? (
                    <div>
                      <Label className="text-xs text-gray-500 mb-1">Separate with commas</Label>
                      <Textarea rows={2} value={editDraft.coursesTaught || ''}
                        onChange={e => setField('coursesTaught', e.target.value)}
                        placeholder="e.g. Data Structures, Machine Learning" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {parseList(selectedFaculty.coursesTaught).map((c, i) => (
                        <Badge key={i} variant="secondary" className="bg-[#E5DDC6]/30 text-[#101A24] border border-[#E5DDC6]">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Academic stats */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" style={{ color: "#101A24" }} />Academic Contributions
                  </h3>
                  {isEditMode ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Years of Experience</Label>
                        <Input type="number" className="mt-1" value={editDraft.yearsOfExperience || ''}
                          onChange={e => setField('yearsOfExperience', parseInt(e.target.value) || null)} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Publications',    value: selectedFaculty.publicationsCount },
                        { label: 'Conferences',     value: selectedFaculty.conferencesCount  },
                        { label: 'Books / Chapters', value: selectedFaculty.booksCount       },
                      ].map(item => (
                        <div key={item.label} className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-3xl text-gray-800 font-semibold mb-1">{item.value}</p>
                          <p className="text-sm text-gray-600">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Office Hours */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" style={{ color: "#101A24" }} />Office Hours
                  </h3>
                  {isEditMode ? (
                    <Input value={editDraft.officeHours || ''} onChange={e => setField('officeHours', e.target.value)}
                      placeholder="e.g. Mon-Fri, 2:00 PM - 4:00 PM" />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedFaculty.officeHours || '—'}</p>
                    </div>
                  )}
                </div>

                {/* Roles */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2" style={{ color: "#101A24" }} />Roles & Responsibilities
                  </h3>
                  {isEditMode ? (
                    <div>
                      <Label className="text-xs text-gray-500 mb-1">Separate with commas</Label>
                      <Textarea rows={3} value={editDraft.roles || ''}
                        onChange={e => setField('roles', e.target.value)}
                        placeholder="e.g. Class Coordinator, Research Lab Coordinator" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parseList(selectedFaculty.roles).map((r, i) => (
                        <div key={i} className="flex items-start bg-gray-50 rounded-lg p-3">
                          <div className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ backgroundColor: "#101A24" }} />
                          <span className="text-gray-700">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Academic Database Profiles — view only */}
                {!isEditMode && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <Globe className="w-4 h-4 mr-2" style={{ color: "#101A24" }} />Academic Profiles
                    </h3>
                    {(selectedFaculty.googleScholarUrl || selectedFaculty.scopusUrl || selectedFaculty.wosUrl) ? (
                      <div className="flex flex-wrap gap-3">
                        {selectedFaculty.googleScholarUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedFaculty.googleScholarUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />Google Scholar
                            </a>
                          </Button>
                        )}
                        {selectedFaculty.scopusUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedFaculty.scopusUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />Scopus
                            </a>
                          </Button>
                        )}
                        {selectedFaculty.wosUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedFaculty.wosUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />Web of Science
                            </a>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No academic profile links added yet</p>
                    )}
                  </div>
                )}

              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}