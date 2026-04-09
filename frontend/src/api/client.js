import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Shared Toast Dispatcher for non-React code ──
const showGlobalToast = (message, type = 'error') => {
  window.dispatchEvent(new CustomEvent('cymonic-toast', {
    detail: { message, type }
  }))
}

// ── Global Error Interceptor ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for network errors
    if (!error.response) {
      showGlobalToast('Network error: Please check your connection or ensures the server is running.')
      return Promise.reject(error)
    }

    const { status, data } = error.response
    const message = data?.detail || data?.message || error.message || 'An unexpected error occurred.'

    // Specific Status Handlers
    if (status === 401) {
      showGlobalToast('Session expired. Please refresh the page.', 'warning')
    } else if (status === 413) {
      showGlobalToast('Payload too large. Use smaller files.', 'error')
    } else if (status >= 500) {
      showGlobalToast(`Server error (${status}): ${message}`, 'error')
    } else if (status === 422) {
      // Validation error (often file format or invalid JSON)
      showGlobalToast(`Validation failed: ${message}`, 'warning')
    } else {
      // Regular error
      showGlobalToast(message, 'error')
    }

    return Promise.reject(error)
  }
)

// ── Jobs ────────────────────────────────────────────────
export const jobsApi = {
  list:   ()          => api.get('/jobs/').then(r => r.data),
  get:    (id)        => api.get(`/jobs/${id}`).then(r => r.data),
  create: (payload)   => api.post('/jobs/', payload).then(r => r.data),
  update: (id, payload) => api.patch(`/jobs/${id}`, payload).then(r => r.data),
  delete: (id)        => api.delete(`/jobs/${id}`),
}

// ── Resumes ─────────────────────────────────────────────
export const resumesApi = {
  upload: (jobRoleId, files, onProgress) => {
    const form = new FormData()
    form.append('job_role_id', jobRoleId)
    files.forEach(f => form.append('files', f))
    return api.post('/resumes/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }).then(r => r.data)
  },
  streamUrl:    (jobRoleId)          => `http://localhost:8000/api/resumes/stream/${jobRoleId}`,
  listByJob:    (jobRoleId)          => api.get(`/resumes/${jobRoleId}`).then(r => r.data),
  listByDate:   (jobRoleId = null)   => {
    const params = jobRoleId ? `?job_role_id=${jobRoleId}` : ''
    return api.get(`/resumes/by-date${params}`).then(r => r.data)
  },
  getCandidate: (candidateId)   => api.get(`/resumes/candidate/${candidateId}`).then(r => r.data),
  delete:       (candidateId)   => api.delete(`/resumes/${candidateId}`),
  viewResume:   (candidateId)   => api.get(`/resumes/view/${candidateId}`).then(r => r.data),
}

// ── Ranking ─────────────────────────────────────────────
export const rankingApi = {
  trigger:   (jobRoleId, jdText, weights) =>
    api.post('/ranking/score', { job_role_id: jobRoleId, jd_text: jdText, weights }).then(r => r.data),
  getResults:(jobRoleId) => api.get(`/ranking/${jobRoleId}`).then(r => r.data),
  getStatus: (jobRoleId) => api.get(`/ranking/status/${jobRoleId}`).then(r => r.data),
}

// ── Candidates (workflow) ────────────────────────────────
export const candidatesApi = {
  updateStatus: (candidateId, status, note = undefined) =>
    api.patch(`/candidates/${candidateId}/status`, { status, note }).then(r => r.data),
  getByRole: (roleId, status = null) => {
    const params = status ? `?status=${status}` : ''
    return api.get(`/candidates/by-role/${roleId}${params}`).then(r => r.data)
  },
  workflowSummary: (roleId) =>
    api.get(`/candidates/workflow-summary/${roleId}`).then(r => r.data),
  generateQuestions: (candidateId, jdText) =>
    api.post(`/candidates/${candidateId}/interview-questions`, { jd_text: jdText }).then(r => r.data),
  generateEmail: (candidateId, jdText, intent) =>
    api.post(`/candidates/${candidateId}/generate-email`, { jd_text: jdText, intent }).then(r => r.data),
}

// ── Cymonic Query Engine ─────────────────────────────────
export const queryApi = {
  ask: (question, jobRoleId = null) =>
    api.post('/query', { question, job_role_id: jobRoleId }).then(r => r.data),
}

export { api }
