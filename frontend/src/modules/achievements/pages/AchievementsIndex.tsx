import { useAuth } from '../../../context/AuthContext'
import StudentDashboard  from './student/StudentDashboard'
import FacultyDashboard  from './faculty/FacultyDashboard'
import AdminAchievementsDashboard from './admin/AdminAchievementsDashboard'
import Navbar from '../../../components/Navbar'

export default function AchievementsIndex() {
  const { user } = useAuth()
  
  let content = null
  if (user?.role === 'student') content = <StudentDashboard />
  else if (user?.role === 'faculty') content = <FacultyDashboard />
  else if (user?.role === 'admin') content = <AdminAchievementsDashboard />

  return (
    <div className="min-h-screen bg-[#F4F9F8] flex flex-col font-sans">
      <Navbar isAdmin={user?.role === 'admin'} />
      <div className="flex-1">
        {content}
      </div>
    </div>
  )
}
