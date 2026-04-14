import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../../store/useDocumentStore';

const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

export function FileUploadZone() {
  const navigate = useNavigate();
  const addUploadedDocuments = useDocumentStore((s) => s.addUploadedDocuments);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onFilesSelected = (fileList) => {
    const arr = Array.from(fileList || []).filter((f) => ACCEPTED.includes(f.type));
    setFiles(arr);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));

      // Use relative /api path so Vite proxy handles backend and avoids CORS
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      await addUploadedDocuments(json.documents || [], files);
      navigate('/study');
    } catch (e) {
      setError('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 space-y-3">
      <div
        className="glass-card border-dashed border-[var(--border-subtle)] px-6 py-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--bg-card-hover)] transition"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFilesSelected(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.pptx"
          className="hidden"
          id="file-input"
          onChange={(e) => onFilesSelected(e.target.files)}
        />
        <label htmlFor="file-input" className="cursor-pointer space-y-2">
          <div className="text-3xl mb-1">📂</div>
          <div className="text-sm font-medium">Drop PDF, DOCX, PPTX here</div>
          <div className="text-xs text-[var(--text-secondary)]">
            or click to browse — up to 5 files
          </div>
        </label>
      </div>
      {files.length > 0 && (
        <div className="glass-card px-4 py-3 text-sm flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.name + f.size}
              className="px-3 py-1 rounded-full bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
            >
              {f.name}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={!files.length || uploading}
          onClick={handleUpload}
          className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundImage: 'var(--grad-brand)' }}
        >
          {uploading ? 'Uploading…' : 'Enter Study Room →'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

