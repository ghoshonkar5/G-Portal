import { useState, useEffect } from 'react'
import { User, Lock, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
 import { useAuth } from '../../../../context/AuthContext'
import { facultyApi } from '../../api/facultyApi'
import Navbar from '../../components/Navbar'

const inputCls = 'w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 rounded-lg text-sm text-[#101A24] placeholder-teal-400/70 outline-none transition-colors'
const disabledCls = 'w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 outline-none cursor-not-allowed'

export default function ProfilePage() {
  const { user } = useAuth()

  const [editing, setEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', department: '', designation: '' })
  const [profileSaving, setProfileSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })

  useEffect(() => {
     if (user) setProfileForm({ name: user.name || '', department: user.department || '', designation: user.designation || '' })
  }, [user])

  const handleProfileSave = async () => {
    if (!profileForm.name.trim() || !profileForm.department.trim() || !profileForm.designation.trim()) {
      toast.error('All fields are required')
      return
    }
    setProfileSaving(true)
    try {
      await facultyApi.updateProfile(profileForm)
      toast.success('Profile updated')
      setEditing(false)
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleProfileCancel = () => {
    if (user) setProfileForm({ name: user.name || '', department: user.department || '', designation: user.designation || '' })
    setEditing(false)
  }

  const validatePw = () => {
    const e: Record<string, string> = {}
    if (!pwForm.current_password) e.current_password = 'Required'
    if (!pwForm.new_password) e.new_password = 'Required'
    else if (pwForm.new_password.length < 6) e.new_password = 'Minimum 6 characters'
    if (!pwForm.confirm_password) e.confirm_password = 'Required'
    else if (pwForm.new_password !== pwForm.confirm_password) e.confirm_password = 'Passwords do not match'
    if (pwForm.current_password && pwForm.new_password && pwForm.current_password === pwForm.new_password)
      e.new_password = 'New password must be different from current'
    setPwErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePwChange = async () => {
    if (!validatePw()) return
    setPwSaving(true)
    try {
      await facultyApi.changePassword(pwForm)
      toast.success('Password changed successfully')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setPwErrors({})
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to change password'
      toast.error(msg)
      if (msg.toLowerCase().includes('current')) setPwErrors({ current_password: 'Incorrect current password' })
    } finally {
      setPwSaving(false)
    }
  }

  const PwInput = ({ field, label, placeholder }: { field: 'current' | 'new' | 'confirm'; label: string; placeholder: string }) => {
    const key = field === 'current' ? 'current_password' : field === 'new' ? 'new_password' : 'confirm_password'
    return (
      <div>
        <label className="block text-[#101A24] text-sm font-medium mb-1.5">{label}</label>
        <div className="relative">
          <input
            type={showPw[field] ? 'text' : 'password'}
            value={pwForm[key as keyof typeof pwForm]}
            onChange={e => { setPwForm(p => ({ ...p, [key]: e.target.value })); setPwErrors(p => ({ ...p, [key]: '' })) }}
            placeholder={placeholder}
            className={`${inputCls} pr-10 ${pwErrors[key] ? 'border-red-300 focus:border-red-400' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#101A24]/70 hover:text-[#101A24] text-xs font-medium"
          >
            {showPw[field] ? 'Hide' : 'Show'}
          </button>
        </div>
        {pwErrors[key] && <p className="mt-1 text-xs text-red-600">{pwErrors[key]}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div>
          <h2 className="text-2xl font-bold text-[#101A24]">Profile</h2>
          <p className="text-[#101A24]/80 font-medium mt-1">Manage your account information</p>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#101A24] flex items-center gap-2">
              <User size={18} className="text-[#101A24]" />Profile Information
            </h3>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#101A24] hover:text-[#101A24] font-medium border border-[#E5DDC6] hover:border-[#101A24]/50 px-3 py-1.5 rounded-lg transition-colors">
                <Edit2 size={14} />Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleProfileCancel} disabled={profileSaving}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium border border-gray-200 px-3 py-1.5 rounded-lg">
                  <X size={14} />Cancel
                </button>
                <button onClick={handleProfileSave} disabled={profileSaving}
                  className="inline-flex items-center gap-1 text-sm text-white bg-[#101A24] hover:bg-[#16222E] font-medium px-3 py-1.5 rounded-lg disabled:opacity-60">
                  <Check size={14} />{profileSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Faculty ID — never editable */}
            <div>
              <label className="block text-[#101A24] text-sm font-medium mb-1.5">Faculty ID</label>
              <div className="flex items-center gap-2">
                <input value={user?.faculty_id || ''} readOnly className={disabledCls} />
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-medium whitespace-nowrap">Read only</span>
              </div>
            </div>

            {/* Email — not editable in this version */}
            <div>
              <label className="block text-[#101A24] text-sm font-medium mb-1.5">Email</label>
              <input value={user?.email || ''} readOnly className={disabledCls} />
            </div>

            {/* Editable fields */}
            <div>
              <label className="block text-[#101A24] text-sm font-medium mb-1.5">Full Name</label>
              {editing
                ? <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                : <input value={profileForm.name} readOnly className={disabledCls} />
              }
            </div>

            <div>
              <label className="block text-[#101A24] text-sm font-medium mb-1.5">Department</label>
              {editing
                ? <input type="text" value={profileForm.department} onChange={e => setProfileForm(p => ({ ...p, department: e.target.value }))} className={inputCls} />
                : <input value={profileForm.department} readOnly className={disabledCls} />
              }
            </div>

            <div>
              <label className="block text-[#101A24] text-sm font-medium mb-1.5">Designation</label>
              {editing
                ? <input type="text" value={profileForm.designation} onChange={e => setProfileForm(p => ({ ...p, designation: e.target.value }))} className={inputCls} />
                : <input value={profileForm.designation} readOnly className={disabledCls} />
              }
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-[#101A24] flex items-center gap-2">
            <Lock size={18} className="text-[#101A24]" />Change Password
          </h3>

          <PwInput field="current" label="Current Password" placeholder="Enter your current password" />
          <PwInput field="new" label="New Password" placeholder="Enter new password (min. 6 characters)" />
          <PwInput field="confirm" label="Confirm New Password" placeholder="Re-enter new password" />

          <button onClick={handlePwChange} disabled={pwSaving}
            className="w-full py-3 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-60">
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </main>
    </div>
  )
}