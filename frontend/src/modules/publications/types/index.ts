export interface Publication {
  id: string;
  facultyId?: string | number | null;
  facultyName?: string | null;
  title: string;
  journal: string;
  quartile: string | null;
  impactFactor: string | null;
  sjrScore?: string | null;
  citeScore?: string | null;
  wosCitations: number;
  scopusCitations: number;
  googleCitations: number;
  authors: string[];
  indexing: string;
  source: string;
  areaOfPaper?: string | null;
  positionOfAuthor?: string | null;
  volume?: string | null;
  issue?: string | null;
  startPage?: string | null;
  lastPage?: string | null;
  monthYear: string;
  academicYear: string;
  doi?: string | null;
  link?: string | null;
  apaFormat?: string | null;
  fileData?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
}

export interface Conference {
  id: string;
  facultyId?: string | number | null;
  facultyName?: string | null;
  title: string;
  conferenceName: string;
  type: 'International' | 'National';
  venue: string;
  country: string;
  month: string;
  year: string;
  academicYear: string;
  authors: string[];
  doi?: string | null;
  link?: string | null;
  apaFormat?: string | null;
  fileData?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
}

export interface BookChapter {
  id: string;
  facultyId?: string | number | null;
  facultyName?: string | null;
  title: string;
  type: 'Book' | 'Book Chapter';
  publisher: string;
  isbn?: string | null;
  year: string;
  academicYear: string;
  authors: string[];
  doi?: string | null;
  link?: string | null;
  apaFormat?: string | null;
  fileData?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
}

export interface Flag {
  id: number;
  item_type: 'publication' | 'conference' | 'book';
  item_id: number;
  reason: string;
  status: 'flagged' | 'pending_review' | 'resolved';
  flagged_by_name?: string | null;
  created_at: string;
  message?: string | null;
}

export interface PotentialFlag {
  id: number;
  publication_id: string;
  missing_fields: string[];
  status: string;
}