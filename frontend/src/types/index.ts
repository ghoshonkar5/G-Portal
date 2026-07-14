// ── User shape returned by auth service ──────────────────
export interface User {
    id: number;
    facultyProfileId: number;
    facultyId: string;
    faculty_id: string | null;        // snake_case alias — used by Events module components
    name: string;
    email: string;
    role: 'faculty' | 'admin' | 'student';
    department: string | null;
    designation: string | null;
    mobile: string | null;
    isActive: boolean;
    firstLogin: boolean;
    profileCompleted: boolean;
    google_id?: string | null;
    UniversityId?: string | null;
    universityId?: string | null;
    branch?: string | null;
    // ── Publications / Profile extended fields ──────────────
googleScholarUrl?: string | null;
scopusUrl?: string | null;
scopusUrl2?: string | null;
scopusUrl3?: string | null;
wosUrl?: string | null;
wosUrl2?: string | null;
wosUrl3?: string | null;
researchArea?: string | null;
officeRoom?: string | null;
officeHours?: string | null;
coursesTaught?: string | null;
roles?: string | null;
linkedinUrl?: string | null;
websiteUrl?: string | null;
profilePhoto?: string | null;
yearsOfExperience?: number | null;
}

// ── JWT payload (decoded token shape) ───────────────────
export interface TokenPayload {
    id: number;
    facultyProfileId: number;
    facultyId: string;
    role: 'faculty' | 'admin' | 'student';
    email: string;
    tokenVersion: number;
    profileCompleted: boolean;
    firstLogin: boolean;
    iat: number;
    exp: number;
}

// ── Auth context shape ───────────────────────────────────
export interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;         // derived — used by Events module components
    login: (token: string, user: User) => Promise<void>;
    logout: () => void;
    updateProfileUrls: (urls: {
    googleScholarUrl?: string;
    scopusUrl?: string;
    scopusUrl2?: string;
    scopusUrl3?: string;
    wosUrl?: string;
    wosUrl2?: string;
    wosUrl3?: string;
}) => Promise<{ success: boolean; error?: string }>;
    saveExtendedProfile: (data: {
    mobile?: string | null;
    officeRoom?: string | null;
    yearsOfExperience?: number | null;
    researchArea?: string | null;
    coursesTaught?: string | null;
    officeHours?: string | null;
    roles?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    profilePhoto?: string | null;
}) => Promise<{ success: boolean; error?: string }>;
}

// ── API response wrappers ────────────────────────────────
export interface AuthResponse {
    success: boolean;
    token: string;
    user: User;
    message?: string;
}

export interface ApiError {
    success: false;
    message: string;
}