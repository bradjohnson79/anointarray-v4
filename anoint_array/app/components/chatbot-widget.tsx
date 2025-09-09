
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bot, Send } from 'lucide-react';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Welcome! How can I help you explore ANOINT Array today?' }
  ]);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, isOpen]);

  // Allow other components to programmatically open the chat
  useEffect(() => {
    const handler = () => setIsOpen(true);
    try { window.addEventListener('anoint:open-chat', handler as any); } catch {}
    return () => { try { window.removeEventListener('anoint:open-chat', handler as any); } catch {} };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message?.trim() || sending) return;
    const userText = message.trim();
    setMessage('');
    setMessages((m) => [...m, { role: 'user', content: userText }]);
    setSending(true);
    try {
      const resp = await fetch('/api/support/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userText }) });
      const data = await resp.json();
      const reply = data?.reply || 'I had trouble reaching the assistant. Please try again.';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-[calc(100vw-2rem)] max-w-[24rem] md:w-80 h-[70vh] md:h-96 mystical-card rounded-lg overflow-hidden shadow-xl flex flex-col"
          >
            {/* Chat Header */}
            <div className="aurora-gradient p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Bot className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-white font-semibold text-sm">ANOINT Assistant</h3>
                  <p className="text-purple-100 text-xs">Healing guidance available</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 p-1 rounded"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 min-h-0 p-4 bg-gray-900 overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent" ref={bodyRef}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex items-start space-x-2 ${m.role === 'user' ? 'justify-end space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 ${m.role === 'user' ? 'bg-blue-600/40' : 'aurora-gradient'} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className={`p-3 rounded-lg max-w-xs ${m.role === 'user' ? 'bg-blue-900/40 text-blue-100' : 'bg-gray-800 text-gray-300'}`}>
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-gray-800 border-t border-gray-700 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about our healing products..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={sending || !message.trim()}
                  className={`aurora-gradient p-2 rounded-lg ${sending || !message.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Send className="h-4 w-4 text-white" />
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 aurora-gradient rounded-full shadow-lg flex items-center justify-center group aurora-glow"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
