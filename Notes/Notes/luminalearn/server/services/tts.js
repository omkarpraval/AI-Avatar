const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';

function getVoiceConfig() {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  const voiceId = process.env.ELEVEN_LABS_VOICE_ID;
  const modelId = process.env.ELEVEN_LABS_MODEL_ID || DEFAULT_ELEVENLABS_MODEL;

  if (!apiKey || !voiceId) {
    // eslint-disable-next-line no-console
    console.warn(
      `[TTS] Missing ElevenLabs config. apiKey=${Boolean(apiKey)} voiceId=${Boolean(voiceId)}`,
    );
    return null;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[TTS] ElevenLabs configured. voiceId=${voiceId} modelId=${modelId}`,
  );
  return { apiKey, voiceId, modelId };
}

async function requestElevenLabsAudio({ apiKey, voiceId, modelId, text }) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 1,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch (_err) {
      details = '';
    }
    throw new Error(
      `ElevenLabs request failed (${response.status} ${response.statusText})${
        details ? `: ${details}` : ''
      }`,
    );
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (!audioBuffer.length) {
    throw new Error('ElevenLabs returned empty audio response');
  }

  return audioBuffer.toString('base64');
}

async function generateSpeechBase64(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    // eslint-disable-next-line no-console
    console.log('[TTS] Skipping generation: empty text');
    return null;
  }

  const voiceConfig = getVoiceConfig();
  if (!voiceConfig) {
    // eslint-disable-next-line no-console
    console.warn('[TTS] Skipping generation: voice config unavailable');
    return null;
  }

  try {
    // eslint-disable-next-line no-console
    console.log(`[TTS] Generating speech for ${trimmed.length} chars`);

    const audioBase64 = await requestElevenLabsAudio({
      ...voiceConfig,
      text: trimmed,
    });
    // eslint-disable-next-line no-console
    console.log(`[TTS] Generated audio successfully (${audioBase64.length} base64 chars)`);
    return audioBase64;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[TTS] ElevenLabs generation failed:', err.message);
    throw err;
  }
}

module.exports = {
  generateSpeechBase64,
};

