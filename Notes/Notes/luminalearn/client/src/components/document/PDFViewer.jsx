import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker at module level
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PDFViewer({ fileUrl, onDocumentLoaded, onPageChange }) {
  const containerRef = useRef(null);
  const pdfRef = useRef(null);
  const observerRef = useRef(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);

  // Load and render PDF whenever fileUrl or zoom changes
  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfRef.current = pdf;
        setTotalPages(pdf.numPages || 0);
        if (onDocumentLoaded) onDocumentLoaded(pdf.numPages || 0);

        // Wait for container to be attached
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!containerRef.current) {
          // eslint-disable-next-line no-console
          console.error('PDFViewer: containerRef is null after RAF');
          return;
        }

        const container = containerRef.current;
        container.innerHTML = '';

        // Disconnect any previous observer
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }

        // IntersectionObserver for page tracking
        observerRef.current = new IntersectionObserver(
          (entries) => {
            let maxRatio = 0;
            let visiblePage = currentPage;
            entries.forEach((entry) => {
              if (entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio;
                visiblePage = Number.parseInt(
                  entry.target.dataset.pageNumber || '1',
                  10,
                );
              }
            });
            if (maxRatio > 0.3 && !Number.isNaN(visiblePage)) {
              setCurrentPage(visiblePage);
              if (onPageChange) onPageChange(visiblePage);
            }
          },
          {
            root: container,
            threshold: [0.1, 0.3, 0.5, 0.7, 1.0],
          },
        );

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          // eslint-disable-next-line no-await-in-loop
          await renderPage(pdf, pageNum, zoom, container, observerRef.current);
          if (cancelled) break;
        }

        // eslint-disable-next-line no-console
        console.log(`PDFViewer: Rendered all ${pdf.numPages} pages`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('PDFViewer load error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
    // We intentionally exclude callback props and currentPage from deps so that
    // scrolling (which updates currentPage) does not continuously re-render
    // the entire PDF. Only the fileUrl or zoom level should trigger a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, zoom]);

  const renderPage = async (pdf, pageNum, scale, container, observer) => {
    if (!container) return;

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const wrapper = document.createElement('div');
    wrapper.dataset.pageNumber = String(pageNum);
    wrapper.style.cssText = `
      position: relative;
      width: ${viewport.width}px;
      height: ${viewport.height}px;
      margin: 0 auto 20px auto;
      background: #ffffff;
      border-radius: 4px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.5);
      overflow: hidden;
      flex-shrink: 0;
    `;

    // Canvas
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.error('PDFViewer: Could not get 2d context for page', pageNum);
      return;
    }
    ctx.scale(dpr, dpr);

    const renderContext = {
      canvasContext: ctx,
      viewport,
    };
    await page.render(renderContext).promise;

    // Text layer for highlighting
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: ${viewport.width}px;
      height: ${viewport.height}px;
      pointer-events: none;
      overflow: hidden;
      z-index: 2;
    `;

    // Manual text layer: group text items into line-level spans so that
    // phrases like "HLD vs LLD Distinction" exist as a single span.
    try {
      const textContent = await page.getTextContent();
      const lines = {};

      textContent.items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;
        const tx = pdfjsLib.Util.transform(
          viewport.transform,
          item.transform,
        );
        const yKey = Math.round(tx[5] / 5) * 5; // bucket lines by Y
        if (!lines[yKey]) {
          lines[yKey] = { items: [], y: tx[5], x: tx[4] };
        }
        lines[yKey].items.push({
          str: item.str,
          x: tx[4],
          transform: item.transform,
        });
      });

      Object.values(lines)
        .sort((a, b) => a.y - b.y)
        .forEach((line) => {
          const sortedItems = line.items.sort((a, b) => a.x - b.x);
          const lineText = sortedItems
            .map((i) => i.str)
            .join('')
            .trim();
          if (!lineText) return;

          const span = document.createElement('span');
          span.textContent = lineText;

          const firstItem = sortedItems[0];
          const tx = pdfjsLib.Util.transform(
            viewport.transform,
            firstItem.transform,
          );

          span.style.cssText = `
            position: absolute;
            color: transparent;
            white-space: pre;
            cursor: text;
            transform-origin: 0% 0%;
            left: ${line.x}px;
            top: ${line.y - 14}px;
            font-size: 14px;
            pointer-events: none;
          `;
          textLayerDiv.appendChild(span);
        });

      // eslint-disable-next-line no-console
      console.log(
        `PDFViewer: manual grouped text layer spans for page ${pageNum}:`,
        textLayerDiv.children.length,
      );
    } catch (innerErr) {
      // eslint-disable-next-line no-console
      console.error(
        'PDFViewer: manual grouped text layer creation failed on page',
        pageNum,
        innerErr,
      );
    }

    // Page label
    const pageLabel = document.createElement('div');
    pageLabel.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 12px;
      background: rgba(0,0,0,0.45);
      color: rgba(255,255,255,0.7);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      pointer-events: none;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    `;
    pageLabel.textContent = `${pageNum} / ${pdf.numPages}`;

    wrapper.appendChild(canvas);
    wrapper.appendChild(textLayerDiv);
    wrapper.appendChild(pageLabel);

    container.appendChild(wrapper);
    if (observer) observer.observe(wrapper);
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: '#0d1117',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* scrollable page container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'scroll',
          overflowX: 'auto',
          padding: '24px 16px',
          background: '#1a1f2e',
        }}
      />

      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(13,17,23,0.85)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(139,92,246,0.3)',
                borderTop: '3px solid #8B5CF6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>Loading document...</p>
          </div>
        </div>
      )}
    </div>
  );
}

