import { useRef } from "react";
import { useSpeech } from "../hooks/useSpeech";

export const ChatInterface = ({ hidden, ...props }) => {
  const input = useRef();
  const { tts, loading, message, startRecording, stopRecording, recording } = useSpeech();

  const sendMessage = () => {
    const text = input.current.value;
    if (!loading && !message) {
      tts(text);
      input.current.value = "";
    }
  };
  
  if (hidden) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 p-4 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full">
        {/* Chat status indicator */}
        {loading && (
          <div className="mb-4 bg-white bg-opacity-90 p-3 rounded-full shadow-md inline-block">
            <div className="flex items-center">
              <div className="animate-pulse w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
              <span className="text-purple-700 font-medium">AI is thinking...</span>
            </div>
          </div>
        )}
        
        {/* Chat input */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white rounded-full shadow-lg p-2">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`${
              recording 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-gray-200 hover:bg-gray-300"
            } text-gray-700 p-3 rounded-full transition duration-300 ${
              loading || message ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading || message}
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
            className="w-full py-3 px-4 text-gray-700 focus:outline-none"
            placeholder="Type a message..."
            ref={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          
          <button
            disabled={loading || message}
            onClick={sendMessage}
            className={`bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition duration-300 ${
              loading || message ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};