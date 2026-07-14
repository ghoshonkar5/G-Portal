import axios from 'axios'

const publicationsAxios = axios.create({
  baseURL: (import.meta.env.VITE_PUBLICATIONS_ORIGIN ?? '') + '/api/publications',
})

publicationsAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

publicationsAxios.interceptors.response.use(
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

export default publicationsAxios