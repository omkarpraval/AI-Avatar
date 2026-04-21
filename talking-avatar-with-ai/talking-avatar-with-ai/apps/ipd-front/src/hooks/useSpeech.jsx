import { createContext, useContext, useEffect, useRef, useState } from "react";

const backendUrl =
  import.meta.env.VITE_NOTES_API_BASE_URL || "http://localhost:3001/api";

const SpeechContext = createContext();

export const SpeechProvider = ({ children }) => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState("");
  const [muted, setMuted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);

  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const withMessageId = (payload = {}) => ({
    id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...payload,
  });

  const initiateRecording = () => {
    chunksRef.current = [];
  };

  const onDataAvailable = (e) => {
    chunksRef.current.push(e.data);
  };

  const initRecorder = async () => {
    if (mediaRecorder) return mediaRecorder;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorder.onstart = initiateRecording;
      recorder.ondataavailable = onDataAvailable;
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          await sendAudioData(audioBlob);
        } catch (error) {
          console.error(error);
          alert(error.message);
        }
      };
      setMediaRecorder(recorder);
      setMicReady(true);
      setMicError("");
      return recorder;
    } catch (err) {
      setMicReady(false);
      setMicError("Microphone permission denied or unavailable.");
      throw err;
    }
  };

  const sendAudioData = async (audioBlob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async function () {
      const base64Audio = reader.result.split(",")[1];
      setLoading(true);
      try {
        const data = await fetch(`${backendUrl}/speech-to-text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audio: base64Audio }),
        });
        if (!data.ok) {
          throw new Error("Speech-to-text request failed");
        }
        const json = await data.json();
        const transcript = json?.text?.trim();
        if (transcript) {
          await tts(transcript);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      initRecorder().catch((err) => {
        console.error("Error accessing microphone:", err);
      });
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const recorder = mediaRecorder || (await initRecorder());
      if (recorder && recorder.state !== "recording") {
        recorder.start();
        setRecording(true);
      }
    } catch (err) {
      console.error("Unable to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    setRecording(false);
  };

  const tts = async (message) => {
    const prompt = String(message || "").trim();
    if (!prompt) return;
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: prompt,
          documentTexts: [],
          pageMap: [],
          mode: "chat",
          language: "en",
          conversationHistory: [],
          avatarName: "Maitri",
          avatarTitle: "Science Advisor",
          avatarSkills: ["Physics", "Chemistry", "Biology", "Technology"],
        }),
      });
      if (!data.ok) {
        throw new Error("Ask request failed");
      }
      const response = await data.json();
      const assistantMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: response?.answer || "",
        facialExpression: "default",
        animation: "TalkingOne",
        audio: response?.audioBase64 || "",
        lipsync: null,
      };
      setMessages((messages) => [...messages, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  const enqueueAvatarMessage = (payload) => {
    if (!payload || !payload.text) return;
    setMessages((messages) => [...messages, withMessageId(payload)]);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <SpeechContext.Provider
      value={{
        startRecording,
        stopRecording,
        recording,
        tts,
        message,
        onMessagePlayed,
        enqueueAvatarMessage,
        loading,
        micReady,
        micError,
        muted,
        setMuted,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error("useSpeech must be used within a SpeechProvider");
  }
  return context;
};
