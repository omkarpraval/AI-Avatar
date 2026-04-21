import ElevenLabs from "elevenlabs-node";
import dotenv from "dotenv";
import fs from "fs";
import { v4 as uuidv4 } from "uuid"; // You may need to install this: npm install uuid
import path from "path";

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = process.env.ELEVEN_LABS_VOICE_ID;
const modelID = process.env.ELEVEN_LABS_MODEL_ID;

const voice = new ElevenLabs({
  apiKey: elevenLabsApiKey,
  voiceId: voiceID,
});

// Original function that saves to file
async function convertTextToSpeech({ text, fileName }) {
  console.log(`Generating audio for text: "${text}" with voice ID: ${voiceID}`); // Debug: Log text and voice ID
  try {
    await voice.textToSpeech({
      fileName: fileName,
      textInput: text,
      voiceId: voiceID,
      stability: 0.5,
      similarityBoost: 0.5,
      modelId: modelID,
      style: 1,
      speakerBoost: true,
    });
    console.log(`Audio saved to ${fileName}`); // Debug: Confirm file creation
  } catch (error) {
    console.error(`Error generating audio with voice ID ${voiceID}:`, error.message); // Debug: Log any errors
    throw error;
  }
}

// Custom function to convert file to base64 without depending on files.mjs
async function fileToBase64(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data.toString("base64"));
    });
  });
}

// New function that returns base64 audio data
async function getTextToSpeechBase64(text) {
  try {
    // Create temp directory if it doesn't exist
    const tempDir = 'tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    // Generate unique filename to avoid conflicts
    const fileName = path.join(tempDir, `speech_${uuidv4()}.mp3`);
    
    // Generate speech file
    await voice.textToSpeech({
      fileName: fileName,
      textInput: text,
      voiceId: voiceID,
      stability: 0.5,
      similarityBoost: 0.5,
      modelId: modelID,
      style: 1,
      speakerBoost: true,
    });
    
    // Read file as base64
    const base64Audio = await fileToBase64(fileName);
    
    // Clean up temp file
    fs.unlinkSync(fileName);
    
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech with Eleven Labs:", error);
    throw error;
  }
}

export { convertTextToSpeech, voice, getTextToSpeechBase64 };