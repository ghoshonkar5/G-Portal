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

interface AddConferenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (conferenceData: any) => Promise<void>;
  initialData?: any;
}

interface ConferenceFormData {
  title: string;
  conferenceName: string;
  conferenceType: string;
  venue: string;
  country: string;
  organizer: string;
  host: string;
  authors: string[];
  presentationType: string;
  indexing: string;
  areaOfPaper: string;
  positionOfAuthor: string;
  conferenceDate: string;
  academicYear: string;
  doi: string;
  link: string;
  presentationLink: string;
  abstract: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

const deriveAcademicYear = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
};

export function AddConferenceForm({ isOpen, onClose, onSubmit, initialData }: AddConferenceFormProps) {
  const { user } = useAuth();
  const isEditMode = !!initialData;

  const getInitialFormData = (): ConferenceFormData => {
    if (initialData) {
      return {
        title: initialData.title || '',
        conferenceName: initialData.conferenceName || '',
        conferenceType: initialData.type || initialData.conferenceType || '',
        venue: initialData.venue || '',
        country: initialData.country || '',
        organizer: initialData.organizer || '',
        host: initialData.host || '',
        authors: initialData.authors?.length ? initialData.authors : [''],
        presentationType: initialData.presentationType || '',
        indexing: initialData.indexing || '',
        areaOfPaper: initialData.areaOfPaper || '',
        positionOfAuthor: initialData.positionOfAuthor || '',
        conferenceDate: initialData.date || initialData.conferenceDate || '',
        academicYear: initialData.academicYear || '',
        doi: initialData.doi || '',
        link: initialData.link || '',
        presentationLink: initialData.presentationLink || '',
        abstract: initialData.abstract || '',
        fileUrl: initialData.fileUrl || initialData.fileData,
        fileName: initialData.fileName,
        fileType: initialData.fileType,
      };
    }
    return {
      title: '',
      conferenceName: '',
      conferenceType: '',
      venue: '',
      country: '',
      organizer: '',
      host: '',
      authors: [''],
      presentationType: '',
      indexing: '',
      areaOfPaper: '',
      positionOfAuthor: '',
      conferenceDate: '',
      academicYear: '',
      doi: '',
      link: '',
      presentationLink: '',
      abstract: '',
    };
  };

  const [formData, setFormData] = useState<ConferenceFormData>(getInitialFormData());
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

  // ✅ FIX: Reset when opening for add; re-populate when opening for edit
  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen, initialData]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (field: keyof ConferenceFormData, value: string) => {
  setFormData(prev => {
    const updated = { ...prev, [field]: value };
    if (field === 'conferenceDate') {
      updated.academicYear = deriveAcademicYear(value);
    }
    return updated;
  });
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }
};

  const addAuthor = () => setFormData(prev => ({ ...prev, authors: [...prev.authors, ''] }));
  const removeAuthor = (index: number) => setFormData(prev => ({ ...prev, authors: prev.authors.filter((_, i) => i !== index) }));
  const updateAuthor = (index: number, value: string) => setFormData(prev => ({ ...prev, authors: prev.authors.map((a, i) => i === index ? value : a) }));

  const scrollToFirstError = (errorFields: Record<string, string>) => {
    const fieldOrder = ['title', 'conferenceName', 'conferenceType', 'host', 'authors', 'conferenceDate', 'academicYear', 'doi', 'link', 'presentationLink'];
    for (const field of fieldOrder) {
      if (errorFields[field]) {
        const el = document.getElementById(field === 'authors' ? 'authors-section' : field);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLInputElement).focus?.();
        }
        break;
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.conferenceName.trim()) newErrors.conferenceName = 'Conference name is required';
    if (!formData.conferenceType) newErrors.conferenceType = 'Conference type is required';
    if (!formData.host.trim()) newErrors.host = 'Host is required';
    if (!formData.conferenceDate.trim()) newErrors.conferenceDate = 'Conference date is required';
    if (!formData.academicYear.trim()) newErrors.academicYear = 'Academic year is required';

    const validAuthors = formData.authors.filter(a => a.trim() !== '');
    if (validAuthors.length === 0) newErrors.authors = 'At least one author is required';
    if (formData.doi && !formData.doi.includes('/')) newErrors.doi = 'Please enter a valid DOI';
    if (formData.link && !formData.link.startsWith('http')) newErrors.link = 'Please enter a valid URL';
    if (formData.presentationLink && !formData.presentationLink.startsWith('http')) newErrors.presentationLink = 'Please enter a valid URL';

    if (user?.name) {
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
      const isAuthor = validAuthors.some(a =>
        normalize(a).includes(normalize(user.name)) ||
        normalize(user.name).includes(normalize(a))
      );
      setShowVerificationWarning(!isAuthor);
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => scrollToFirstError(newErrors), 50);
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const cleanedData: any = {
        ...formData,
        type: formData.conferenceType,
        date: formData.conferenceDate,
        authors: formData.authors.filter(a => a.trim() !== ''),
      };

      if (selectedFile) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            cleanedData.fileUrl = reader.result as string;
            cleanedData.fileName = selectedFile.name;
            cleanedData.fileType = selectedFile.type;
            resolve(null);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      await onSubmit(cleanedData);
      setSuccess(true);
      setTimeout(() => handleClose(), 1500);
    } catch (error: any) {
      console.error('Failed to save conference:', error);
      setErrors({ submit: error.message || `Failed to ${isEditMode ? 'update' : 'add'} conference. Please try again.` });
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isEditMode ? 'Conference Updated Successfully!' : 'Conference Added Successfully!'}
            </h3>
            <p className="text-gray-600">Your conference presentation has been {isEditMode ? 'updated in' : 'added to'} your portfolio.</p>
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
            <span className="text-[#101A24]">{isEditMode ? 'Edit Conference' : 'Add New Conference'}</span>
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

          {/* Paper & Conference Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Paper & Conference Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Paper Title *</Label>
                <Textarea id="title" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="Enter the title of your paper" className="mt-1" rows={2} />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conferenceName">Conference Name *</Label>
                  <Input id="conferenceName" value={formData.conferenceName} onChange={(e) => handleInputChange('conferenceName', e.target.value)} placeholder="Enter conference name" className="mt-1" />
                  {errors.conferenceName && <p className="text-red-500 text-sm mt-1">{errors.conferenceName}</p>}
                </div>

                <div>
                  <Label htmlFor="conferenceType">Conference Type *</Label>
                  <Select value={formData.conferenceType} onValueChange={(value) => handleInputChange('conferenceType', value)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select conference type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="National">National</SelectItem>
                      <SelectItem value="International">International</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.conferenceType && <p className="text-red-500 text-sm mt-1">{errors.conferenceType}</p>}
                </div>

                <div>
                  <Label htmlFor="venue">Venue</Label>
                  <Input id="venue" value={formData.venue} onChange={(e) => handleInputChange('venue', e.target.value)} placeholder="Conference venue/location" className="mt-1" />
                  {errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} placeholder="Country" className="mt-1" />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                <div>
                  <Label htmlFor="organizer">Organizer</Label>
                  <Input id="organizer" value={formData.organizer} onChange={(e) => handleInputChange('organizer', e.target.value)} placeholder="Conference organizer" className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="host">Host *</Label>
                  <Input id="host" value={formData.host} onChange={(e) => handleInputChange('host', e.target.value)} placeholder="Conference host organization" className="mt-1" />
                  {errors.host && <p className="text-red-500 text-sm mt-1">{errors.host}</p>}
                </div>

                <div>
                  <Label htmlFor="presentationType">Presentation Type</Label>
                  <Select value={formData.presentationType} onValueChange={(value) => handleInputChange('presentationType', value)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select presentation type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oral Presentation">Oral Presentation</SelectItem>
                      <SelectItem value="Poster Presentation">Poster Presentation</SelectItem>
                      <SelectItem value="Keynote">Keynote</SelectItem>
                      <SelectItem value="Invited Talk">Invited Talk</SelectItem>
                      <SelectItem value="Panel Discussion">Panel Discussion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Authors */}
          <div id="authors-section" className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Authors</h3>
            {formData.authors.map((author, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input value={author} onChange={(e) => updateAuthor(index, e.target.value)} placeholder={`Author ${index + 1} name`} />
                </div>
                {formData.authors.length > 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => removeAuthor(index)} className="text-red-600 border-red-300 hover:bg-red-50">
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
                {index === formData.authors.length - 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={addAuthor} className="text-[#101A24] border-[#E5DDC6] hover:bg-[#E5DDC6]/30">
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {errors.authors && <p className="text-red-500 text-sm">{errors.authors}</p>}
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Additional Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="positionOfAuthor">Your Position</Label>
                <Input id="positionOfAuthor" value={formData.positionOfAuthor} onChange={(e) => handleInputChange('positionOfAuthor', e.target.value)} placeholder="e.g., First Author, Presenter" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="areaOfPaper">Research Area</Label>
                <Input id="areaOfPaper" value={formData.areaOfPaper} onChange={(e) => handleInputChange('areaOfPaper', e.target.value)} placeholder="e.g., Machine Learning" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="indexing">Indexing</Label>
                <Input id="indexing" value={formData.indexing} onChange={(e) => handleInputChange('indexing', e.target.value)} placeholder="e.g., Scopus, IEEE Xplore" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="conferenceDate">Conference Date *</Label>
                <Input id="conferenceDate" type="date" value={formData.conferenceDate} onChange={(e) => handleInputChange('conferenceDate', e.target.value)} className="mt-1" />
                {errors.conferenceDate && <p className="text-red-500 text-sm mt-1">{errors.conferenceDate}</p>}
              </div>
              <div>
                <Label htmlFor="academicYear">Academic Year *</Label>
<Input id="academicYear" value={formData.academicYear} readOnly placeholder="Auto-derived from date" className="mt-1 bg-gray-50 text-gray-500 cursor-not-allowed" />
{formData.academicYear && <p className="text-xs text-[#101A24] mt-1">Auto-filled — you can edit if needed</p>}                {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>}
              </div>
            </div>
          </div>

          {/* Abstract */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Abstract</h3>
            <div>
              <Label htmlFor="abstract">Paper Abstract</Label>
              <Textarea id="abstract" value={formData.abstract} onChange={(e) => handleInputChange('abstract', e.target.value)} placeholder="Enter your paper abstract (optional)" className="mt-1" rows={4} />
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Links & Identifiers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doi">DOI</Label>
                <Input id="doi" value={formData.doi} onChange={(e) => handleInputChange('doi', e.target.value)} placeholder="e.g., 10.1234/example" className="mt-1" />
                {errors.doi && <p className="text-red-500 text-sm mt-1">{errors.doi}</p>}
              </div>
              <div>
                <Label htmlFor="link">Paper Link</Label>
                <Input id="link" value={formData.link} onChange={(e) => handleInputChange('link', e.target.value)} placeholder="https://example.com/paper" className="mt-1" />
                {errors.link && <p className="text-red-500 text-sm mt-1">{errors.link}</p>}
              </div>
              <div>
                <Label htmlFor="presentationLink">Presentation Link</Label>
                <Input id="presentationLink" value={formData.presentationLink} onChange={(e) => handleInputChange('presentationLink', e.target.value)} placeholder="https://example.com/presentation" className="mt-1" />
                {errors.presentationLink && <p className="text-red-500 text-sm mt-1">{errors.presentationLink}</p>}
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Upload Document (Optional)</h3>
            <div>
              <Label htmlFor="file">Upload Paper/Presentation Copy</Label>
              <div className="mt-2">
                <label htmlFor="file" className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#E5DDC6]/400 hover:bg-[#E5DDC6]/30/50 transition-colors">
                  <div className="text-center">
                    {selectedFile ? (
                      <div className="flex items-center space-x-2 text-[#101A24]">
                        <File className="w-6 h-6" />
                        <span className="text-sm">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : formData.fileName && !selectedFile ? (
                      <div className="flex items-center space-x-2 text-[#101A24]">
                        <File className="w-6 h-6" />
                        <span className="text-sm">Current: {formData.fileName}</span>
                        <span className="text-xs text-gray-400">(click to replace)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload PDF, DOCX, or image</span>
                        <span className="text-xs text-gray-400 mt-1">Maximum file size: 10MB</span>
                      </div>
                    )}
                  </div>
                  <input id="file" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" onChange={handleFileChange} />
                </label>
                {selectedFile && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedFile(null)} className="mt-2 text-red-600 border-red-300 hover:bg-red-50">
                    <X className="w-4 h-4 mr-1" />Remove File
                  </Button>
                )}
                {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#101A24] hover:bg-[#16222E] text-white">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditMode ? 'Updating...' : 'Adding...'}</>
              ) : (
                isEditMode ? 'Update Conference' : 'Add Conference'
              )}
            </Button>
          </div>

          {(errors.submit || Object.keys(errors).some(k => k !== 'submit' && errors[k])) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mt-2">
              <p className="text-sm font-medium text-red-700 mb-1">Please fix the following before submitting:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {errors.submit && <li className="text-sm text-red-600">{errors.submit}</li>}
                {Object.entries(errors).filter(([k, v]) => k !== 'submit' && v).map(([k, v]) => (
                  <li key={k} className="text-sm text-red-600">{v}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}