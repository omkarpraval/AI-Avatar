import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type Props = {
  fileUrl: string;
  onDocumentLoaded?: (numPages: number) => void;
  onPageChange?: (pageNumber: number) => void;
};

export function PDFViewer({ fileUrl, onDocumentLoaded, onPageChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onDocumentLoadedRef = useRef(onDocumentLoaded);
  const onPageChangeRef = useRef(onPageChange);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    onDocumentLoadedRef.current = onDocumentLoaded;
  }, [onDocumentLoaded]);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        onDocumentLoadedRef.current?.(pdf.numPages || 0);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!containerRef.current) return;

        const container = containerRef.current;
        container.innerHTML = "";

        // Fit-to-width scale calculated once per file load.
        const firstPage = await pdf.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        const availableWidth = Math.max(200, (container.clientWidth || 0) - 40);
        const renderScale = Math.max(
          0.45,
          Math.min(2, Number((availableWidth / baseViewport.width).toFixed(3)))
        );

        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }

        observerRef.current = new IntersectionObserver(
          (entries) => {
            let maxRatio = 0;
            let visiblePage = 1;
            entries.forEach((entry) => {
              if (entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio;
                visiblePage = Number.parseInt(
                  (entry.target as HTMLElement).dataset.pageNumber || "1",
                  10
                );
              }
            });
            if (maxRatio > 0.3 && !Number.isNaN(visiblePage)) {
              onPageChangeRef.current?.(visiblePage);
            }
          },
          { root: container, threshold: [0.1, 0.3, 0.5, 0.7, 1.0] }
        );

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          // eslint-disable-next-line no-await-in-loop
          await renderPage(pdf, pageNum, renderScale, container, observerRef.current);
          if (cancelled) break;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("PDFViewer load error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
    };
  }, [fileUrl]);

  const renderPage = async (
    pdf: any,
    pageNum: number,
    scale: number,
    container: HTMLDivElement,
    observer: IntersectionObserver | null
  ) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const wrapper = document.createElement("div");
    wrapper.dataset.pageNumber = String(pageNum);
    wrapper.style.cssText = `
      position: relative;
      width: ${viewport.width}px;
      height: ${viewport.height}px;
      margin: 0 auto 20px auto;
      background: #ffffff;
      border-radius: 4px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.3);
      overflow: hidden;
      flex-shrink: 0;
    `;

    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const textLayerDiv = document.createElement("div");
    textLayerDiv.className = "textLayer";
    textLayerDiv.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: ${viewport.width}px;
      height: ${viewport.height}px;
      pointer-events: none;
      overflow: hidden;
      z-index: 2;
    `;

    try {
      const textContent = await page.getTextContent();
      const lines: Record<string, any> = {};

      textContent.items.forEach((item: any) => {
        if (!item.str || !item.str.trim()) return;
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const yKey = Math.round(tx[5] / 5) * 5;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => a.y - b.y)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .forEach((line: any) => {
          const sortedItems = line.items.sort((a: any, b: any) => a.x - b.x);
          const lineText = sortedItems.map((i: any) => i.str).join(" ").replace(/\s+/g, " ").trim();
          if (!lineText) return;

          const span = document.createElement("span");
          span.textContent = lineText;
          span.style.cssText = `
            position: absolute;
            color: transparent;
            white-space: pre;
            transform-origin: 0% 0%;
            left: ${line.x}px;
            top: ${line.y - 14}px;
            font-size: 14px;
            pointer-events: none;
          `;
          textLayerDiv.appendChild(span);
        });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Text layer generation failed:", err);
    }

    wrapper.appendChild(canvas);
    wrapper.appendChild(textLayerDiv);
    container.appendChild(wrapper);
    observer?.observe(wrapper);
  };

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-lg bg-slate-900">
      <div
        ref={containerRef}
        className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-slate-800 p-4"
      />
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="rounded-lg bg-white px-4 py-2 text-sm text-slate-700">
            Loading document...
          </div>
        </div>
      )}
    </div>
  );
}

