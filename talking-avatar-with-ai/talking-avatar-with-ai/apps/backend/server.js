import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { openAIChain, parser } from "./modules/openAI.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";
import { convertTextToSpeech, voice } from "./modules/elevenLabs.mjs";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

// Ensure the audios directory exists
const audiosDir = 'audios';
if (!fs.existsSync(audiosDir)) {
  fs.mkdirSync(audiosDir, { recursive: true });
}

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices());
});

// Function to generate audio files with Eleven Labs
// Function to generate audio files with Eleven Labs
async function generateElevenLabsAudio(messages) {
  console.log(`Starting audio generation with voice ID: ${process.env.ELEVEN_LABS_VOICE_ID}`); // Debug: Log voice ID
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].text) {
      const fileName = path.join(audiosDir, `message_${i}.mp3`);
      console.log(`Generating audio for message ${i}: "${messages[i].text}"`); // Debug: Log message text
      try {
        await convertTextToSpeech({ 
          text: messages[i].text, 
          fileName: fileName 
        });
        console.log(`Message ${i} converted to speech using Eleven Labs, saved to ${fileName}`); // Debug: Confirm file
      } catch (error) {
        console.error(`Error generating Eleven Labs speech for message ${i}:`, error.message); // Debug: Log errors
      }
    }
  }
  return messages;
}

app.post("/tts", async (req, res) => {
  const userMessage = await req.body.message;
  console.log(`Received user message: ${userMessage}`); // Debug: Log user input
  const defaultMessages = await sendDefaultMessages({ userMessage });
  if (defaultMessages) {
    console.log("Sending default messages:", defaultMessages); // Debug: Log default response
    res.send({ messages: defaultMessages });
    return;
  }
  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
    console.log("OpenAI response:", openAImessages); // Debug: Log OpenAI output
  } catch (error) {
    console.error("OpenAI error:", error.message); // Debug: Log OpenAI errors
    openAImessages = defaultResponse;
  }
  
  console.log(`Generating audio with voice ID: ${process.env.ELEVEN_LABS_VOICE_ID}`); // Debug: Log voice ID before generation
  await generateElevenLabsAudio(openAImessages.messages);
  
  console.log("Starting lip sync processing"); // Debug: Log lip sync start
  const processedMessages = await lipSync({ messages: openAImessages.messages });
  console.log("Processed messages:", processedMessages); // Debug: Log final output
  
  res.send({ messages: processedMessages });
});

app.listen(port, () => {
  console.log(`Harsh are listening on port ${port}`);
});