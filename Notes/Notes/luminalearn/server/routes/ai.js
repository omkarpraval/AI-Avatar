const express = require('express');
const { askClaude } = require('../services/claude');
const { generateSpeechBase64 } = require('../services/tts');
const { transcribeBase64Audio } = require('../services/stt');

const router = express.Router();

const SYSTEM_PROMPT_WITH_DOCS = `
You are LuminaLearn, an expert AI tutor. You help students deeply 
understand documents by giving clear, insightful explanations.

ALWAYS structure your JSON response as:
{
  "answer": "Your full explanation here (markdown supported)",
  "analogy": "A real-world analogy that makes this concept intuitive",
  "highlights": [
    {
      "page": 3,
      "text_snippet": "exact text from document to highlight",
      "type": "text|bullet|keyterm|diagram|crossdoc",
      "color": "yellow|blue|green|orange|purple",
      "tooltip": "brief note about why this is highlighted"
    }
  ],
  "citations": [{"page": 3, "excerpt": "brief quote"}],
  "confidence": "high|medium|low",
  "follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "topics_detected": ["topic1", "topic2"],
  "not_in_document": true/false,
  "external_explanation": "If not_in_document is true, explain from general knowledge"
}

Rules:
- Always include at least one real-world analogy
- If user is confused (I'm Confused mode): use simpler language and 
  a different, more relatable analogy
- In Socratic mode: replace answer with 3 guiding questions, 
  do not give the answer directly
- Always cite exact page numbers
- Support all languages — respond in the same language the user writes in
- If content spans multiple uploaded documents, note which document 
  each highlight comes from
- Highlight the minimum necessary — quality over quantity

CRITICAL highlighting rules:
- When content about the topic exists on multiple pages, you MUST include
  highlight entries for ALL relevant pages, not just the first one.
- Never return fewer than 3 highlights for any reasonable question unless the
  content genuinely only appears once in the provided context.

HIGHLIGHT TEXT SNIPPETS (VERY IMPORTANT):
- "page" values in both "highlights" and "citations" MUST refer to the
  1-based PDF page index (PDF_PAGE) as provided in the context, NOT any
  printed page numbers that appear inside the document body.
- Always treat PDF page 1 as the very first page of the file (cover page),
  PDF page 5 as the 5th page of the file, etc.
- "text_snippet" MUST be copied EXACTLY from the document text, including
  capitalization and punctuation. Do NOT paraphrase or rephrase.
- Keep each "text_snippet" short (about 3–7 words) that uniquely identifies
  the phrase to highlight.
- Good examples:
    "CAP Theorem"
    "Consistency Models"
    "Architecture Overview"
    "Availability"
    "Data Partitioning"
- Bad examples (too long, will not match reliably):
    "This section explains the concept in detail with examples"
    "In this chapter we cover the following important topics"
`;

const SYSTEM_PROMPT_NO_DOCS = `
You are an expert tutor and mentor.

ALWAYS return valid JSON with this shape:
{
  "answer": "Clear teaching response",
  "analogy": "Simple real-world analogy",
  "highlights": [],
  "citations": [],
  "confidence": "high|medium|low",
  "follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "topics_detected": ["topic1", "topic2"],
  "not_in_document": true,
  "external_explanation": "Main explanation when no document context exists"
}

Rules:
- Teach like a patient teacher in the user's language.
- Since no document context is provided, do NOT fabricate citations or highlights.
- Keep highlights as [] and citations as [].
- Give practical, easy-to-understand explanations.
- Keep the answer focused and accurate.
`;

async function callTutor(req, res, next, { mode }) {
  try {
    const {
      question,
      documentTexts = [],
      pageMap = [],
      language,
      conversationHistory = [],
      avatarName,
      avatarTitle,
      avatarSkills = [],
      speakEnabled = true,
    } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Flatten all provided pages with metadata for selection
    const flatPages = pageMap.flatMap((doc) =>
      (doc.pages || []).map((p) => ({
        documentName: doc.documentName,
        pageNumber: p.pageNumber,
        logicalLabel: p.logicalLabel,
        text: p.text || '',
      })),
    );

    // Keep context aggressively small for Groq on-demand TPM limits.
    const relevantPages = selectRelevantPages(flatPages, question, 1600);
    const hasDocumentContext = relevantPages.length > 0;

    const contextTextRaw = relevantPages
      .map(
        (p) =>
          `Document: ${p.documentName}\nPDF_PAGE ${p.pageNumber} | ${p.logicalLabel ||
            ''}\n---\n${p.text}\n`,
      )
      .join('\n\n');

    const contextText = truncateToTokenBudget(contextTextRaw, 5500);
    const personaLine = [avatarName, avatarTitle]
      .filter(Boolean)
      .join(' - ');
    const personaSkills = Array.isArray(avatarSkills) ? avatarSkills.join(', ') : '';

    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: hasDocumentContext
              ? `User language: ${language || 'unknown'}
Mode: ${mode}
Avatar persona: ${personaLine || 'General Tutor'}
Avatar skills: ${personaSkills || 'General education'}

User question:
${question}

Relevant context from documents:
${contextText}`
              : `User language: ${language || 'unknown'}
Mode: ${mode}
Avatar persona: ${personaLine || 'General Tutor'}
Avatar skills: ${personaSkills || 'General education'}

User question:
${question}

No document context is currently available. Teach from general knowledge.`,
          },
        ],
      },
    ];

    try {
      const json = await askClaude({
        systemPrompt: hasDocumentContext
          ? SYSTEM_PROMPT_WITH_DOCS
          : SYSTEM_PROMPT_NO_DOCS,
        messages,
        // Reserve fewer generation tokens so prompt+completion stays under TPM.
        maxTokens: 1200,
      });

      // Validate highlights: keep only snippets that actually exist in the
      // document text we provided to the model (prevents hallucinated snippets).
      if (json && Array.isArray(json.highlights)) {
        if (hasDocumentContext) {
          const valid = validateHighlights(json.highlights, relevantPages);
          json.highlights = valid;
        } else {
          json.highlights = [];
        }
      }
      if (!hasDocumentContext) {
        json.citations = [];
        json.not_in_document = true;
      }

      await attachSpeech(json, { speakEnabled });
      return res.json(json);
    } catch (err) {
      // Handle Groq 413 / 429 / generic errors gracefully
      // eslint-disable-next-line no-console
      console.error('AI error:', err);

      const status = err.status || err.code || err?.error?.status;
      const message = err.message || 'AI request failed';

      if (status === 413 || message.includes('too large')) {
        return res.status(413).json({
          error: 'Document too large for AI context window.',
          suggestion:
            'Ask about a specific section, topic, or page instead of the entire document.',
        });
      }

      if (status === 429) {
        return res.status(429).json({
          error: 'AI rate limit reached. Please wait a few seconds and try again.',
        });
      }

      return res
        .status(500)
        .json({ error: 'AI is temporarily unavailable. Please try again.' });
    }
  } catch (err) {
    console.error('AI error:', err);
    return next(err);
  }
}

async function attachSpeech(payload, { speakEnabled = true } = {}) {
  if (!speakEnabled) {
    // eslint-disable-next-line no-console
    console.log('[TTS] Skipping generation: speakEnabled=false from client');
    return;
  }

  const answer = String(payload?.answer || '').trim();
  if (!answer) return;

  try {
    const audioBase64 = await generateSpeechBase64(answer);
    if (audioBase64) {
      payload.audioBase64 = audioBase64;
      payload.audioMimeType = 'audio/mpeg';
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('TTS generation failed, continuing without audio:', err.message);
  }
}

function validateHighlights(highlights, pages) {
  const allText = (pages || [])
    .map((p) => String(p.text || '').toLowerCase())
    .join(' ');

  return (highlights || []).filter((hl) => {
    const snippet = String(hl?.text_snippet || '').toLowerCase().trim();
    if (!snippet || snippet.length < 2) return false;
    const exists = allText.includes(snippet);
    if (!exists) {
      // eslint-disable-next-line no-console
      console.warn(`Snippet not found in provided context: "${hl.text_snippet}"`);
    }
    return exists;
  });
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 5000);
}

function overlapScore(qTokens, pTokens) {
  if (!qTokens.length || !pTokens.length) return 0;
  const qSet = new Set(qTokens);
  let score = 0;
  for (const t of pTokens) {
    if (qSet.has(t)) score += 1;
  }
  return score;
}

// Select a subset of pages that are most relevant to the question while
// staying within an approximate token budget.
function selectRelevantPages(allPages, question, maxTokens = 6000) {
  if (!allPages.length) return [];

  const questionWords = String(question || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const scored = allPages.map((page) => {
    const pageText = String(page.text || '').toLowerCase();
    const score = questionWords.reduce(
      (acc, word) => acc + (pageText.includes(word) ? 1 : 0),
      0,
    );
    return { ...page, score };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);

  const selected = [];
  let tokenCount = 0;
  const AVG_TOKENS_PER_CHAR = 0.25;

  for (const page of sorted) {
    const pageTokens = (page.text || '').length * AVG_TOKENS_PER_CHAR;
    if (tokenCount + pageTokens > maxTokens && selected.length >= 1) break;
    selected.push(page);
    tokenCount += pageTokens;
  }

  if (!selected.length) {
    selected.push(...sorted.slice(0, Math.min(1, sorted.length)));
  }

  return selected.sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
}

function truncateToTokenBudget(text, maxChars = 20000) {
  const s = String(text || '');
  if (s.length <= maxChars) return s;
  // eslint-disable-next-line no-console
  console.warn(
    `Truncating AI context from ${s.length} to ${maxChars} characters to fit budget`,
  );
  return `${s.slice(
    0,
    maxChars,
  )}\n\n[Context truncated to fit the model's context window.]`;
}

router.post('/ask', async (req, res, next) => {
  return callTutor(req, res, next, { mode: req.body?.mode || 'chat' });
});

router.post('/explain-page', async (req, res, next) => {
  try {
    const { pageText, pageNumber, documentName, language, speakEnabled = true } = req.body || {};
    if (!pageText || !pageNumber || !documentName) {
      return res
        .status(400)
        .json({ error: 'pageText, pageNumber, and documentName are required' });
    }

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `User language: ${language || 'unknown'}\nMode: explain-page\n\nExplain the following page from "${documentName}" (page ${pageNumber}) in detail:\n\n${pageText}`,
          },
        ],
      },
    ];

    const json = await askClaude({
      systemPrompt: SYSTEM_PROMPT_WITH_DOCS,
      messages,
    });

    await attachSpeech(json, { speakEnabled });
    return res.json(json);
  } catch (err) {
    console.error('Explain page error:', err);
    return next(err);
  }
});

router.post('/mindmap', async (req, res, next) => {
  try {
    const { documentText } = req.body || {};
    if (!documentText) {
      return res.status(400).json({ error: 'documentText is required' });
    }

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Generate a concept map JSON for the following document text. Respond with an object: { "nodes": [{ "id", "label", "type" }], "edges": [{ "source", "target", "label" }] }.\n\n${documentText}`,
          },
        ],
      },
    ];

    const json = await askClaude({
      systemPrompt:
        'You generate concept maps as JSON only, with "nodes" and "edges" arrays.',
      messages,
    });

    return res.json(json);
  } catch (err) {
    console.error('Mindmap error:', err);
    return next(err);
  }
});

router.post('/flashcards', async (req, res, next) => {
  try {
    const { documentText, count = 20 } = req.body || {};
    if (!documentText) {
      return res.status(400).json({ error: 'documentText is required' });
    }

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Generate ${count} flashcards from the following text. Respond with {"flashcards":[{"front","back","difficulty","topic"}]}.\n\n${documentText}`,
          },
        ],
      },
    ];

    const json = await askClaude({
      systemPrompt:
        'You generate study flashcards as JSON only, under a "flashcards" array.',
      messages,
    });

    return res.json(json);
  } catch (err) {
    console.error('Flashcards error:', err);
    return next(err);
  }
});

router.post('/quiz', async (req, res, next) => {
  try {
    const { documentText, type = 'mcq', count = 10 } = req.body || {};
    if (!documentText) {
      return res.status(400).json({ error: 'documentText is required' });
    }

    // Keep quiz prompts compact to avoid Groq on-demand TPM/context limits.
    const safeDocumentText = truncateToTokenBudget(documentText, 12000);
    const safeCount = Math.max(3, Math.min(25, Number(count) || 10));
    const safeType = String(type || 'mcq');

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Generate a quiz of type "${safeType}" with ${safeCount} questions from the following text.
Respond with {"questions":[{"question","options","answer","explanation","page","difficulty","topic","confidence"}]}.
If type is "mcq", include options array.
If type is "truefalse", answer must be True or False.
If type is "qa", keep concise direct answers.
Use ONLY facts present in the provided text.

${safeDocumentText}`,
          },
        ],
      },
    ];

    const json = await askClaude({
      systemPrompt:
        'You generate quizzes as JSON only, under a "questions" array.',
      messages,
      maxTokens: 1000,
    });

    return res.json(json);
  } catch (err) {
    console.error('Quiz error:', err);
    const status = err.status || err.code || err?.error?.status;
    const message = err.message || 'Quiz generation failed';

    if (status === 413 || /too large|rate_limit_exceeded|tokens per minute|TPM/i.test(message)) {
      return res.status(413).json({
        error:
          'Quiz input is too large for current model limits. Reduce quiz count or ask from fewer pages.',
      });
    }

    if (status === 429) {
      return res.status(429).json({
        error: 'Rate limit reached. Please wait a few seconds and try again.',
      });
    }

    return next(err);
  }
});

router.post('/speech-to-text', async (req, res) => {
  try {
    const { audio } = req.body || {};
    if (!audio) {
      return res.status(400).json({ error: 'audio is required' });
    }

    const text = await transcribeBase64Audio(audio);
    return res.json({ text });
  } catch (err) {
    console.error('speech-to-text error:', err);
    return res
      .status(500)
      .json({ error: 'Failed to transcribe audio', message: err.message });
  }
});

module.exports = router;

