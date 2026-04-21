import { useEffect, useRef, useState } from "react";

export const useSpeech = (subject_filter = null) => {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognition = useRef(null);

  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          tts(transcript, subject_filter);
        }
      };
      recognition.current.onend = () => setRecording(false);
      recognition.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setRecording(false);
      };
    } else {
      console.warn("Speech recognition not supported in this browser.");
    }
  }, []);

  const startRecording = () => {
    if (recognition.current && !recording && !loading && !message) {
      setRecording(true);
      recognition.current.start();
    }
  };

  const stopRecording = () => {
    if (recognition.current && recording) {
      recognition.current.stop();
    }
  };

  const tts = async (query) => {
    if (!query || loading || message) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/ask/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          k: 5,
          subject_filter,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch response");
      const data = await res.json();
      setMessage({
        text: data.text,
        audio: data.audio,
        lipsync: data.lipsync,
        facialExpression: "happy",  // Default or analyze text for emotion
        animation: "Idle",  // Default animation
      });
    } catch (error) {
      console.error("Error in tts:", error);
    } finally {
      setLoading(false);
    }
  };

  const onMessagePlayed = () => {
    setMessage(null);
  };

  return { tts, loading, message, onMessagePlayed, startRecording, stopRecording, recording };
};