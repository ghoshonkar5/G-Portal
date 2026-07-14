import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Plus, Minus, Loader2, CheckCircle, Upload, File, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Alert, AlertDescription } from './ui/alert';

interface AddPublicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (publicationData: any) => Promise<void>;
  initialData?: any;
}

interface PublicationFormData {
  title: string;
  journal: string;
  quartile: string;
  impactFactor: string;
  citeScore: string;
  authors: string[];
  indexing: string;
  areaOfPaper: string;
  positionOfAuthor: string;
  volume: string;
  issue: string;
  startPage: string;
  lastPage: string;
  monthYear: string;
  academicYear: string;
  doi: string;
  link: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

const deriveAcademicYear = (monthYear: string): string => {
  const parts = monthYear.trim().split(' ');
  const year = parseInt(parts[parts.length - 1]);
  if (isNaN(year)) return '';
  const month = parts[0]?.toLowerCase();
const earlyMonths = ['january', 'february', 'march', 'april', 'may'];  const startYear = earlyMonths.includes(month) ? year - 1 : year;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
};

export function AddPublicationForm({ isOpen, onClose, onSubmit, initialData }: AddPublicationFormProps) {
  const { user } = useAuth();
  const isEditMode = !!initialData;
  
  const getInitialFormData = (): PublicationFormData => {
    if (initialData) {
      return {
        title: initialData.title || '',
        journal: initialData.journal || '',
        quartile: initialData.quartile || '',
        impactFactor: initialData.impactFactor || '',
        citeScore: initialData.citeScore || '',
        authors: initialData.authors || [''],
        indexing: initialData.indexing || '',
        areaOfPaper: initialData.areaOfPaper || '',
        positionOfAuthor: initialData.positionOfAuthor || '',
        volume: initialData.volume || '',
        issue: initialData.issue || '',
        startPage: initialData.startPage || '',
        lastPage: initialData.lastPage || '',
        monthYear: initialData.monthYear || '',
        academicYear: initialData.academicYear || '',
        doi: initialData.doi || '',
        link: initialData.link || ''
      };
    }
    return {
      title: '',
      journal: '',
      quartile: '',
      impactFactor: '',
      citeScore: '',
      authors: [''],
      indexing: '',
      areaOfPaper: '',
      positionOfAuthor: '',
      volume: '',
      issue: '',
      startPage: '',
      lastPage: '',
      monthYear: '',
      academicYear: '',
      doi: '',
      link: ''
    };
  };

  const [formData, setFormData] = useState<PublicationFormData>(getInitialFormData());

  // Re-sync when dialog opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
      setSuccess(false);
      setSelectedFile(null);
      setShowVerificationWarning(false);
    }
  }, [isOpen, initialData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);

  const resetForm = () => {
    setFormData(getInitialFormData());
    setErrors({});
    setSuccess(false);
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

 const handleInputChange = (field: keyof PublicationFormData, value: string) => {
  setFormData(prev => {
    const updated = { ...prev, [field]: value };
    if (field === 'monthYear') {
      updated.academicYear = deriveAcademicYear(value);
    }
    return updated;
  });
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }
};

  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }));
  };

  const removeAuthor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index)
    }));
  };

  const updateAuthor = (index: number, value: string) => {
  setFormData(prev => {
    const newAuthors = prev.authors.map((author, i) => i === index ? value : author);
    
    // Auto-calculate position from authors list
    if (user?.name) {
      const normalize = (s: string) => s.toLowerCase().replace(/^(dr|prof|mr|mrs|ms)\.?\s*/i, '').replace(/[\s.]/g, '');
      const nameParts = normalize(user.name).replace(/[\s.]+/g, ' ').trim().split(' ');
      const lastName = nameParts[nameParts.length - 1];
      const initial = nameParts[0]?.[0];

      const matchIdx = newAuthors.findIndex(a => {
        const n = a.toLowerCase().replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰*†‡.]/g, '').trim();
        return n.includes(lastName) && (n.includes(initial) || n.includes(nameParts[0]));
      });

      if (matchIdx !== -1) {
        const n = matchIdx + 1;
        const s = ['th','st','nd','rd'];
        const v = n % 100;
        const ordinal = n + (s[(v-20)%10] || s[v] || s[0]);
        return { ...prev, authors: newAuthors, positionOfAuthor: ordinal };
      }
    }
    return { ...prev, authors: newAuthors };
  });
};

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.journal.trim()) newErrors.journal = 'Journal is required';
    if (!formData.monthYear.trim()) newErrors.monthYear = 'Date is required';
    if (!formData.link.trim()) newErrors.link = 'Publication Link is required';
    
    const validAuthors = formData.authors.filter(author => author.trim() !== '');
    if (validAuthors.length === 0) {
      newErrors.authors = 'At least one author is required';
    }

  

    if (formData.link && !formData.link.startsWith('http')) {
      newErrors.link = 'Please enter a valid URL starting with http:// or https://';
    }

    if (user?.name) {
      const facultyName = user.name;
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
      const isAuthor = validAuthors.some(author =>
        normalize(author).includes(normalize(facultyName)) ||
        normalize(facultyName).includes(normalize(author))
      );
      
      if (!isAuthor) {
        setShowVerificationWarning(true);
      } else {
        setShowVerificationWarning(false);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, file: 'File size must be less than 10MB' });
        return;
      }
      setSelectedFile(file);
      setErrors({ ...errors, file: '' });
    }
  };

  const generateApaFormat = (data: PublicationFormData): string => {
    const validAuthors = data.authors.filter(a => a.trim() !== '');
    const authorsStr = validAuthors.join(', ');
    const year = data.monthYear.split(' ')[1] || new Date().getFullYear();
    return `${authorsStr} (${year}). ${data.title}. ${data.journal}, ${data.volume}(${data.issue}), ${data.startPage}-${data.lastPage}.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // ✅ Prepare data with ALL required backend fields
      const validAuthors = formData.authors.filter(author => author.trim() !== '');
      
      const publicationData: any = {
        title: formData.title,
        journal: formData.journal,
        quartile: formData.quartile,
        impactFactor: formData.impactFactor || null,
        citeScore: formData.citeScore || null,
        wosCitations: 0,  // ✅ Added - defaults to 0
        scopusCitations: 0,  // ✅ Added - defaults to 0
        googleCitations: 0,  // ✅ Added - defaults to 0
        authors: validAuthors,  // ✅ Array of author names
        indexing: formData.indexing || null,
        areaOfPaper: formData.areaOfPaper || null,
        apaFormat: generateApaFormat(formData),  // ✅ Added - auto-generated
        positionOfAuthor: formData.positionOfAuthor || null,
        volume: formData.volume || null,
        issue: formData.issue || null,
        startPage: formData.startPage || null,
        lastPage: formData.lastPage || null,
        monthYear: formData.monthYear,
        academicYear: formData.academicYear,
        listOfPaperFromJournal: '',  // ✅ Added - empty string
        doi: formData.doi,
        link: formData.link,
        fileUrl: null,  // ✅ Will be set below if file exists
        fileName: null,
        fileType: null
      };

      // ✅ Convert file to base64 if present
      if (selectedFile) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            publicationData.fileUrl = reader.result as string;
            publicationData.fileName = selectedFile.name;
            publicationData.fileType = selectedFile.type;
            resolve(null);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      console.log('📤 Sending publication data:', publicationData);

      await onSubmit(publicationData);
      setSuccess(true);
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to add publication:', error);
      setErrors({ submit: error.message || 'Failed to add publication. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Publication Added Successfully!</h3>
            <p className="text-gray-600">Your publication has been added to your portfolio.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">
            <span className="text-[#101A24]">{isEditMode ? 'Edit Publication' : 'Add New Publication'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {showVerificationWarning && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Warning:</strong> Your name ({user?.name}) does not appear in the authors list.
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Textarea
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter the publication title"
                  className="mt-1"
                  rows={2}
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="journal">Journal *</Label>
                <Input
                  id="journal"
                  value={formData.journal}
                  onChange={(e) => handleInputChange('journal', e.target.value)}
                  placeholder="Enter journal name"
                  className="mt-1"
                />
                {errors.journal && <p className="text-red-500 text-sm mt-1">{errors.journal}</p>}
              </div>

               <div>
                <Label htmlFor="quartile">Quartile</Label>
                <select
                  id="quartile"
                  value={formData.quartile}
                  onChange={(e) => handleInputChange('quartile', e.target.value)}
                                    className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/20 focus:border-[#101A24]/50"

                >
                  <option value="">Select quartile</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
                {errors.quartile && <p className="text-red-500 text-sm mt-1">{errors.quartile}</p>}
              </div>

              <div>
                <Label htmlFor="impactFactor">Impact Factor</Label>
                <Input
                  id="impactFactor"
                  value={formData.impactFactor}
                  onChange={(e) => handleInputChange('impactFactor', e.target.value)}
                  placeholder="e.g., 3.45"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="citeScore">CiteScore</Label>
                <Input
                  id="citeScore"
                  value={formData.citeScore}
                  onChange={(e) => handleInputChange('citeScore', e.target.value)}
                  placeholder="e.g., 4.2"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Authors */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Authors</h3>
            {formData.authors.map((author, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    value={author}
                    onChange={(e) => updateAuthor(index, e.target.value)}
                    placeholder={`Author ${index + 1} name`}
                  />
                </div>
                {formData.authors.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeAuthor(index)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
                {index === formData.authors.length - 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAuthor}
                    className="text-[#101A24] border-[#E5DDC6] hover:bg-[#E5DDC6]/30"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {errors.authors && <p className="text-red-500 text-sm">{errors.authors}</p>}
          </div>

          {/* Publication Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Publication Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="volume">Volume</Label>
                <Input
                  id="volume"
                  value={formData.volume}
                  onChange={(e) => handleInputChange('volume', e.target.value)}
                  placeholder="e.g., 25"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="issue">Issue</Label>
                <Input
                  id="issue"
                  value={formData.issue}
                  onChange={(e) => handleInputChange('issue', e.target.value)}
                  placeholder="e.g., 3"
                  className="mt-1"
                />
              </div>

              <div>
  <Label htmlFor="positionOfAuthor">Your Position</Label>
  <select
    id="positionOfAuthor"
    value={formData.positionOfAuthor}
    onChange={(e) => handleInputChange('positionOfAuthor', e.target.value)}
    className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#101A24]/20 focus:border-[#101A24]/50"
  >
    <option value="">Select your position</option>
    <option value="Corresponding Author">Corresponding Author</option>
    {formData.authors.filter(a => a.trim()).map((_, i) => {
      const n = i + 1;
      const s = ['th','st','nd','rd'];
      const v = n % 100;
      const ordinal = n + (s[(v-20)%10] || s[v] || s[0]);
      return <option key={i} value={ordinal}>{ordinal} Author</option>;
    })}
    <option value="Other">Other</option>
  </select>
  {formData.positionOfAuthor && (
    <p className="text-xs text-[#101A24] mt-1">Auto-detected — you can override if needed</p>
  )}
</div>

              <div>
                <Label htmlFor="startPage">Start Page</Label>
                <Input
                  id="startPage"
                  value={formData.startPage}
                  onChange={(e) => handleInputChange('startPage', e.target.value)}
                  placeholder="e.g., 123"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="lastPage">End Page</Label>
                <Input
                  id="lastPage"
                  value={formData.lastPage}
                  onChange={(e) => handleInputChange('lastPage', e.target.value)}
                  placeholder="e.g., 135"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="monthYear">Date *</Label>
                <Input
                  id="monthYear"
                  value={formData.monthYear}
                  onChange={(e) => handleInputChange('monthYear', e.target.value)}
                  placeholder="e.g., March 2024"
                  className="mt-1"
                />
                {errors.monthYear && <p className="text-red-500 text-sm mt-1">{errors.monthYear}</p>}
              </div>

              <div>
  <Label htmlFor="academicYear">Academic Year</Label>
  <Input
    id="academicYear"
    value={formData.academicYear}
    readOnly
    placeholder="Auto-derived from Date"
    className="mt-1 bg-gray-50 text-gray-500 cursor-not-allowed"
  />
  {formData.academicYear && (
  <p className="text-xs text-[#101A24] mt-1">Auto-filled — you can edit if needed</p>
)}
</div>

                            <div>
                <Label>Indexing</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {['Scopus', 'Google Scholar', 'Web of Science', 'Other'].map(opt => {
                    const active = (formData.indexing || '').includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const current = (formData.indexing || '').split(', ').filter(Boolean);
                          const next = active
                            ? current.filter(x => x !== opt)
                            : [...current, opt];
                          handleInputChange('indexing', next.join(', '));
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? 'bg-[#101A24] text-white border-[#101A24]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#101A24]/50'
                        }`}
                      >
                        {active ? '✓ ' : ''}{opt}
                      </button>
                    );
                  })}
                </div>
                {formData.indexing && (
                  <p className="text-xs text-gray-400 mt-1">{formData.indexing}</p>
                )}
              </div>


              <div>
                <Label htmlFor="areaOfPaper">Area of Paper</Label>
                <Input
                  id="areaOfPaper"
                  value={formData.areaOfPaper}
                  onChange={(e) => handleInputChange('areaOfPaper', e.target.value)}
                  placeholder="e.g., Machine Learning"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Links & Identifiers</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doi">DOI</Label>
                <Input
                  id="doi"
                  value={formData.doi}
                  onChange={(e) => handleInputChange('doi', e.target.value)}
                  placeholder="e.g., 10.1234/example"
                  className="mt-1"
                />
                {errors.doi && <p className="text-red-500 text-sm mt-1">{errors.doi}</p>}
              </div>

              <div>
                <Label htmlFor="link">Publication Link *</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                  placeholder="https://example.com/paper"
                  className="mt-1"
                />
                {errors.link && <p className="text-red-500 text-sm mt-1">{errors.link}</p>}
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Upload Document (Optional)</h3>
            <div>
              <Label htmlFor="file">Upload Publication Copy</Label>
              <div className="mt-2">
                <label htmlFor="file" className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#E5DDC6]/400 hover:bg-[#E5DDC6]/30/50 transition-colors">
                  <div className="text-center">
                    {selectedFile ? (
                      <div className="flex items-center space-x-2 text-[#101A24]">
                        <File className="w-6 h-6" />
                        <span className="text-sm">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload PDF, DOCX, or image</span>
                        <span className="text-xs text-gray-400 mt-1">Maximum file size: 10MB</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="file"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                  />
                </label>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove File
                  </Button>
                )}
                {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#101A24] hover:bg-[#16222E] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                isEditMode ? 'Update Publication' : 'Add Publication'
              )}
            </Button>
          </div>

          {errors.submit && (
            <div className="text-red-500 text-sm text-center mt-2">{errors.submit}</div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}