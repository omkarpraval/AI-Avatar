const fs = require('fs');
const path = require('path');
const ElevenLabs = require('elevenlabs-node');

function getVoiceClient() {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  const voiceId = process.env.ELEVEN_LABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    // eslint-disable-next-line no-console
    console.warn(
      `[TTS] Missing ElevenLabs config. apiKey=${Boolean(apiKey)} voiceId=${Boolean(voiceId)}`,
    );
    return null;
  }
  // eslint-disable-next-line no-console
  console.log(
    `[TTS] ElevenLabs configured. voiceId=${voiceId} modelId=${process.env.ELEVEN_LABS_MODEL_ID || 'default'}`,
  );
  return new ElevenLabs({ apiKey, voiceId });
}

async function fileToBase64(filePath) {
  const data = await fs.promises.readFile(filePath);
  return data.toString('base64');
}

async function generateSpeechBase64(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    // eslint-disable-next-line no-console
    console.log('[TTS] Skipping generation: empty text');
    return null;
  }

  const voice = getVoiceClient();
  if (!voice) {
    // eslint-disable-next-line no-console
    console.warn('[TTS] Skipping generation: voice client unavailable');
    return null;
  }

  const modelId = process.env.ELEVEN_LABS_MODEL_ID;
  const voiceId = process.env.ELEVEN_LABS_VOICE_ID;

  const tmpDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const fileName = path.join(
    tmpDir,
    `speech-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`,
  );

  try {
    // eslint-disable-next-line no-console
    console.log(`[TTS] Generating speech for ${trimmed.length} chars`);
    await voice.textToSpeech({
      fileName,
      textInput: trimmed,
      voiceId,
      stability: 0.5,
      similarityBoost: 0.5,
      modelId,
      style: 1,
      speakerBoost: true,
    });

    const audioBase64 = await fileToBase64(fileName);
    // eslint-disable-next-line no-console
    console.log(`[TTS] Generated audio successfully (${audioBase64.length} base64 chars)`);
    return audioBase64;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[TTS] ElevenLabs generation failed:', err.message);
    throw err;
  } finally {
    if (fs.existsSync(fileName)) {
      fs.unlinkSync(fileName);
    }
  }
}

module.exports = {
  generateSpeechBase64,
};

