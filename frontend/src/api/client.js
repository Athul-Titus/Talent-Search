import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Jobs ────────────────────────────────────────────────
export const jobsApi = {
  list:   ()          => api.get('/jobs/').then(r => r.data),
  get:    (id)        => api.get(`/jobs/${id}`).then(r => r.data),
  create: (payload)   => api.post('/jobs/', payload).then(r => r.data),
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
  listByJob:    (jobRoleId)          => api.get(`/resumes/${jobRoleId}`).then(r => r.data),
  listByDate:   (jobRoleId = null)   => {
    const params = jobRoleId ? `?job_role_id=${jobRoleId}` : ''
    return api.get(`/resumes/by-date${params}`).then(r => r.data)
  },
  getCandidate: (candidateId)   => api.get(`/resumes/candidate/${candidateId}`).then(r => r.data),
  delete:       (candidateId)   => api.delete(`/resumes/${candidateId}`),
}

// ── Ranking ─────────────────────────────────────────────
export const rankingApi = {
  trigger:   (jobRoleId, jdText) =>
    api.post('/ranking/score', { job_role_id: jobRoleId, jd_text: jdText }).then(r => r.data),
  getResults:(jobRoleId) => api.get(`/ranking/${jobRoleId}`).then(r => r.data),
  getStatus: (jobRoleId) => api.get(`/ranking/status/${jobRoleId}`).then(r => r.data),
}
