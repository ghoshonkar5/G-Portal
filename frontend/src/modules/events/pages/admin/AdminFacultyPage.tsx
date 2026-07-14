import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X, ExternalLink, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { facultyApi } from '../../api/facultyApi'
import Navbar from '../../components/Navbar'

interface Faculty {
  id: number
  faculty_id: string
  name: string
  email: string
  department: string
  designation: string
  total_events: number
  created_at: string
}

const inputCls = 'w-full h-11 px-3 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 rounded-lg text-sm text-[#101A24] placeholder-teal-400/70 outline-none transition-colors'
const errorCls = 'border-red-300 focus:border-red-400'

const EMPTY_FORM = { name: '', faculty_id: '', email: '', department: '', designation: '', password: '' }

export default function AdminFacultyPage() {
  const navigate = useNavigate()
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchFaculty() }, [])

  const fetchFaculty = async () => {
    try {
      const res = await facultyApi.list()
      setFaculty(res.data)
    } catch {
      toast.error('Failed to load faculty')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return faculty
    const q = search.toLowerCase()
    return faculty.filter(f =>
      f.name.toLowerCase().includes(q) || f.faculty_id.toLowerCase().includes(q)
    )
  }, [faculty, search])

  const setField = (key: keyof typeof EMPTY_FORM, val: string) => {
    setForm(p => ({ ...p, [key]: val }))
    if (formErrors[key]) setFormErrors(p => ({ ...p, [key]: undefined }))
  }

  const validate = () => {
    const e: Partial<typeof EMPTY_FORM> = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.faculty_id.trim()) e.faculty_id = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.department.trim()) e.department = 'Required'
    if (!form.designation.trim()) e.designation = 'Required'
    if (!form.password.trim()) e.password = 'Required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const res = await facultyApi.create(form)
      setFaculty(prev => [{ ...res.data, total_events: 0 }, ...prev])
      toast.success(`Faculty account created for ${form.name}`)
      setShowModal(false)
      setForm(EMPTY_FORM)
      setFormErrors({})
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create faculty'
      toast.error(msg)
      if (msg.toLowerCase().includes('faculty id')) setFormErrors(p => ({ ...p, faculty_id: 'Already registered' }))
      if (msg.toLowerCase().includes('email')) setFormErrors(p => ({ ...p, email: 'Already in use' }))
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setShowModal(false)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }

  const handleViewEvents = (f: Faculty) => {
    navigate(`/events/admin/explorer?search=${encodeURIComponent(f.faculty_id)}`)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(240,253,250)' }}>
      <Navbar isAdmin={true} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#101A24]">Faculty</h2>
            <p className="text-[#101A24]/80 font-medium mt-1">
              {loading ? '...' : `${faculty.length} registered faculty member${faculty.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white font-medium text-sm transition-colors shadow-lg"
          >
            <Plus size={16} /> Add Faculty
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm p-4">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#101A24]/70" />
            <input
              type="text"
              placeholder="Search by name or faculty ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 h-10 bg-[#E5DDC6]/30/80 border border-[#E5DDC6] focus:border-[#101A24]/50 rounded-lg text-sm text-[#101A24] placeholder-teal-400 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#101A24]/70 hover:text-[#101A24]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E5DDC6]/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="space-y-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 border-b border-gray-100 animate-pulse bg-gray-50/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users className="mx-auto text-teal-300 mb-3" size={40} />
              <p className="text-[#101A24] font-medium">
                {search ? 'No faculty match your search' : 'No faculty registered yet'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-2 text-sm text-[#101A24] font-semibold hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="px-5 py-3.5 font-bold">Name</th>
                    <th className="px-4 py-3.5 font-bold">Faculty ID</th>
                    <th className="px-4 py-3.5 font-bold hidden md:table-cell">Email</th>
                    <th className="px-4 py-3.5 font-bold hidden lg:table-cell">Department</th>
                    <th className="px-4 py-3.5 font-bold hidden lg:table-cell">Designation</th>
                    <th className="px-4 py-3.5 font-bold text-center">Events</th>
                    <th className="px-4 py-3.5 font-bold hidden sm:table-cell">Joined</th>
                    <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} className="border-b border-gray-100 last:border-0 hover:bg-[#E5DDC6]/30/30 transition-colors text-sm">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{f.name}</div>
                        <div className="text-xs text-gray-500 lg:hidden">{f.department}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                          {f.faculty_id}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-xs hidden md:table-cell">{f.email}</td>
                      <td className="px-4 py-4 text-gray-600 text-xs hidden lg:table-cell">{f.department}</td>
                      <td className="px-4 py-4 text-gray-600 text-xs hidden lg:table-cell">{f.designation}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block text-sm font-bold px-2.5 py-0.5 rounded-full ${f.total_events > 0 ? 'bg-[#E5DDC6]/50 text-[#101A24]' : 'bg-gray-100 text-gray-400'
                          }`}>
                          {f.total_events}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">
                        {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleViewEvents(f)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#101A24] hover:underline whitespace-nowrap"
                        >
                          View Events <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {search && !loading && (
          <p className="text-sm text-[#101A24] font-medium">
            Showing {filtered.length} of {faculty.length} faculty
          </p>
        )}
      </main>

      {/* Add Faculty Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleClose}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Add Faculty</h3>
                <p className="text-xs text-gray-500 mt-0.5">Create a new faculty account</p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {([
                { key: 'name', label: 'Full Name', placeholder: 'e.g. Dr. Jane Smith', type: 'text' },
                { key: 'faculty_id', label: 'Faculty ID', placeholder: 'e.g. FAC001', type: 'text' },
                { key: 'email', label: 'Email', placeholder: 'e.g. jane@University.edu', type: 'email' },
                { key: 'department', label: 'Department', placeholder: 'e.g. Computer Science', type: 'text' },
                { key: 'designation', label: 'Designation', placeholder: 'e.g. Assistant Professor', type: 'text' },
                { key: 'password', label: 'Temporary Password', placeholder: 'Min. 6 characters', type: 'password' },
              ] as const).map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-[#101A24] text-sm font-medium mb-1.5">
                    {label} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setField(key, e.target.value)}
                    placeholder={placeholder}
                    className={`${inputCls} ${formErrors[key] ? errorCls : ''}`}
                  />
                  {formErrors[key] && <p className="mt-1 text-xs text-red-600">{formErrors[key]}</p>}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end p-5 border-t border-gray-100 bg-gray-50">
              <button onClick={handleClose} disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#101A24] hover:bg-[#16222E] text-white text-sm font-medium transition-colors disabled:opacity-60">
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}