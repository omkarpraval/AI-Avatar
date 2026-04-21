
// import { createContext, useContext, useState, ReactNode } from 'react';
// import { Avatar, avatars } from '../data/avatars';

// interface Message {
//   id: string;
//   sender: 'user' | 'avatar';
//   text: string;
//   timestamp: Date;
// }

// interface AvatarContextType {
//   selectedAvatar: Avatar | null;
//   setSelectedAvatar: (avatar: Avatar) => void;
//   messages: Message[];
//   addMessage: (text: string, sender: 'user' | 'avatar') => void;
// }

// const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

// export function AvatarProvider({ children }: { children: ReactNode }) {
//   const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
//   const [messages, setMessages] = useState<Message[]>([]);

//   const addMessage = (text: string, sender: 'user' | 'avatar') => {
//     const newMessage = {
//       id: Date.now().toString(),
//       sender,
//       text,
//       timestamp: new Date(),
//     };
//     setMessages((prevMessages) => [...prevMessages, newMessage]);
//   };

//   // Mock AI response generator
//   const generateAIResponse = (question: string) => {
//     if (!selectedAvatar) return;
    
//     // Simulate AI thinking
//     setTimeout(() => {
//       let response = "";
      
//       if (question.toLowerCase().includes("hello") || question.toLowerCase().includes("hi")) {
//         response = `Hi there! I'm ${selectedAvatar.name}. ${selectedAvatar.description}. How can I help you today?`;
//       } else if (question.toLowerCase().includes("who are you")) {
//         response = `I'm ${selectedAvatar.name}, ${selectedAvatar.description}. I'm here to assist you!`;
//       } else if (question.toLowerCase().includes("help")) {
//         response = `I'd be happy to help! What specific information are you looking for?`;
//       } else {
//         response = `Thanks for your question! As ${selectedAvatar.name}, I can tell you that I specialize in ${selectedAvatar.description}. Is there something specific about that you'd like to know?`;
//       }
      
//       addMessage(response, 'avatar');
//     }, 1000);
//   };
  
//   // When user sends a message, automatically generate a response
//   const handleUserMessage = (text: string) => {
//     addMessage(text, 'user');
//     generateAIResponse(text);
//   };

//   return (
//     <AvatarContext.Provider
//       value={{
//         selectedAvatar,
//         setSelectedAvatar,
//         messages,
//         addMessage: handleUserMessage,
//       }}
//     >
//       {children}
//     </AvatarContext.Provider>
//   );
// }

// export function useAvatar() {
//   const context = useContext(AvatarContext);
//   if (context === undefined) {
//     throw new Error('useAvatar must be used within an AvatarProvider');
//   }
//   return context;
// }
