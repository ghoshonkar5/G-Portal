import axios from 'axios'

const authAxios = axios.create({
  baseURL: (import.meta.env.VITE_AUTH_ORIGIN ?? '') + '/api/auth',
})

// Attach token to every request automatically
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 — clear storage and redirect to login
authAxios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default authAxios