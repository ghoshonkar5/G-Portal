import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from 'sonner'


// Platform pages
import LoginPage from './pages/LoginPage'
import FirstLoginPage from './pages/FirstLoginPage'
import VerifyOTPPage from './pages/VerifyOTPPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OnboardingPage from './pages/OnBoardingPage'
import HomePage from './pages/HomePage'
import AdminUsersPage from './pages/AdminUsersPage'

// Events module — faculty
import DashboardPage from './modules/events/pages/faculty/DashboardPage'
import EventsPage from './modules/events/pages/faculty/EventsPage'
import NewEventPage from './modules/events/pages/faculty/NewEventPage'
import EditEventPage from './modules/events/pages/faculty/EditEventPage'
import EventsProfilePage from './modules/events/pages/faculty/ProfilePage'

// Events module — admin
import AdminDashboardPage from './modules/events/pages/admin/AdminDashboardPage'
import AdminExplorerPage from './modules/events/pages/admin/AdminExplorerPage'
import AdminFacultyPage from './modules/events/pages/admin/AdminFacultyPage'

// Publications module — faculty
import PubDashboardPage from './modules/publications/pages/faculty/DashboardPage'
import { PublicationsPage } from './modules/publications/pages/faculty/PublicationsPage'
import { ConferencesPage } from './modules/publications/pages/faculty/ConferencesPage'
import { BooksChaptersPage as BooksPage } from './modules/publications/pages/faculty/BooksPage'
import { KRCPublicationsPage as KRCPage } from './modules/publications/pages/faculty/KRCPage'
import { FlagHistoryPage } from './modules/publications/pages/faculty/FlagHistoryPage'
import { EditProfile as EditProfilePage } from './modules/publications/pages/faculty/EditProfilePage'
import { useAuth } from './context/AuthContext'
import { useNavigate } from 'react-router-dom'


// Publications module — admin (redesigned)
import { AdminLayout } from './modules/publications/pages/admin/AdminLayout'
import { AdminOverviewPage } from './modules/publications/pages/admin/AdminOverviewPage'
import { AdminFacultyPage as PubAdminFacultyPage } from './modules/publications/pages/admin/AdminFacultyPage'
import { AdminPublicationsPage } from './modules/publications/pages/admin/AdminPublicationsPage'
import { AdminConferencesPage } from './modules/publications/pages/admin/AdminConferencesPage'
import { AdminBooksPage } from './modules/publications/pages/admin/AdminBooksPage'
import { AdminUploadDataPage } from './modules/publications/pages/admin/AdminUploadDataPage'

// ── Achievements module ────────────────────────────────────────────
import AchievementsIndex          from './modules/achievements/pages/AchievementsIndex'
import SubmitAchievementPage      from './modules/achievements/pages/shared/SubmitAchievementPage'
import MyAchievementsPage         from './modules/achievements/pages/shared/MyAchievementsPage'
import StudentAchievementsPage    from './modules/achievements/pages/faculty/StudentAchievementsPage'
import AdminAchievementsDashboard from './modules/achievements/pages/admin/AdminAchievementsDashboard'

// ── Placements module ──────────────────────────────────────────────
import { PlacementsLayout }                      from './modules/placements/layouts/PlacementsLayout'
import { Home as PlacementsHome }                from './modules/placements/pages/Home'
import { Companies as PlacementsCompanies }      from './modules/placements/pages/Companies'
import { CompanyDetail }                         from './modules/placements/pages/CompanyDetail'
import { Analytics as PlacementsAnalytics }      from './modules/placements/pages/Analytics'
import { MyExperiences }                         from './modules/placements/pages/MyExperiences'
import { SubmissionDetail }                      from './modules/placements/pages/SubmissionDetail'
import { SubmitExperience }                      from './modules/placements/pages/SubmitExperience'

function AdminLayoutWrapper({ screen }: { screen: string }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const pages: Record<string, React.ReactNode> = {
    'overview': <AdminOverviewPage />,
    'faculty': <PubAdminFacultyPage />,
    'publications': <AdminPublicationsPage />,
    'conferences': <AdminConferencesPage />,
    'books': <AdminBooksPage />,
    'upload-data': <AdminUploadDataPage />,
  }

  return (
    <AdminLayout screen={screen} onLogout={handleLogout}>
      {pages[screen] || <AdminOverviewPage />}
    </AdminLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/first-login" element={<FirstLoginPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Platform — protected */}
          <Route path="/onboarding" element={
            <ProtectedRoute><OnboardingPage /></ProtectedRoute>
          } />
          <Route path="/home" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requireAdmin><AdminUsersPage /></ProtectedRoute>
          } />

          {/* Events module — faculty routes */}
          <Route path="/events/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/events/my-events" element={
            <ProtectedRoute><EventsPage /></ProtectedRoute>
          } />
          <Route path="/events/new" element={
            <ProtectedRoute><NewEventPage /></ProtectedRoute>
          } />
          <Route path="/events/:id/edit" element={
            <ProtectedRoute><EditEventPage /></ProtectedRoute>
          } />
          <Route path="/events/profile" element={
            <ProtectedRoute><EventsProfilePage /></ProtectedRoute>
          } />

          {/* Events module — admin routes */}
          <Route path="/events/admin/dashboard" element={
            <ProtectedRoute requireAdmin><AdminDashboardPage /></ProtectedRoute>
          } />
          <Route path="/events/admin/explorer" element={
            <ProtectedRoute requireAdmin><AdminExplorerPage /></ProtectedRoute>
          } />
          <Route path="/events/admin/faculty" element={
            <ProtectedRoute requireAdmin><AdminFacultyPage /></ProtectedRoute>
          } />
          {/* Publications module — faculty routes */}
          <Route path="/publications/dashboard" element={
            <ProtectedRoute><PubDashboardPage /></ProtectedRoute>
          } />
          <Route path="/publications/publications" element={
            <ProtectedRoute><PublicationsPage /></ProtectedRoute>
          } />
          <Route path="/publications/conferences" element={
            <ProtectedRoute><ConferencesPage /></ProtectedRoute>
          } />
          <Route path="/publications/books" element={
            <ProtectedRoute><BooksPage /></ProtectedRoute>
          } />
          <Route path="/publications/krc" element={
            <ProtectedRoute><KRCPage /></ProtectedRoute>
          } />
          <Route path="/publications/flags" element={
            <ProtectedRoute><FlagHistoryPage /></ProtectedRoute>
          } />
          <Route path="/publications/edit-profile" element={
            <ProtectedRoute><EditProfilePage /></ProtectedRoute>
          } />

          {/* Publications module — admin routes (redesigned) */}
          <Route path="/publications/admin/dashboard" element={
            <ProtectedRoute requireAdmin><AdminLayoutWrapper screen="overview" /></ProtectedRoute>
          } />
          <Route path="/publications/admin/faculty" element={
            <ProtectedRoute requireAdmin><AdminLayoutWrapper screen="faculty" /></ProtectedRoute>
          } />
          <Route path="/publications/admin/publications" element={
            <ProtectedRoute requireAdmin><AdminLayoutWrapper screen="publications" /></ProtectedRoute>
          } />
          <Route path="/publications/admin/conferences" element={
            <ProtectedRoute requireAdmin><AdminLayoutWrapper screen="conferences" /></ProtectedRoute>
          } />
          <Route path="/publications/admin/books" element={
            <ProtectedRoute requireAdmin><AdminLayoutWrapper screen="books" /></ProtectedRoute>
          } />
          <Route path="/publications/admin/upload-data" element={
            <ProtectedRoute requireAdmin><AdminLayoutWrapper screen="upload-data" /></ProtectedRoute>
          } />
          {/* ── Achievements ── */}
          <Route path="/achievements" element={
            <ProtectedRoute><AchievementsIndex /></ProtectedRoute>
          } />
          <Route path="/achievements/submit" element={
            <ProtectedRoute><SubmitAchievementPage /></ProtectedRoute>
          } />
          <Route path="/achievements/mine" element={
            <ProtectedRoute><MyAchievementsPage /></ProtectedRoute>
          } />
          <Route path="/achievements/students" element={
            <ProtectedRoute><StudentAchievementsPage /></ProtectedRoute>
          } />
          <Route path="/achievements/admin" element={
            <ProtectedRoute requireAdmin><AdminAchievementsDashboard /></ProtectedRoute>
          } />

          {/* ── Placements ── */}
          <Route path="/placements" element={<ProtectedRoute><PlacementsLayout /></ProtectedRoute>}>
            <Route index element={<PlacementsHome />} />
            <Route path="companies" element={<PlacementsCompanies />} />
            <Route path="companies/:id" element={<CompanyDetail />} />
            <Route path="submit" element={<SubmitExperience />} />
            <Route path="submissions/:id" element={<SubmissionDetail />} />
            <Route path="my-experiences" element={<MyExperiences />} />
            <Route path="analytics" element={<PlacementsAnalytics />} />
          </Route>

          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App