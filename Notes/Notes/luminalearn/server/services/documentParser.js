const mammoth = require('mammoth');
const officeParser = require('officeparser');
const pdfParse = require('pdf-parse');

const MAX_PAGES = 100;

async function parsePdf(buffer) {
  const data = await pdfParse(buffer);

  // pdf-parse v1 returns a single text string with form-feed page breaks
  const rawPages = String(data.text || '')
    .split('\f')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const numPages = Math.min(
    Number(data.numpages || rawPages.length || 1),
    MAX_PAGES
  );

  const pages = Array.from({ length: numPages }).map((_, idx) => {
    const text = rawPages[idx] || '';
    return {
      pageNumber: idx + 1,
      logicalLabel: `Page ${idx + 1}`,
      text,
      wordCount: text ? text.split(/\s+/).length : 0,
    };
  });

  return {
    type: 'pdf',
    pages,
  };
}

async function parseDocx(buffer) {
  const { value: rawText } = await mammoth.extractRawText({ buffer });

  const words = rawText.trim().split(/\s+/);
  const pages = [];
  const WORDS_PER_PAGE = 400;

  for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
    const chunk = words.slice(i, i + WORDS_PER_PAGE).join(' ');
    const pageIndex = pages.length;
    pages.push({
      pageNumber: pageIndex + 1,
      logicalLabel: `Section ${pageIndex + 1}`,
      text: chunk,
      wordCount: chunk ? chunk.split(/\s+/).length : 0,
    });
    if (pages.length >= MAX_PAGES) break;
  }

  return {
    type: 'docx',
    pages,
  };
}

function parsePptx(buffer) {
  return new Promise((resolve, reject) => {
    officeParser.parseOfficeAsync(buffer, (data, err) => {
      if (err) {
        return reject(err);
      }

      const slides = Array.isArray(data) ? data : [];
      const pages = slides.slice(0, MAX_PAGES).map((slide, index) => {
        const title = slide.title || `Slide ${index + 1}`;
        const bodyText = slide.text || '';
        const joined = [title, bodyText].filter(Boolean).join('\n\n');
        return {
          pageNumber: index + 1,
          logicalLabel: `Slide ${index + 1}`,
          text: joined,
          wordCount: joined ? joined.split(/\s+/).length : 0,
        };
      });

      resolve({
        type: 'pptx',
        pages,
      });
    });
  });
}

async function parseDocuments(files) {
  const results = [];

  for (const file of files) {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    const buffer = file.buffer;

    if (ext === 'pdf') {
      const parsed = await parsePdf(buffer);
      results.push({
        name: file.originalname,
        sizeBytes: file.size,
        ...parsed,
      });
    } else if (ext === 'docx') {
      const parsed = await parseDocx(buffer);
      results.push({
        name: file.originalname,
        sizeBytes: file.size,
        ...parsed,
      });
    } else if (ext === 'pptx') {
      const parsed = await parsePptx(buffer);
      results.push({
        name: file.originalname,
        sizeBytes: file.size,
        ...parsed,
      });
    } else {
      // Skip unsupported types
      // Could also throw an error per file if desired
    }
  }

  return { documents: results };
}

module.exports = {
  parseDocuments,
};

