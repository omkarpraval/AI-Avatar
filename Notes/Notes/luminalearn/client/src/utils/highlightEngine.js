const COLOR_MAP = {
  yellow: 'rgba(255, 214, 10, 0.55)',
  orange: 'rgba(255, 159, 28, 0.55)',
  green: 'rgba(6, 214, 160, 0.5)',
  blue: 'rgba(0, 180, 216, 0.5)',
  purple: 'rgba(155, 93, 229, 0.5)',
  red: 'rgba(239, 68, 68, 0.5)',
};

const norm = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

const keywordTokens = (str) =>
  norm(str)
    .split(' ')
    .filter((w) => w.length > 2);

const isFigureCaption = (text) =>
  /\b(fig|figure|diagram|chart|table)\b[\s.:#-]*\d*/i.test(String(text || ''));
const FIGURE_CAPTION_RE = /^fig(?:ure)?\.?\s*\d+[\.\d]*/i;

const compactCluster = (spanData, maxLen = 8) => {
  if (!spanData.length) return [];
  const sorted = [...spanData].sort((a, b) => a.idx - b.idx);
  const clusters = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].idx - sorted[i - 1].idx <= 2) current.push(sorted[i]);
    else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);
  const best =
    clusters.sort((a, b) => b.length - a.length || a[0].idx - b[0].idx)[0] ||
    [];
  return best.slice(0, maxLen).map((s) => s.el);
};

export const clearAllHighlights = () => {
  const all = document.querySelectorAll('.ll-highlight');
  all.forEach((el) => {
    // eslint-disable-next-line no-param-reassign
    el.style.transition = 'background 0.3s ease, opacity 0.3s ease';
    // eslint-disable-next-line no-param-reassign
    el.style.opacity = '0';
    setTimeout(() => {
      el.classList.remove('ll-highlight');
      // eslint-disable-next-line no-param-reassign
      el.style.background = '';
      // eslint-disable-next-line no-param-reassign
      el.style.borderRadius = '';
      // eslint-disable-next-line no-param-reassign
      el.style.boxShadow = '';
      // eslint-disable-next-line no-param-reassign
      el.style.opacity = '';
      // eslint-disable-next-line no-param-reassign
      el.style.transition = '';
    }, 300);
  });
  const overlays = document.querySelectorAll('.ll-figure-overlay');
  overlays.forEach((el) => el.remove());
};

const topicTokensFromHighlights = (highlights) =>
  Array.from(
    new Set(
      (highlights || [])
        .flatMap((h) =>
          keywordTokens(
            `${h?.text_snippet || ''} ${h?.tooltip || ''}`,
          ),
        )
        .filter((t) => t.length >= 3),
    ),
  ).slice(0, 12);

const findFigurePageNear = (centerPage, highlights, searchWindow = 3) => {
  const tokens = topicTokensFromHighlights(highlights);
  const pageOrder = [];
  for (let d = 1; d <= searchWindow; d += 1) pageOrder.push(centerPage + d);
  pageOrder.push(centerPage);
  for (let d = 1; d <= searchWindow; d += 1) pageOrder.push(centerPage - d);

  let best = null;
  // eslint-disable-next-line no-restricted-syntax
  for (const pageNum of pageOrder) {
    if (!pageNum || pageNum < 1) continue;
    const wrapper = document.querySelector(`[data-page-number="${pageNum}"]`);
    if (!wrapper) continue;
    const spans = Array.from(wrapper.querySelectorAll('.textLayer span'));
    if (!spans.length) continue;
    // eslint-disable-next-line no-restricted-syntax
    for (const s of spans) {
      const txt = String(s.textContent || '').trim();
      if (!txt) continue;
      if (!FIGURE_CAPTION_RE.test(txt) && !/\bfigure\b/i.test(txt)) continue;
      const low = txt.toLowerCase();
      const tokenHits = tokens.length
        ? tokens.filter((t) => low.includes(t)).length
        : 0;
      const distancePenalty = Math.abs(pageNum - centerPage);
      const score = tokenHits * 10 - distancePenalty;
      if (!best || score > best.score) {
        best = { wrapper, caption: s, pageNum, score };
      }
    }
  }
  if (best && (best.score >= 0 || !tokens.length)) return best;
  return null;
};

const drawFigureOverlay = (wrapper, captionEl) => {
  wrapper.querySelector('.ll-figure-overlay')?.remove();
  const wrapperRect = wrapper.getBoundingClientRect();
  const captionRect = captionEl.getBoundingClientRect();
  const top = 8;
  const left = 12;
  const width = Math.max(60, wrapperRect.width - 24);
  const height = Math.max(80, captionRect.bottom - wrapperRect.top + 16);

  const overlay = document.createElement('div');
  overlay.className = 'll-figure-overlay';
  overlay.style.position = 'absolute';
  overlay.style.left = `${left}px`;
  overlay.style.top = `${top}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;
  overlay.style.border = '4px solid #7c3aed';
  overlay.style.borderRadius = '10px';
  overlay.style.background = 'rgba(99, 102, 241, 0.06)';
  overlay.style.boxShadow = '0 0 0 6px rgba(124,58,237,0.22)';
  overlay.style.zIndex = '5';
  overlay.style.pointerEvents = 'none';
  overlay.style.opacity = '0';
  overlay.style.transform = 'scale(0.97)';
  overlay.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

  if (getComputedStyle(wrapper).position === 'static') {
    // eslint-disable-next-line no-param-reassign
    wrapper.style.position = 'relative';
  }
  wrapper.appendChild(overlay);
  requestAnimationFrame(() => {
    // eslint-disable-next-line no-param-reassign
    overlay.style.opacity = '1';
    // eslint-disable-next-line no-param-reassign
    overlay.style.transform = 'scale(1)';
  });

  const badge = document.createElement('div');
  badge.textContent = 'Diagram Highlight';
  badge.style.position = 'absolute';
  badge.style.top = '-14px';
  badge.style.left = '12px';
  badge.style.background = '#7c3aed';
  badge.style.color = 'white';
  badge.style.fontSize = '11px';
  badge.style.fontWeight = '600';
  badge.style.padding = '2px 10px';
  badge.style.borderRadius = '9999px';
  badge.style.zIndex = '6';
  overlay.appendChild(badge);
};


const findCorrectPage = (
  snippet,
  nominatedPage,
  anchorBefore = '',
  anchorAfter = '',
  maxSearch = 3,
) => {
  const targetNorm = norm(snippet);
  const beforeNorm = norm(anchorBefore);
  const afterNorm = norm(anchorAfter);
  if (!targetNorm && !beforeNorm && !afterNorm) return null;

  for (let offset = 0; offset <= maxSearch; offset += 1) {
    const pagesToTry =
      offset === 0
        ? [nominatedPage]
        : [nominatedPage + offset, nominatedPage - offset];

    // eslint-disable-next-line no-restricted-syntax
    for (const pageNum of pagesToTry) {
      if (!pageNum || pageNum < 1) continue;
      const wrapper = document.querySelector(`[data-page-number="${pageNum}"]`);
      if (!wrapper) continue;
      const spans = Array.from(wrapper.querySelectorAll('.textLayer span')).filter(
        (s) => s.textContent?.trim(),
      );
      if (!spans.length) continue;
      const fullText = spans.map((s) => norm(s.textContent || '')).join(' ');
      const snippetOk = !!targetNorm && fullText.includes(targetNorm);
      const beforeOk = !!beforeNorm && fullText.includes(beforeNorm);
      const afterOk = !!afterNorm && fullText.includes(afterNorm);
      if (snippetOk || (beforeOk && afterOk)) return { pageNum, spans };
    }
  }

  const fallback = document.querySelector(`[data-page-number="${nominatedPage}"]`);
  if (fallback) {
    const spans = Array.from(fallback.querySelectorAll('.textLayer span')).filter(
      (s) => s.textContent?.trim(),
    );
    if (spans.length) {
      const fullText = spans.map((s) => norm(s.textContent || '')).join(' ');
      const tokens = keywordTokens(`${targetNorm} ${beforeNorm} ${afterNorm}`);
      const hits = tokens.filter((t) => fullText.includes(t)).length;
      if (hits >= 1) return { pageNum: nominatedPage, spans };
    }
  }

  return null;
};

const findMatchingSpans = (
  spans,
  snippet,
  anchorBefore = '',
  anchorAfter = '',
) => {
  const targetNorm = norm(snippet);
  const beforeNorm = norm(anchorBefore);
  const afterNorm = norm(anchorAfter);
  if (!targetNorm && !beforeNorm && !afterNorm) return [];

  const spanData = spans
    .map((span, idx) => ({ el: span, idx, text: norm(span.textContent || '') }))
    .filter((s) => s.text.length > 0);
  const maxSpansPerMatch = 3;
  if (!spanData.length) return [];

  if (targetNorm) {
    const exact = spanData.filter((s) => s.text.includes(targetNorm));
    if (exact.length) return exact.map((s) => s.el).slice(0, 1);
  }

  const fullText = spanData.map((s) => s.text).join(' ');
  if (targetNorm) {
    const targetIdx = fullText.indexOf(targetNorm);
    if (targetIdx !== -1) {
      let pos = 0;
      const matched = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const s of spanData) {
        const start = pos;
        const end = pos + s.text.length + 1;
        if (end > targetIdx && start < targetIdx + targetNorm.length)
          matched.push(s.el);
        pos = end;
        if (pos > targetIdx + targetNorm.length + 10) break;
      }
      if (matched.length) return matched.slice(0, maxSpansPerMatch);
    }
  }

  const keywords = [
    ...keywordTokens(targetNorm),
    ...keywordTokens(beforeNorm),
    ...keywordTokens(afterNorm),
  ];
  if (keywords.length >= 2) {
    const anchors = spanData.filter((s) => s.text.includes(keywords[0]));
    // eslint-disable-next-line no-restricted-syntax
    for (const anchor of anchors) {
      const window = spanData.slice(
        Math.max(0, anchor.idx - 2),
        Math.min(spanData.length, anchor.idx + 10),
      );
      const windowText = window.map((s) => s.text).join(' ');
      if (keywords.every((k) => windowText.includes(k))) {
        const relevant = window
          .filter((s) => keywords.some((k) => s.text.includes(k)))
          .slice(0, 20);
        const compact = compactCluster(relevant);
        if (compact.length) return compact.slice(0, maxSpansPerMatch);
      }
    }
  }

  if (targetNorm) {
    const targetTokens = keywordTokens(targetNorm);
    if (targetTokens.length >= 1) {
      const requiredHits = Math.max(1, Math.ceil(targetTokens.length * 0.85));
      const strong = spanData.filter((s) => {
        const hits = targetTokens.filter((t) => t.length >= 3 && s.text.includes(t)).length;
        return hits >= requiredHits;
      });
      if (strong.length) {
        const compact = compactCluster(strong);
        if (compact.length) return compact.slice(0, 1);
      }
    }
  }

  if (beforeNorm || afterNorm) {
    const beforeIdx = beforeNorm ? fullText.indexOf(beforeNorm) : -1;
    const afterIdx = afterNorm ? fullText.indexOf(afterNorm) : -1;
    if ((beforeIdx !== -1 || !beforeNorm) && (afterIdx !== -1 || !afterNorm)) {
      let pos = 0;
      const matched = [];
      const start = beforeIdx !== -1 ? beforeIdx : Math.max(0, (afterIdx || 0) - 120);
      const end = afterIdx !== -1 ? afterIdx + afterNorm.length : start + 200;
      // eslint-disable-next-line no-restricted-syntax
      for (const s of spanData) {
        const spanStart = pos;
        const spanEnd = pos + s.text.length + 1;
        if (spanEnd > start && spanStart < end) matched.push(s.el);
        pos = spanEnd;
      }
      if (matched.length) {
        return compactCluster(
          matched.map((el, idx) => ({ el, idx, text: '' })),
          maxSpansPerMatch,
        );
      }
    }
  }

  const looseTokens = keywordTokens(`${targetNorm} ${beforeNorm} ${afterNorm}`);
  if (looseTokens.length) {
    const ranked = spanData
      .map((s) => ({
        el: s.el,
        hits: looseTokens.filter((t) => s.text.includes(t)).length,
      }))
      .filter((r) => r.hits >= 1)
      .sort((a, b) => b.hits - a.hits);
    if (ranked.length) return ranked.slice(0, 2).map((r) => r.el);
  }

  return [];
};

export const applyHighlights = (highlights, scrollToFirst = true) => {
  if (!highlights?.length) return;
  clearAllHighlights();

  let attempt = 0;
  const maxAttempts = 8;

  const run = () => {
    attempt += 1;
    let firstEl = null;
    let matchedAny = false;
    let firstMatchedPage = null;
    let wantsFigure = false;

    highlights.forEach((hl, hlIndex) => {
      const page = Number(hl?.page);
      const color = hl?.color || 'yellow';
      const textSnippet = hl?.text_snippet || hl?.snippet || hl?.text || '';
      const anchorBefore = hl?.anchor_before || '';
      const anchorAfter = hl?.anchor_after || '';
      const hasFigure = Boolean(
        hl?.has_figure || /diagram|figure|chart|table/i.test(String(hl?.type || '')),
      );
      wantsFigure = wantsFigure || hasFigure;
      if (!page) return;

      let matched = [];
      if (String(textSnippet).trim() || String(anchorBefore).trim() || String(anchorAfter).trim()) {
        const pageInfo = findCorrectPage(textSnippet, page, anchorBefore, anchorAfter);
        if (pageInfo) {
          matched = findMatchingSpans(
            pageInfo.spans,
            textSnippet,
            anchorBefore,
            anchorAfter,
          );
          if (hasFigure) {
            const figCaps = pageInfo.spans.filter((s) =>
              isFigureCaption(String(s.textContent || '')),
            );
            matched = [...matched, ...figCaps.slice(0, 2)];
          }
        }
      }

      if (!matched.length) return;
      matchedAny = true;
      if (!firstMatchedPage) firstMatchedPage = page;

      matched.forEach((span, i) => {
        setTimeout(() => {
          span.classList.add('ll-highlight');
          // eslint-disable-next-line no-param-reassign
          span.style.background = COLOR_MAP[color] || COLOR_MAP.yellow;
          // eslint-disable-next-line no-param-reassign
          span.style.borderRadius = '3px';
          // eslint-disable-next-line no-param-reassign
          span.style.boxShadow = `0 0 0 2px ${COLOR_MAP[color] || COLOR_MAP.yellow}`;
          // eslint-disable-next-line no-param-reassign
          span.style.transition = 'background 0.4s ease, opacity 0.4s ease';
          if (!firstEl && hlIndex === 0 && i === 0) firstEl = span;
        }, hlIndex * 80 + i * 15);
      });
    });

    if (scrollToFirst && firstEl) {
      setTimeout(() => {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, highlights.length * 80 + 200);
    } else if (scrollToFirst && firstMatchedPage) {
      const pageEl = document.querySelector(`[data-page-number="${firstMatchedPage}"]`);
      pageEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (matchedAny && firstMatchedPage) {
      const figure = findFigurePageNear(firstMatchedPage, highlights, 3);
      if (figure) {
        drawFigureOverlay(figure.wrapper, figure.caption);
        setTimeout(() => {
          figure.wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }

    if (!matchedAny && attempt < maxAttempts) setTimeout(run, 250);
  };

  setTimeout(run, 350);
};

