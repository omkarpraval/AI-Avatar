import { useEffect, useState } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useAI } from '../../hooks/useAI';
import { PDFViewer } from './PDFViewer';

export function DocumentViewer() {
  const { documents } = useDocumentStore();
  const currentDoc = documents[0];
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { explainPage } = useAI();

  const page =
    currentDoc?.pages?.find((p) => p.pageNumber === currentPage) ||
    currentDoc?.pages?.[currentPage - 1] ||
    null;
  const isPdf = currentDoc?.type === 'pdf' && currentDoc.fileUrl;

  useEffect(() => {
    // Reset page counters when document changes
    setCurrentPage(1);
    setTotalPages(currentDoc?.pages?.length || 1);
    setZoom(1.5);
  }, [currentDoc]);

  const handleExplain = async () => {
    if (!currentDoc || !page) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await explainPage({
        pageText: page.text || '',
        pageNumber: page.pageNumber || currentPage,
        documentName: currentDoc.name,
      });
      setMessage(res.answer || 'Explanation generated.');
    } catch {
      setMessage('Could not explain this page.');
    } finally {
      setLoading(false);
    }
  };

  const effectiveTotalPages =
    isPdf && totalPages ? totalPages : currentDoc?.pages?.length || 1;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)]">
            {currentDoc ? currentDoc.name : 'No document loaded'}
          </span>
        </div>
        {currentDoc && (
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <span className="flex items-center gap-2">
              Page{' '}
              <input
                type="number"
                value={currentPage}
                min={1}
                max={effectiveTotalPages}
                onChange={(e) => {
                  const value = Number(e.target.value) || 1;
                  const clamped = Math.min(
                    effectiveTotalPages,
                    Math.max(1, value),
                  );
                  setCurrentPage(clamped);
                }}
                className="w-12 bg-transparent border border-[var(--border-subtle)] rounded px-1 text-center"
              />{' '}
              / {effectiveTotalPages}
            </span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))
                }
                className="px-2 py-0.5 rounded border border-[var(--border-subtle)] text-xs"
              >
                −
              </button>
              <span className="w-12 text-center text-xs">
                {Math.round(zoom * 100)}
                %
              </span>
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))
                }
                className="px-2 py-0.5 rounded border border-[var(--border-subtle)] text-xs"
              >
                +
              </button>
            </span>
            <button
              type="button"
              onClick={handleExplain}
              disabled={loading}
              className="px-3 py-1 rounded-full text-[11px] disabled:opacity-50"
              style={{ backgroundImage: 'var(--grad-brand)' }}
            >
              {loading ? 'Explaining…' : '📖 Explain This Page'}
            </button>
          </div>
        )}
      </div>

      {isPdf ? (
        <PDFViewer
          fileUrl={currentDoc.fileUrl}
          scale={zoom}
          onDocumentLoaded={(numPages) => {
            setTotalPages(numPages || 1);
          }}
          onPageChange={(pageNum) => {
            setCurrentPage(pageNum);
          }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 text-sm text-[var(--text-secondary)] space-y-4">
          {!currentDoc && (
            <p>
              Upload a document on the landing page to start studying. The full
              viewer will appear here.
            </p>
          )}
          {currentDoc?.type === 'pdf' && !currentDoc?.fileUrl && (
            <div className="glass-card p-4 text-sm text-[var(--text-secondary)]">
              This PDF was loaded from saved session data, but the original file
              isn&apos;t available after a refresh. Please re-upload the PDF from
              the landing page to view it.
            </div>
          )}
          {currentDoc && page && (
            <>
              <div className="glass-card p-4 whitespace-pre-wrap text-[var(--text-primary)]">
                {page.text || '(This page has no extracted text)'}
              </div>
              {message && (
                <div className="glass-card p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                  {message}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


