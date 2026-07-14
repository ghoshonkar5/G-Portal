import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, AuthContextType } from '../types/index'

const AuthContext = createContext<AuthContextType | null>(null)

// Adds snake_case faculty_id and normalizes boolean flags so all modules work without changes
const withAlias = (user: any): User => ({
    ...user,
    faculty_id: user.facultyId ?? user.faculty_id ?? null,
    facultyId: user.facultyId ?? user.faculty_id ?? null,
    universityId: user.universityId ?? user.UniversityId ?? user.facultyId ?? user.faculty_id ?? null,
    UniversityId: user.UniversityId ?? user.universityId ?? user.facultyId ?? user.faculty_id ?? null,
    branch: user.branch ?? user.department ?? null,
    firstLogin: user.firstLogin ?? user.first_login ?? false,
    first_login: user.firstLogin ?? user.first_login ?? false,
    profileCompleted: user.profileCompleted ?? user.profile_completed ?? false,
    profile_completed: user.profileCompleted ?? user.profile_completed ?? false,
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser) {
            try {
                const parsed: User = JSON.parse(storedUser)
                setToken(storedToken)
                setUser(withAlias(parsed))
            } catch {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
            }
        }
        setLoading(false)
    }, [])

    const fetchFullProfile = async (tok: string): Promise<Partial<User>> => {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${tok}` },
        });
        const data = await res.json();
        if (data.success && data.user) return data.user;
    } catch {}
    return {};
};

    const login = async (newToken: string, newUser: User) => {
    const fullProfile = await fetchFullProfile(newToken);
    const mergedProfile: any = { ...fullProfile };
    Object.keys(newUser).forEach(key => {
        if ((newUser as any)[key] !== undefined && (newUser as any)[key] !== null) {
            mergedProfile[key] = (newUser as any)[key];
        }
    });
    const enriched = withAlias(mergedProfile);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(enriched));
    setToken(newToken);
    setUser(enriched);
};

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    const updateProfileUrls = async (urls: {
    googleScholarUrl?: string;
    scopusUrl?: string;
    scopusUrl2?: string;
    scopusUrl3?: string;
    wosUrl?: string;
    wosUrl2?: string;
    wosUrl3?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch('/api/profile/urls', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(urls),
        });
        const data = await res.json();
        if (data.success && data.data) {
    const enriched = withAlias({ ...user!, ...data.data });
    localStorage.setItem('user', JSON.stringify(enriched));
    setUser(enriched);
}
        return data.success
            ? { success: true }
            : { success: false, error: data.message || 'Failed to update URLs' };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

    const saveExtendedProfile = async (data: {
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
    }): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (json.success && json.user) {
                // Merge the returned profile fields into existing user
                // AFTER
const merged = withAlias({
    ...user!,
    ...json.user,
    mobile: data.mobile ?? user?.mobile,
    // Preserve URL fields — they're saved separately via updateProfileUrls
    googleScholarUrl: user?.googleScholarUrl,
    scopusUrl:  user?.scopusUrl,
    scopusUrl2: (user as any)?.scopusUrl2,
    scopusUrl3: (user as any)?.scopusUrl3,
    wosUrl:  user?.wosUrl,
    wosUrl2: (user as any)?.wosUrl2,
    wosUrl3: (user as any)?.wosUrl3,
});
                localStorage.setItem('user', JSON.stringify(merged));
                setUser(merged);
            }
            return json.success
                ? { success: true }
                : { success: false, error: json.message || 'Failed to save profile' };
        } catch (err) {
            return { success: false, error: String(err) };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated: !!token,
            login,
            logout,
            updateProfileUrls,
            saveExtendedProfile,
        }}>
            {children}
        </AuthContext.Provider>
    )
}



export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside AuthProvider')
    return context
}