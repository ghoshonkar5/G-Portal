// Shared mock data for Faculty and Admin dashboards
// This ensures data consistency across the application

export interface Publication {
  id: string;
  title: string;
  journal: string;
  quartile: string;
  impactFactor: string;
  citeScore: string;
  wosCitations: number;
  scopusCitations: number;
  googleCitations: number;
  authors: string[];
  indexing: string;
  areaOfPaper: string;
  apaFormat: string;
  positionOfAuthor: string;
  volume: string;
  issue: string;
  startPage: string;
  lastPage: string;
  monthYear: string;
  academicYear: string;
  listOfPaperFromJournal: string;
  doi: string;
  link: string;
  facultyName?: string;
  facultyId?: string | number | null;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export interface Conference {
  id: string;
  title: string;
  conferenceName: string;
  date: string;
  authors: string[];
  type: 'National' | 'International';
  doi: string;
  indexing: string;
  link: string;
  academicYear: string;
  host: string;
  facultyName?: string;
  facultyId?: string | number | null;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export interface BookChapter {
  id: string;
  title: string;
  authorName: string;
  departmentAffiliation: string;
  isbnIssn: string;
  publisher: string;
  monthYear: string;
  academicYear: string;
  type: 'Book' | 'Book Chapter';
  link: string;
  facultyName?: string;
  facultyId?: string | number | null;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export const mockPublications: Publication[] = [
  {
    id: "1",
    title: "The Professionalization of City-Specific Meme Pages",
    journal: "DiVA Portal (Jönköping University)",
    quartile: "Q3",
    impactFactor: "N/A",
    citeScore: "N/A",
    wosCitations: 0,
    scopusCitations: 0,
    googleCitations: 0,
    authors: ["Stefan Hähne", "Andrea Wotke"],
    indexing: "Institutional repository",
    areaOfPaper: "Social Media, Online Communities, Professionalization",
    apaFormat: "Hähne, S., & Wotke, A. (2025). The Professionalization of City-Specific Meme Pages. Jönköping University, Sweden.",
    positionOfAuthor: "First/Corresponding",
    volume: "Thesis document",
    issue: "",
    startPage: "Full document",
    lastPage: "",
    monthYear: "May 2025",
    academicYear: "2024-2025",
    listOfPaperFromJournal: "Institutional Thesis",
    doi: "N/A",
    link: "http://www.diva-portal.org/smash/get/diva2:1964911/FULLTEXT01.pdf",
    facultyName: "Stefan Hähne",
    fileData: "http://www.diva-portal.org/smash/get/diva2:1964911/FULLTEXT01.pdf",
    fileName: "City-Specific-Meme-Pages-Professionalization.pdf",
    fileType: "application/pdf"
  },
  {
    id: "2",
    title: "Machine Learning Approaches for Sustainable Energy Management in Smart Cities",
    journal: "IEEE Transactions on Smart Grid",
    quartile: "Q1",
    impactFactor: "9.6",
    citeScore: "18.4",
    wosCitations: 45,
    scopusCitations: 52,
    googleCitations: 67,
    authors: ["Dr. Rajesh Kumar", "Dr. Priya Sharma", "Dr. Amit Verma"],
    indexing: "SCI, Scopus, IEEE Xplore",
    areaOfPaper: "Computer Science, Energy Systems",
    apaFormat: "Kumar, R., Sharma, P., & Verma, A. (2024). Machine Learning Approaches for Sustainable Energy Management in Smart Cities. IEEE Transactions on Smart Grid, 15(2), 123-145. https://doi.org/10.1109/TSG.2024.001",
    positionOfAuthor: "Corresponding Author",
    volume: "15",
    issue: "2",
    startPage: "123",
    lastPage: "145",
    monthYear: "March 2024",
    academicYear: "2023-2024",
    listOfPaperFromJournal: "Q1 Journal",
    doi: "10.1109/TSG.2024.001",
    link: "https://ieeexplore.ieee.org/document/12345",
    facultyName: "Dr. Rajesh Kumar",
    fileData: "https://arxiv.org/pdf/2312.04692.pdf",
    fileName: "ML-Sustainable-Energy-Smart-Cities.pdf",
    fileType: "application/pdf"
  },
  {
    id: "3",
    title: "Blockchain-Based Healthcare Data Management: A Comprehensive Survey",
    journal: "Nature Computer Science",
    quartile: "Q1",
    impactFactor: "12.8",
    citeScore: "22.1",
    wosCitations: 78,
    scopusCitations: 89,
    googleCitations: 102,
    authors: ["Dr. Anita Patel", "Dr. Suresh Reddy", "Dr. Meera Singh"],
    indexing: "SCI, Scopus, PubMed",
    areaOfPaper: "Computer Science, Healthcare Technology",
    apaFormat: "Patel, A., Reddy, S., & Singh, M. (2024). Blockchain-Based Healthcare Data Management: A Comprehensive Survey. Nature Computer Science, 4(3), 256-278. https://doi.org/10.1038/s43588-024-001",
    positionOfAuthor: "Position 1",
    volume: "4",
    issue: "3",
    startPage: "256",
    lastPage: "278",
    monthYear: "April 2024",
    academicYear: "2023-2024",
    listOfPaperFromJournal: "Q1 Journal",
    doi: "10.1038/s43588-024-001",
    link: "https://nature.com/articles/s43588-024-001",
    facultyName: "Dr. Anita Patel",
    fileData: "https://arxiv.org/pdf/2108.05552.pdf",
    fileName: "Blockchain-Healthcare-Data-Survey.pdf",
    fileType: "application/pdf"
  },
  {
    id: "4",
    title: "Advanced Materials for Solar Cell Efficiency Enhancement",
    journal: "Advanced Energy Materials",
    quartile: "Q1",
    impactFactor: "14.5",
    citeScore: "20.1",
    wosCitations: 123,
    scopusCitations: 135,
    googleCitations: 158,
    authors: ["Dr. Vikram Chandra", "Dr. Lisa Zhang", "Dr. Ahmed Hassan"],
    indexing: "SCI, Scopus, Web of Science",
    areaOfPaper: "Materials Science, Renewable Energy",
    apaFormat: "Chandra, V., Zhang, L., & Hassan, A. (2024). Advanced Materials for Solar Cell Efficiency Enhancement. Advanced Energy Materials, 12(4), 890-912. https://doi.org/10.1002/aem.2024.003",
    positionOfAuthor: "Corresponding Author",
    volume: "12",
    issue: "4",
    startPage: "890",
    lastPage: "912",
    monthYear: "January 2024",
    academicYear: "2023-2024",
    listOfPaperFromJournal: "Q1 Journal",
    doi: "10.1002/aem.2024.003",
    link: "https://onlinelibrary.wiley.com/doi/aem.2024.003",
    facultyName: "Dr. Vikram Chandra",
    fileData: "https://arxiv.org/pdf/2203.15110.pdf",
    fileName: "Advanced-Materials-Solar-Cell.pdf",
    fileType: "application/pdf"
  },
  {
    id: "5",
    title: "Artificial Intelligence in Precision Agriculture: Current Trends and Future Prospects",
    journal: "Computers and Electronics in Agriculture",
    quartile: "Q1",
    impactFactor: "8.3",
    citeScore: "12.3",
    wosCitations: 67,
    scopusCitations: 74,
    googleCitations: 89,
    authors: ["Dr. Sunita Rani", "Dr. Manoj Tripathi", "Dr. Kiran Patel"],
    indexing: "SCI, Scopus, Web of Science",
    areaOfPaper: "Computer Science, Agriculture",
    apaFormat: "Rani, S., Tripathi, M., & Patel, K. (2023). Artificial Intelligence in Precision Agriculture: Current Trends and Future Prospects. Computers and Electronics in Agriculture, 195, 106-125. https://doi.org/10.1016/j.compag.2023.456",
    positionOfAuthor: "Corresponding Author",
    volume: "195",
    issue: "",
    startPage: "106",
    lastPage: "125",
    monthYear: "December 2023",
    academicYear: "2023-2024",
    listOfPaperFromJournal: "Q1 Journal",
    doi: "10.1016/j.compag.2023.456",
    link: "https://sciencedirect.com/science/article/compag.2023.456",
    facultyName: "Dr. Sunita Rani",
    fileData: "https://arxiv.org/pdf/2104.13105.pdf",
    fileName: "AI-Precision-Agriculture.pdf",
    fileType: "application/pdf"
  },
  {
    id: "6",
    title: "Deep Learning for Medical Image Analysis: A Systematic Review",
    journal: "Medical Image Analysis",
    quartile: "Q1",
    impactFactor: "13.8",
    citeScore: "19.5",
    wosCitations: 156,
    scopusCitations: 178,
    googleCitations: 203,
    authors: ["Dr. Arun Mishra", "Dr. Pooja Reddy", "Dr. Sanjay Gupta"],
    indexing: "SCI, Scopus, PubMed",
    areaOfPaper: "Computer Science, Medical Imaging",
    apaFormat: "Mishra, A., Reddy, P., & Gupta, S. (2023). Deep Learning for Medical Image Analysis: A Systematic Review. Medical Image Analysis, 89, 234-256. https://doi.org/10.1016/j.media.2023.789",
    positionOfAuthor: "Position 2",
    volume: "89",
    issue: "",
    startPage: "234",
    lastPage: "256",
    monthYear: "November 2023",
    academicYear: "2023-2024",
    listOfPaperFromJournal: "Q1 Journal",
    doi: "10.1016/j.media.2023.789",
    link: "https://sciencedirect.com/science/article/media.2023.789",
    facultyName: "Dr. Arun Mishra",
    fileData: "https://arxiv.org/pdf/1702.05747.pdf",
    fileName: "Deep-Learning-Medical-Image-Analysis.pdf",
    fileType: "application/pdf"
  }
];

export const mockConferences: Conference[] = [
  {
    id: "1",
    title: "Petri Nets 2025 (ICATPN): Advances in Model Checking",
    conferenceName: "International Conference on Application and Theory of Petri Nets and Concurrency (ICATPN)",
    date: "2025-06-23",
    authors: ["Springer Proceedings (varied)"],
    type: "International",
    doi: "10.1007/978-3-030-87002-4",
    indexing: "Indexed in Springer LNCS, Web of Science, Scopus",
    link: "https://www.springer.com/gp/book/9783030870024",
    academicYear: "2024-2025",
    host: "Springer",
    facultyName: "Dr. Research Faculty",
    fileData: "https://link.springer.com/content/pdf/10.1007/978-3-030-51831-8.pdf",
    fileName: "Petri-Nets-2025-ICATPN-Proceedings.pdf",
    fileType: "application/pdf"
  },
  {
    id: "2",
    title: "AI-Driven Solutions for Smart City Infrastructure",
    conferenceName: "IEEE International Conference on Smart Cities",
    date: "2024-03-15",
    authors: ["Dr. Rajesh Kumar", "Dr. Priya Sharma", "Dr. Amit Verma"],
    type: "International",
    doi: "10.1109/ICSC.2024.001",
    indexing: "IEEE Xplore, Scopus",
    link: "https://ieeexplore.ieee.org/conference/12345",
    academicYear: "2023-2024",
    host: "IEEE Computer Society",
    facultyName: "Dr. Rajesh Kumar",
    fileData: "https://arxiv.org/pdf/2208.04497.pdf",
    fileName: "AI-Smart-City-Infrastructure.pdf",
    fileType: "application/pdf"
  },
  {
    id: "3",
    title: "Blockchain Security in Healthcare Data Management",
    conferenceName: "ACM International Conference on Healthcare Informatics",
    date: "2024-02-28",
    authors: ["Dr. Anita Patel", "Dr. Suresh Reddy", "Dr. Meera Singh"],
    type: "International",
    doi: "10.1145/3589234.567",
    indexing: "ACM Digital Library, Scopus",
    link: "https://dl.acm.org/conference/34567",
    academicYear: "2023-24",
    host: "ACM",
    facultyName: "Dr. Anita Patel",
    fileData: "https://arxiv.org/pdf/2107.11265.pdf",
    fileName: "Blockchain-Healthcare-Security.pdf",
    fileType: "application/pdf"
  },
  {
    id: "4",
    title: "Advanced Materials for Renewable Energy Applications",
    conferenceName: "International Conference on Materials Science and Engineering",
    date: "2024-01-20",
    authors: ["Dr. Vikram Chandra", "Dr. Kavita Gupta", "Dr. Rohit Jain"],
    type: "International",
    doi: "10.1016/j.matconf.2024.002",
    indexing: "ScienceDirect, Scopus",
    link: "https://sciencedirect.com/conference/45678",
    academicYear: "2023-24",
    host: "Elsevier",
    facultyName: "Dr. Vikram Chandra",
    fileData: "https://arxiv.org/pdf/2204.04987.pdf",
    fileName: "Advanced-Materials-Renewable-Energy.pdf",
    fileType: "application/pdf"
  },
  {
    id: "5",
    title: "Quantum Algorithms for Financial Risk Modeling",
    conferenceName: "National Conference on Quantum Computing",
    date: "2023-12-10",
    authors: ["Dr. Neha Agarwal", "Dr. Ravi Kumar", "Dr. Deepak Sharma"],
    type: "National",
    doi: "10.1234/NCQC.2023.003",
    indexing: "Conference Proceedings",
    link: "https://quantumconf2023.org/proceedings",
    academicYear: "2023-24",
    host: "IIT Delhi",
    facultyName: "Dr. Neha Agarwal",
    fileData: "https://arxiv.org/pdf/2201.02773.pdf",
    fileName: "Quantum-Algorithms-Financial-Risk.pdf",
    fileType: "application/pdf"
  },
  {
    id: "6",
    title: "Machine Learning in Precision Agriculture Systems",
    conferenceName: "International Conference on Agricultural Technology",
    date: "2023-11-05",
    authors: ["Dr. Sunita Rani", "Dr. Manoj Tripathi"],
    type: "International",
    doi: "10.1007/agt.2023.004",
    indexing: "Scopus, Springer",
    link: "https://springer.com/agt2023",
    academicYear: "2023-24",
    host: "Springer",
    facultyName: "Dr. Sunita Rani",
    fileData: "https://arxiv.org/pdf/2006.12748.pdf",
    fileName: "ML-Precision-Agriculture.pdf",
    fileType: "application/pdf"
  }
];

export const mockBooksChapters: BookChapter[] = [
  {
    id: "1",
    title: "Recent Research Trends in Computer Science",
    authorName: "Chief Editor: Dr. A. Ramaswami Reddy, Coeditor: Dr. Neetu Gupta",
    departmentAffiliation: "Computer Science and Engineering, MREC(A) & Amity University",
    isbnIssn: "To be assigned",
    publisher: "Integrated Publications",
    monthYear: "December 2024",
    academicYear: "2024-2025",
    type: "Book",
    link: "https://www.integratedpublications.in/publish-book-chapter/1606561958-Recent-Research-Trends-in-Computer-Science",
    facultyName: "Dr. A. Ramaswami Reddy",
    fileData: "https://arxiv.org/pdf/2201.03545.pdf",
    fileName: "Recent-Research-Trends-Computer-Science.pdf",
    fileType: "application/pdf"
  },
  {
    id: "2",
    title: "Artificial Intelligence in Modern Education: Transforming Learning Paradigms",
    authorName: "Dr. Rajesh Kumar, Dr. Priya Sharma",
    departmentAffiliation: "Computer Science and Engineering",
    isbnIssn: "978-3-030-87654-1",
    publisher: "Springer Nature",
    monthYear: "March 2024",
    academicYear: "2023-24",
    type: "Book",
    link: "https://springer.com/book/978-3-030-87654-1",
    facultyName: "Dr. Rajesh Kumar",
    fileData: "https://arxiv.org/pdf/2104.12949.pdf",
    fileName: "AI-Modern-Education.pdf",
    fileType: "application/pdf"
  },
  {
    id: "3",
    title: "Blockchain Technology in Healthcare Data Security",
    authorName: "Dr. Anita Patel, Dr. Suresh Reddy, Dr. Meera Singh",
    departmentAffiliation: "Information Technology",
    isbnIssn: "978-0-12-823456-7",
    publisher: "Elsevier",
    monthYear: "February 2024",
    academicYear: "2023-24",
    type: "Book Chapter",
    link: "https://sciencedirect.com/book/978-0-12-823456-7",
    facultyName: "Dr. Anita Patel",
    fileData: "https://arxiv.org/pdf/2012.12281.pdf",
    fileName: "Blockchain-Healthcare-Security-Chapter.pdf",
    fileType: "application/pdf"
  },
  {
    id: "4",
    title: "Sustainable Energy Materials: Advanced Photovoltaic Technologies",
    authorName: "Dr. Vikram Chandra, Dr. Kavita Gupta",
    departmentAffiliation: "Materials Science and Engineering",
    isbnIssn: "978-1-119-76543-2",
    publisher: "Wiley",
    monthYear: "January 2024",
    academicYear: "2023-24",
    type: "Book",
    link: "https://wiley.com/book/978-1-119-76543-2",
    facultyName: "Dr. Vikram Chandra",
    fileData: "https://arxiv.org/pdf/2111.09436.pdf",
    fileName: "Sustainable-Energy-Materials.pdf",
    fileType: "application/pdf"
  },
  {
    id: "5",
    title: "Quantum Computing Applications in Financial Modeling",
    authorName: "Dr. Neha Agarwal, Dr. Ravi Kumar",
    departmentAffiliation: "Mathematics and Computing",
    isbnIssn: "978-0-367-54321-8",
    publisher: "CRC Press",
    monthYear: "December 2023",
    academicYear: "2023-24",
    type: "Book Chapter",
    link: "https://crcpress.com/book/978-0-367-54321-8",
    facultyName: "Dr. Neha Agarwal",
    fileData: "https://arxiv.org/pdf/1809.03006.pdf",
    fileName: "Quantum-Computing-Financial-Modeling.pdf",
    fileType: "application/pdf"
  },
  {
    id: "6",
    title: "Machine Learning for Smart Agriculture: Precision Farming Techniques",
    authorName: "Dr. Sunita Rani, Dr. Manoj Tripathi, Dr. Kiran Patel",
    departmentAffiliation: "Agricultural Engineering",
    isbnIssn: "978-3-319-98765-4",
    publisher: "Springer",
    monthYear: "November 2023",
    academicYear: "2023-24",
    type: "Book Chapter",
    link: "https://springer.com/chapter/978-3-319-98765-4",
    facultyName: "Dr. Sunita Rani",
    fileData: "https://arxiv.org/pdf/1906.03100.pdf",
    fileName: "ML-Smart-Agriculture-Chapter.pdf",
    fileType: "application/pdf"
  }
];
