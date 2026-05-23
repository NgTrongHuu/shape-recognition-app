import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }),
  updateProfile: (name: string) => api.put('/auth/profile', { name }),
}

export const shapeApi = {
  detect: (image: string, save = true, signal?: AbortSignal) =>
    api.post('/shapes/detect', { image, save }, { signal }),
  /** Nhận diện từ webcam dùng Vision AI (HuggingFace) — chịu nhiễu tốt hơn CNN. */
  detectWebcam: (image: string, save = true, signal?: AbortSignal) =>
    api.post('/shapes/detect-webcam', { image, save }, { signal, timeout: 45000 }),
  detectUpload: (file: File, save = true) => {
    const form = new FormData()
    form.append('file', file)
    form.append('save', String(save))
    return api.post('/shapes/detect-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  /** Lưu nhanh — gửi kèm kết quả đã detect, server chỉ vẽ ảnh + lưu lịch sử. */
  saveDetection: (image: string, shapes: any[], signal?: AbortSignal) =>
    api.post('/shapes/save', { image, shapes }, { signal }),
  calculate: (shape: string, params: Record<string, number>) =>
    api.post('/shapes/calculate', { shape, params }),
}

export const objectApi = {
  detect: (image: string, signal?: AbortSignal) =>
    api.post('/objects/detect', { image }, { signal }),
  /** Trả về URL model ONNX để client tải về chạy trực tiếp trên browser. */
  modelUrl: () => '/api/v1/objects/model',
  classes: () => api.get('/objects/classes'),
}

export const historyApi = {
  list: () => api.get('/history'),
  get: (id: string) => api.get(`/history/${id}`),
  remove: (id: string) => api.delete(`/history/${id}`),
  clear: () => api.delete('/history'),
}

export const statsApi = {
  get: () => api.get('/stats'),
}

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: object) => api.put('/settings', data),
  reset: () => api.post('/settings/reset'),
}

export default api
