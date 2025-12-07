import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/gemini';
import { LessonContainer } from './LessonContainer';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const ChatLesson: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I am your AI helper. You can ask me anything. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        // Prepare history for API
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await sendChatMessage(history, input);
        setMessages(prev => [...prev, { role: 'model', text: responseText || "I'm sorry, I didn't catch that." }]);
    } catch (e) {
        setMessages(prev => [...prev, { role: 'model', text: "I'm having a little trouble thinking right now. Please try again." }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <LessonContainer title="Lesson 2: Asking Questions" description="AI is like a very smart librarian. Type a question below to practice.">
      <div className="flex-1 w-full flex flex-col space-y-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-3xl text-xl leading-snug ${
              m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-900 rounded-bl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-slate-200 text-slate-500 p-5 rounded-3xl rounded-bl-none text-xl">
               Thinking...
             </div>
           </div>
        )}
        <div ref={endRef} />
      </div>
      
      <div className="w-full flex space-x-2">
        <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type here..."
            className="flex-1 p-4 text-xl border-2 border-slate-300 rounded-2xl focus:border-blue-500 focus:outline-none bg-slate-800 text-white font-semibold placeholder-slate-400"
        />
        <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-8 rounded-2xl font-bold text-xl disabled:opacity-50"
        >
            Send
        </button>
      </div>
    </LessonContainer>
  );
};