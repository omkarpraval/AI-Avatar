const Groq = require('groq-sdk');

const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  return new Groq({ apiKey });
}

/**
 * Makes a non-streaming call to Groq and expects the tutor JSON schema.
 * The routes still call this helper the same way.
 */
async function askClaude({ systemPrompt, messages, maxTokens = 4096 }) {
  const client = getClient();

  // Convert Anthropic-style messages to OpenAI-style
  const converted = messages.map((m) => ({
    role: m.role,
    content: m.content
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('\n'),
  }));

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.3,
    // If supported by the model, enforce JSON output
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          systemPrompt +
          '\n\nIMPORTANT: Return ONLY valid JSON. Do not wrap in markdown. Do not add any extra text.',
      },
      ...converted,
    ],
  });

  const text = response.choices?.[0]?.message?.content ?? '';

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    // Try to recover JSON embedded in extra text
    const recovered = extractFirstJsonObject(text);
    if (!recovered) throw new Error('Failed to parse Groq JSON response');
    parsed = recovered;
  }

  return parsed;
}

function extractFirstJsonObject(input) {
  if (!input) return null;
  const s = String(input);
  const start = s.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) {
      const candidate = s.slice(start, i + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
  }
  return null;
}

module.exports = {
  askClaude,
};

