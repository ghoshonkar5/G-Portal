import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserApi,
  bulkCreateUsersApi,
  listUsersApi,
  toggleUserStatusApi,
  deleteUserApi,
  type CreateUserData
} from '../api/adminApi'
import {
  Users, UserPlus, Upload, Download, Search, Trash2, CheckCircle2,
  AlertCircle, ShieldAlert, ArrowLeft, Loader2, Filter, Check, X, RefreshCw, Home
} from 'lucide-react'
import { UniversityLogo } from '../modules/publications/components/UniversityLogo'

export default function AdminUsersPage() {
  const navigate = useNavigate()

  // Tab mode: 'manual' | 'csv'
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual')
  const [role, setRole] = useState<'faculty' | 'student' | 'admin'>('faculty')

  // Manual form state
  const [formData, setFormData] = useState<CreateUserData>({
    role: 'faculty',
    facultyId: '',
    name: '',
    email: '',
    department: '',
    designation: '',
    mobile: ''
  })
  const [manualLoading, setManualLoading] = useState(false)
  const [manualSuccess, setManualSuccess] = useState('')
  const [manualError, setManualError] = useState('')

  // CSV state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvResult, setCsvResult] = useState<{
    summary: { total: number; created: number; failed: number }
    failures: { row: number; facultyId: string; reason: string }[]
  } | null>(null)
  const [csvError, setCsvError] = useState('')

  // Directory state
  const [usersList, setUsersList] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  // Delete modal state
  const [deleteModalUser, setDeleteModalUser] = useState<any | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Sync role with manual form
  useEffect(() => {
    setFormData(prev => ({ ...prev, role }))
  }, [role])

  // Fetch users on load or filter change
  const fetchUsers = async () => {
    setListLoading(true)
    try {
      const res = await listUsersApi({
        role: filterRole || undefined,
        search: searchQuery || undefined,
        page,
        limit: 15
      })
      if (res.success) {
        setUsersList(res.users)
        setTotalPages(res.pagination.totalPages)
        setTotalUsers(res.pagination.total)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, filterRole])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  // Handle Manual Form Change
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setManualError('')
    setManualSuccess('')
  }

  // Handle Manual Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualError('')
    setManualSuccess('')
    setManualLoading(true)

    try {
      const res = await createUserApi(formData)
      if (res.success) {
        setManualSuccess(`Account created successfully for ${res.user.name} (${res.user.faculty_id})!`)
        setFormData({
          role,
          facultyId: '',
          name: '',
          email: '',
          department: '',
          designation: '',
          mobile: ''
        })
        fetchUsers()
      }
    } catch (err: any) {
      setManualError(err.response?.data?.message || 'Failed to create user')
    } finally {
      setManualLoading(false)
    }
  }

  // CSV Parser without external deps
  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }

    const splitLine = (line: string): string[] => {
      const result: string[] = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuote = !inQuote
        } else if (char === ',' && !inQuote) {
          result.push(cur.trim().replace(/^"|"$/g, ''))
          cur = ''
        } else {
          cur += char
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, ''))
      return result
    }

    const headers = splitLine(lines[0])
    const rows = lines.slice(1).map(line => {
      const vals = splitLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = vals[idx] || ''
      })
      return row
    })
    return { headers, rows }
  }

  // Handle CSV Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    setCsvError('')
    setCsvResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        const { rows } = parseCSV(text)
        setAllRows(rows)
        setPreviewRows(rows.slice(0, 5))
      }
    }
    reader.readAsText(file)
  }

  // Download CSV Template
  const downloadTemplate = (tRole: 'faculty' | 'student' | 'admin') => {
    const headers = tRole === 'faculty'
      ? 'faculty_id,name,email,department,designation,mobile'
      : tRole === 'student'
      ? 'student_id,name,email,department,mobile'
      : 'admin_id,name,email,department,mobile'
    const sample = tRole === 'faculty'
      ? '10245,Dr. Ravi Kumar,ravi.kumar@university.edu,CSE,Associate Professor,9876543210'
      : tRole === 'student'
      ? '21BCE1234,Onkar Patil,onkar.patil@university.edu,CSE,9876543211'
      : 'admin101,Suresh Sharma,admin@university.edu,Administration,9876543212'
    const csvContent = `${headers}\n${sample}\n`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${tRole}_import_template.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Submit CSV Import
  const handleCsvSubmit = async () => {
    if (allRows.length === 0) {
      setCsvError('No valid rows found in CSV')
      return
    }
    if (allRows.length > 500) {
      setCsvError('Maximum 500 users per batch allowed. Please split your CSV.')
      return
    }

    setCsvLoading(true)
    setCsvError('')
    setCsvResult(null)

    try {
      const mappedUsers = allRows.map(row => {
        const id = role === 'faculty' ? (row.faculty_id || row.id || '') : (row.student_id || row.faculty_id || row.id || '')
        return {
          facultyId: id,
          name: row.name || '',
          email: row.email || '',
          department: row.department || '',
          designation: role === 'faculty' ? (row.designation || '') : undefined,
          mobile: row.mobile || ''
        }
      })

      const res = await bulkCreateUsersApi(role, mappedUsers)
      if (res.success) {
        setCsvResult({ summary: res.summary, failures: res.failures })
        fetchUsers()
      }
    } catch (err: any) {
      setCsvError(err.response?.data?.message || 'Bulk import failed')
    } finally {
      setCsvLoading(false)
    }
  }

  // Toggle User Status
  const handleToggleStatus = async (user: any) => {
    try {
      const res = await toggleUserStatusApi(user.id, !user.is_active)
      if (res.success) {
        setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, is_active: res.user.is_active } : u))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  // Delete User
  const handleDeleteConfirm = async () => {
    if (!deleteModalUser || deleteConfirmText !== 'DELETE') return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const res = await deleteUserApi(deleteModalUser.id)
      if (res.success) {
        setUsersList(prev => prev.filter(u => u.id !== deleteModalUser.id))
        setTotalUsers(prev => prev - 1)
        setDeleteModalUser(null)
        setDeleteConfirmText('')
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete user')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-[#101A24] via-[#16222E] to-[#1C2C3B] rounded-b-[24px] shadow-md overflow-hidden sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/home')}
                title="Back to Home"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-medium shrink-0"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
              <UniversityLogo tone="light" />
              <div>
                <p className="text-base font-semibold text-white leading-tight">User Management Directory</p>
                <p className="text-xs text-[#E5DDC6]">University Administration Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase px-3.5 py-1 rounded-full bg-white/15 text-[#BAE6FD] border border-white/20">
                Administrator
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Creation Mode Toggle & Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header tabs */}
          <div className="bg-slate-100/80 px-6 pt-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex items-center px-5 py-2.5 rounded-t-xl font-medium text-sm transition-all border-t border-x ${
                  activeTab === 'manual'
                    ? 'bg-white text-[#101A24] border-slate-200 shadow-sm font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <UserPlus className="w-4 h-4 mr-2" /> Manual Creation
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`flex items-center px-5 py-2.5 rounded-t-xl font-medium text-sm transition-all border-t border-x ${
                  activeTab === 'csv'
                    ? 'bg-white text-[#101A24] border-slate-200 shadow-sm font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Upload className="w-4 h-4 mr-2" /> CSV Bulk Import
              </button>
            </div>

            {/* Role selector */}
            <div className="flex items-center space-x-2 pb-3 sm:pb-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Type:</span>
              <div className="bg-slate-200/70 p-1 rounded-lg flex space-x-1">
                {(['faculty', 'student', 'admin'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`px-3.5 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                      role === r
                        ? 'bg-[#101A24] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* ── MANUAL TAB ── */}
            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-6">
                {manualSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>{manualSuccess}</span>
                  </div>
                )}
                {manualError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      {role === 'faculty' ? 'Faculty ID *' : role === 'student' ? 'Registration Number *' : 'Admin ID *'}
                    </label>
                    <input
                      name="facultyId"
                      type="text"
                      required
                      placeholder={role === 'faculty' ? 'e.g. 10245' : role === 'student' ? 'e.g. 21BCE1234' : 'e.g. admin2'}
                      value={formData.facultyId}
                      onChange={handleManualChange}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Full Name *</label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder={role === 'admin' ? 'e.g. Dr. Rahul Sharma' : 'e.g. Dr. Ravi Kumar'}
                      value={formData.name}
                      onChange={handleManualChange}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Email Address *</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder={role === 'admin' ? 'e.g. newadmin@gmail.com' : 'e.g. user@university.edu'}
                      value={formData.email}
                      onChange={handleManualChange}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Department</label>
                    <input
                      name="department"
                      type="text"
                      placeholder="e.g. CSE"
                      value={formData.department}
                      onChange={handleManualChange}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 outline-none transition-all"
                    />
                  </div>

                  {role === 'faculty' && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Designation</label>
                      <input
                        name="designation"
                        type="text"
                        placeholder="e.g. Associate Professor"
                        value={formData.designation}
                        onChange={handleManualChange}
                        className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 outline-none transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Mobile Number</label>
                    <input
                      name="mobile"
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={formData.mobile}
                      onChange={handleManualChange}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-[#101A24] focus:ring-2 focus:ring-[#101A24]/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="px-6 py-2.5 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center shadow-md shadow-[#101A24]/15 transition-all"
                  >
                    {manualLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
                    ) : (
                      <><UserPlus className="mr-2 h-4 w-4" /> Create {role.charAt(0).toUpperCase() + role.slice(1)} Account</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── CSV TAB ── */}
            {activeTab === 'csv' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#E5DDC6]/30/60 rounded-xl border border-[#E5DDC6]/60">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Bulk Import via CSV</h3>
                    <p className="text-xs text-[#101A24] mt-0.5">
                      Upload up to 500 {role} accounts per batch. All accounts will be created with their ID as their temporary password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadTemplate(role)}
                    className="px-4 py-2 bg-white border border-[#E5DDC6] text-[#101A24] hover:bg-[#E5DDC6]/30 rounded-lg text-xs font-semibold flex items-center flex-shrink-0 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download {role === 'faculty' ? 'Faculty' : 'Student'} Template
                  </button>
                </div>

                {csvError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{csvError}</span>
                  </div>
                )}

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#101A24] rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-[#E5DDC6]/30/20 transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 bg-slate-200/80 group-hover:bg-[#E5DDC6]/50 text-slate-600 group-hover:text-[#101A24] rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {csvFile ? <span className="text-[#101A24] font-semibold">{csvFile.name}</span> : 'Click to upload or drag & drop CSV file'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {allRows.length > 0 ? `${allRows.length} rows parsed ready for import` : 'Supports .csv files formatted per template'}
                  </p>
                </div>

                {/* Preview Table */}
                {previewRows.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Preview (First {previewRows.length} of {allRows.length} rows)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            {Object.keys(previewRows[0]).map((col, idx) => (
                              <th key={idx} className="px-3.5 py-2.5 text-left font-semibold text-slate-700 uppercase">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              {Object.values(row).map((val, vIdx) => (
                                <td key={vIdx} className="px-3.5 py-2 text-slate-600">
                                  {val || <span className="text-slate-400 italic">null</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleCsvSubmit}
                        disabled={csvLoading || allRows.length === 0}
                        className="px-6 py-2.5 bg-[#101A24] hover:bg-[#16222E] disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center shadow-md shadow-[#101A24]/15 transition-all"
                      >
                        {csvLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing {allRows.length} users...</>
                        ) : (
                          <><Upload className="mr-2 h-4 w-4" /> Import {allRows.length} {role}s</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Import Results Banner */}
                {csvResult && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="bg-slate-100 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center text-green-700 font-semibold text-sm">
                          <Check className="w-5 h-5 mr-1.5 bg-green-200 p-0.5 rounded-full" />
                          {csvResult.summary.created} Created
                        </div>
                        {csvResult.summary.failed > 0 && (
                          <div className="flex items-center text-red-700 font-semibold text-sm">
                            <X className="w-5 h-5 mr-1.5 bg-red-200 p-0.5 rounded-full" />
                            {csvResult.summary.failed} Failed
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Total processed: {csvResult.summary.total}</span>
                    </div>

                    {csvResult.failures.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-red-600 uppercase tracking-wider">Failed Rows Details</h5>
                        <div className="max-h-60 overflow-y-auto rounded-xl border border-red-200">
                          <table className="min-w-full divide-y divide-red-200 text-xs">
                            <thead className="bg-red-50">
                              <tr>
                                <th className="px-3.5 py-2 text-left font-semibold text-red-800">Row</th>
                                <th className="px-3.5 py-2 text-left font-semibold text-red-800">ID / Reg Number</th>
                                <th className="px-3.5 py-2 text-left font-semibold text-red-800">Failure Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-red-100 bg-white">
                              {csvResult.failures.map((f, idx) => (
                                <tr key={idx}>
                                  <td className="px-3.5 py-2 font-medium text-slate-700">#{f.row}</td>
                                  <td className="px-3.5 py-2 text-slate-800 font-mono">{f.facultyId}</td>
                                  <td className="px-3.5 py-2 text-red-600 font-medium">{f.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── USERS DIRECTORY SECTION ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">User Directory</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {usersList.length} of {totalUsers} registered accounts
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, ID, or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-3 w-60 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-[#101A24] outline-none transition-all"
                  />
                </form>

                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
                  {[
                    { label: 'All', val: '' },
                    { label: 'Faculty', val: 'faculty' },
                    { label: 'Student', val: 'student' },
                    { label: 'Admin', val: 'admin' }
                  ].map(tab => (
                    <button
                      key={tab.val}
                      onClick={() => { setFilterRole(tab.val); setPage(1); }}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        filterRole === tab.val
                          ? 'bg-[#101A24] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchUsers}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Refresh List"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase tracking-wider">ID / Reg No</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {listLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#101A24]" />
                        Loading directory...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                        No users found matching your search or filter.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800">{u.faculty_id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {u.name}
                          {u.first_login && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-semibold">New</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            u.role === 'faculty' ? 'bg-[#E5DDC6]/50 text-[#101A24]' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 text-slate-600">{u.department || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                              u.is_active
                                ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                : 'border-green-300 text-green-700 hover:bg-green-50'
                            }`}
                            title={u.is_active ? 'Deactivate account' : 'Activate account'}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => { setDeleteModalUser(u); setDeleteConfirmText(''); setDeleteError(''); }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors inline-flex items-center"
                              title="Delete user permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── DELETE CONFIRMATION MODAL (Escape hatch per Question 4) ── */}
      {deleteModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-start space-x-3 text-red-600">
              <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">Confirm Permanent Deletion</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You are about to permanently delete the account for <strong>{deleteModalUser.name}</strong> ({deleteModalUser.faculty_id}).
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {deleteError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Type <span className="text-red-600 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:bg-white focus:border-red-600 outline-none transition-all"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={deleteLoading}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center shadow-sm transition-all"
              >
                {deleteLoading ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Permanently Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
