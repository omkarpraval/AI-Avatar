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
};

const similarity = (a, b) => {
  const s1 = norm(a);
  const s2 = norm(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (!longer.length) return 1;
  let matches = 0;
  let si = 0;
  for (let i = 0; i < longer.length && si < shorter.length; i += 1) {
    if (longer[i] === shorter[si]) {
      matches += 1;
      si += 1;
    }
  }
  return matches / longer.length;
};

// Try to locate the correct PDF page for a snippet by scanning around the
// nominated page (self-calibrating offset).
const findCorrectPage = (snippet, nominatedPage, maxSearch = 3) => {
  const targetNorm = norm(snippet);
  if (!targetNorm) return null;

  for (let offset = 0; offset <= maxSearch; offset += 1) {
    const pagesToTry =
      offset === 0
        ? [nominatedPage]
        : [nominatedPage + offset, nominatedPage - offset];

    // eslint-disable-next-line no-restricted-syntax
    for (const pageNum of pagesToTry) {
      if (!pageNum || pageNum < 1) continue;

      const wrapper = document.querySelector(
        `[data-page-number="${pageNum}"]`,
      );
      if (!wrapper) continue;

      const spans = Array.from(
        wrapper.querySelectorAll('.textLayer span'),
      ).filter((s) => s.textContent?.trim());
      if (!spans.length) continue;

      const fullText = spans.map((s) => norm(s.textContent)).join(' ');
      if (fullText.includes(targetNorm)) {
        if (offset !== 0) {
          // eslint-disable-next-line no-console
          console.log(
            `Page offset detected: AI page ${nominatedPage} -> actual PDF page ${pageNum} (offset ${
              pageNum - nominatedPage
            })`,
          );
        }
        return { pageNum, spans };
      }
    }
  }

  // eslint-disable-next-line no-console
  console.warn(
    `Could not find snippet "${snippet}" near page ${nominatedPage} (searched ±${maxSearch})`,
  );
  return null;
};

const findMatchingSpans = (spans, snippet) => {
  const targetNorm = norm(snippet);
  if (!targetNorm || targetNorm.length < 2) return [];

  const spanData = spans
    .map((span, idx) => ({
      el: span,
      idx,
      text: norm(span.textContent || ''),
    }))
    .filter((s) => s.text.length > 0);

  if (!spanData.length) return [];

  // Strategy 1: exact single-span match
  const exact = spanData.filter((s) => s.text.includes(targetNorm));
  if (exact.length) {
    // eslint-disable-next-line no-console
    console.log('findMatchingSpans: exact single-span match');
    return exact.map((s) => s.el).slice(0, 6);
  }

  // Strategy 2: sliding window across adjacent spans
  const fullText = spanData.map((s) => s.text).join(' ');
  const targetIdx = fullText.indexOf(targetNorm);
  if (targetIdx !== -1) {
    let pos = 0;
    const matchedSpans = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const s of spanData) {
      const spanStart = pos;
      const spanEnd = pos + s.text.length + 1;
      if (spanEnd > targetIdx && spanStart < targetIdx + targetNorm.length) {
        matchedSpans.push(s.el);
      }
      pos = spanEnd;
      if (pos > targetIdx + targetNorm.length + 10) break;
    }
    if (matchedSpans.length) {
      // eslint-disable-next-line no-console
      console.log(
        'findMatchingSpans: sliding-window match with',
        matchedSpans.length,
        'spans',
      );
      return matchedSpans;
    }
  }

  // Strategy 3: keyword window
  const keywords = targetNorm.split(' ').filter((w) => w.length > 2);
  if (keywords.length >= 2) {
    const firstKw = keywords[0];
    const anchors = spanData.filter((s) => s.text.includes(firstKw));
    // eslint-disable-next-line no-restricted-syntax
    for (const anchor of anchors) {
      const window = spanData.slice(
        Math.max(0, anchor.idx - 2),
        Math.min(spanData.length, anchor.idx + 10),
      );
      const windowText = window.map((s) => s.text).join(' ');
      const allFound = keywords.every((k) => windowText.includes(k));
      if (allFound) {
        // eslint-disable-next-line no-console
        console.log('findMatchingSpans: keyword-window match');
        return window
          .filter((s) => keywords.some((k) => s.text.includes(k)))
          .map((s) => s.el);
      }
    }
  }

  // Strategy 4: partial match on first few keywords
  const partialTarget = keywords.slice(0, 3).join(' ');
  if (partialTarget) {
    const partial = spanData.filter(
      (s) =>
        s.text.includes(partialTarget) ||
        (partialTarget.includes(s.text) && s.text.length > 5),
    );
    if (partial.length) {
      // eslint-disable-next-line no-console
      console.log(
        'findMatchingSpans: partial-keyword match with',
        partial.length,
        'spans',
      );
      return partial.map((s) => s.el).slice(0, 4);
    }
  }

  // eslint-disable-next-line no-console
  console.warn(
    `findMatchingSpans: no match for snippet "${snippet}" (norm="${targetNorm}")`,
  );
  // eslint-disable-next-line no-console
  console.log(
    'Available span texts (first 20):',
    spanData.slice(0, 20).map((s) => s.text),
  );
  return [];
};

export const applyHighlights = (highlights, scrollToFirst = true) => {
  if (!highlights?.length) return;

  // eslint-disable-next-line no-console
  console.log('Applying highlights:', highlights);
  clearAllHighlights();

  setTimeout(() => {
    let firstEl = null;

    highlights.forEach((hl, hlIndex) => {
      const { page, text_snippet: textSnippet, color = 'yellow' } = hl;
      if (!textSnippet?.trim() || !page) return;

      const pageInfo = findCorrectPage(textSnippet, page);
      if (!pageInfo) return;

      const { pageNum, spans } = pageInfo;
      const matched = findMatchingSpans(spans, textSnippet);

      // eslint-disable-next-line no-console
      console.log(
        `Page ${pageNum} | snippet: "${textSnippet}" | matched: ${matched.length} spans`,
      );

      matched.forEach((span, i) => {
        setTimeout(() => {
          span.classList.add('ll-highlight');
          // eslint-disable-next-line no-param-reassign
          span.style.background = COLOR_MAP[color] || COLOR_MAP.yellow;
          // eslint-disable-next-line no-param-reassign
          span.style.borderRadius = '3px';
          // eslint-disable-next-line no-param-reassign
          span.style.boxShadow = `0 0 0 2px ${
            COLOR_MAP[color] || COLOR_MAP.yellow
          }`;
          // eslint-disable-next-line no-param-reassign
          span.style.transition =
            'background 0.4s ease, opacity 0.4s ease';

          if (!firstEl && hlIndex === 0 && i === 0) {
            firstEl = span;
          }
        }, hlIndex * 80 + i * 15);
      });
    });

    if (scrollToFirst && firstEl) {
      setTimeout(() => {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, highlights.length * 80 + 200);
    }
  }, 350);
};

