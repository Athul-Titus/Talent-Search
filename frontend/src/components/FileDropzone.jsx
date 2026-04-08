import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useToast } from '../contexts/ToastContext'

const ACCEPTED = {
  'application/pdf':                        ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword':                     ['.doc'],
  'image/jpeg':                             ['.jpg', '.jpeg'],
  'image/png':                              ['.png'],
}

export default function FileDropzone({ onFiles }) {
  const toast = useToast()

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onFiles(accepted)
  }, [onFiles])

  const onDropRejected = useCallback((fileRejections) => {
    fileRejections.forEach(rejection => {
      const { file, errors } = rejection
      const errorMsg = errors[0]?.message || 'Invalid file type'
      toast.error(`${file.name}: ${errorMsg}`)
    })
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPTED,
    multiple: true,
    maxSize: 20 * 1024 * 1024,
  })

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      <div className="dropzone-icon">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      {isDragActive ? (
        <h3>Drop resumes here…</h3>
      ) : (
        <>
          <h3>Drag & drop resumes here, or click to browse</h3>
          <p>Supports bulk upload of multiple files at once</p>
          <div className="formats">
            {['PDF','DOCX','JPG','PNG'].map(f => (
              <span key={f} className="badge badge-blue">{f}</span>
            ))}
            <span className="badge badge-gray">Max 20MB/file</span>
          </div>
        </>
      )}
    </div>
  )
}
