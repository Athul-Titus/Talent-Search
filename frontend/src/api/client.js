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
  streamUrl:    (jobRoleId)          => `${baseURL}/resumes/stream/${jobRoleId}`,
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
