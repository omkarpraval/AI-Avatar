const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }
  return new Groq({ apiKey });
}

function decodeBase64Audio(base64Audio) {
  const cleaned = String(base64Audio || '').replace(/^data:audio\/\w+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

async function transcribeBase64Audio(base64Audio) {
  const tmpDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const filePath = path.join(
    tmpDir,
    `speech-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`,
  );

  try {
    const audioBuffer = decodeBase64Audio(base64Audio);
    await fs.promises.writeFile(filePath, audioBuffer);

    const client = getClient();
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
      response_format: 'json',
      language: process.env.GROQ_STT_LANGUAGE || undefined,
    });

    return transcription?.text || '';
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = {
  transcribeBase64Audio,
};

