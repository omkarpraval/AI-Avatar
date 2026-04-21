import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SpeechProvider } from "./hooks/useSpeech"; // <-- IMPORTANT

createRoot(document.getElementById("root")!).render(
  <SpeechProvider>
    <App />
  </SpeechProvider>
);
