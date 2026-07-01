import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import api from '../services/api';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: '👋 Hello! I am your AI Travel Assistant. Ask me about flight recommendations, baggage limits, or cancellation rules!' },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/api/chatbot/chat', { message: userText });
      const reply = response.data.reply || "I'm having trouble understanding. Can you rephrase?";
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I am offline. Please try again later.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 text-slate-800 dark:text-gray-100">
      {/* Chat Bubble Icon */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform duration-250 cursor-pointer border-none"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="glass-card flex h-[500px] w-90 flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 border border-slate-200 dark:border-white/10 md:w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-600 to-yellow-600 dark:from-brand-900 dark:to-brand-800 p-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center border border-white/25">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-display text-sm font-bold text-white">Aura Travel Assistant</h3>
                <span className="text-[10px] text-white/95 flex items-center gap-1 font-sans font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Grid */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] ${
                  m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    m.sender === 'user' ? 'bg-amber-600' : 'bg-slate-200 dark:bg-brand-800 border border-slate-300 dark:border-white/10'
                  }`}
                >
                  {m.sender === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  )}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs text-left leading-relaxed whitespace-pre-line shadow-sm border ${
                    m.sender === 'user'
                      ? 'bg-amber-500 text-brand-900 font-semibold border-amber-400 rounded-tr-none'
                      : 'bg-white dark:bg-brand-900/90 text-slate-800 dark:text-gray-200 border-slate-200 dark:border-white/5 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 mr-auto max-w-[80%]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-brand-800 border border-slate-300 dark:border-white/10">
                  <Bot className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                </div>
                <div className="bg-white dark:bg-brand-900/90 text-slate-500 dark:text-gray-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-1 border border-slate-200 dark:border-white/5">
                  <span>Assistant is thinking</span>
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick recommendations panel */}
          <div className="p-2 bg-slate-100/80 dark:bg-slate-900/20 border-t border-slate-200 dark:border-white/5 flex gap-1.5 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setInput("Baggage limits?")}
              className="glass px-2.5 py-1 rounded-full text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer border border-slate-200 dark:border-white/5"
            >
              💼 Baggage Rule
            </button>
            <button
              onClick={() => setInput("Cancel my booking")}
              className="glass px-2.5 py-1 rounded-full text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer border border-slate-200 dark:border-white/5"
            >
              ❌ Cancellation
            </button>
            <button
              onClick={() => setInput("Recommend cheapest flights")}
              className="glass px-2.5 py-1 rounded-full text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer border border-slate-200 dark:border-white/5"
            >
              ✈️ Cheap Flights
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-brand-900 border-t border-slate-200 dark:border-white/10 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 dark:focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 text-brand-900 transition-colors disabled:opacity-55 cursor-pointer border-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
