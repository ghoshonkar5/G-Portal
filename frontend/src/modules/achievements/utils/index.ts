export const formatDate = (s: string | null | undefined): string => {
  if (!s) return '—'
  return new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export const capitalize = (s: string | null | undefined): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—'

// Always use /achievement-uploads (not /uploads) for achievements files
export const getFileUrl = (filename: string): string =>
  `/achievement-uploads/${encodeURIComponent(filename.trim())}`

// Postgres TEXT[] comes back as either a JS array or a "{a,b,c}" string
export const parsePhotoUrls = (photo_urls: string[] | string | null): string[] => {
  if (!photo_urls) return []
  if (Array.isArray(photo_urls)) return photo_urls.filter(Boolean)
  if (photo_urls.startsWith('{'))
    return photo_urls.slice(1, -1).split(',').filter(Boolean)
  return photo_urls ? [photo_urls] : []
}

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
