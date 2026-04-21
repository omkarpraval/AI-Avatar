import { Loader, Suspense } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { Scenario } from "./Scenario";
import { useSpeech } from "../hooks/useSpeech";
import Navbar from "./Navbar";
import { Footer } from "./Footer";

const MaxChatPage = () => {
  const [messages, setMessages] = useState<Array<{ isUser: boolean; text: string }>>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tts, loading, message, startRecording, stopRecording, recording } = useSpeech();

  // -----------------------------------------------------------------
  // Scroll to bottom
  // -----------------------------------------------------------------
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -----------------------------------------------------------------
  // AI response
  // -----------------------------------------------------------------
  useEffect(() => {
    if (message?.text) {
      setMessages((prev) => [...prev, { isUser: false, text: message.text }]);
    }
  }, [message]);

  // -----------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------
  const sendMessage = () => {
    const text = inputRef.current?.value.trim();
    if (text && !loading) {
      setMessages((prev) => [...prev, { isUser: true, text }]);
      tts(text);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex flex-col h-screen">
      <header>
        <Navbar />
      </header>

      <main className="flex-grow flex flex-col md:flex-row">
        {/* ---------- 3-D AVATAR ---------- */}
        <div className="h-1/2 md:h-full md:w-1/2 bg-gradient-to-br from-purple-100 to-indigo-50 relative">
          <Suspense fallback={<Loader />}>
            <Canvas
              shadows
              camera={{ position: [0, 1.6, 5], fov: 25 }} // <-- camera outside the model
              gl={{ antialias: true }}
              className="w-full h-full"
            >
              <Scenario avatarType="harsh" />
            </Canvas>
          </Suspense>
        </div>

        {/* ---------- CHAT ---------- */}
        <div className="h-1/2 md:h-full md:w-1/2 flex flex-col bg-gray-50">
          <div className="p-4">
            <h2 className="text-xl font-bold text-blue-600">Chat with Harsh</h2>
            <p className="text-sm text-gray-600">
              Science advisor with expertise in emerging technologies
            </p>
          </div>

          {/* messages */}
          <div className="flex-grow overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p class="text-center text-gray-500 py-8">
                Ask Harsh anything about science and technology!
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] p-3 rounded-lg ${
                        msg.isUser
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-200 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>

          {/* input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                className={`p-3 rounded-full transition ${
                  recording
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-200 hover:bg-gray-300"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                  />
                </svg>
              </button>

              <input
                ref={inputRef}
                className="flex-grow bg-white border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Type your message..."
                onKeyDown={handleKeyDown}
              />

              <button
                onClick={sendMessage}
                disabled={loading}
                className={`p-3 rounded-full transition ${
                  loading ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>

            {loading && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full">
                  <div className="mr-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="h-2 w-2 bg-purple-700 rounded-full"></div>
                      <div className="h-2 w-2 bg-purple-700 rounded-full"></div>
                      <div className="h-2 w-2 bg-purple-700 rounded-full"></div>
                    </div>
                  </div>
                  <span>Harsh is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MaxChatPage;