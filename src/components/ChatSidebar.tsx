"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Smile, MessageSquare } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isSystem?: boolean;
  timestamp: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserName: string;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentUserName,
}: ChatSidebarProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 sm:w-96 bg-cinema-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white text-sm">Room Chat & Events</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No messages yet</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Chat while watching your video!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentUserName || msg.sender === "You";

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-slate-500 mb-0.5 px-1">{msg.sender}</span>
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs break-words shadow-sm ${
                    isMe
                      ? "bg-brand-600 text-white rounded-tr-none"
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Tray */}
      <div className="px-4 py-2 border-t border-slate-800/60 flex items-center space-x-1.5 bg-slate-950/40">
        {["🍿", "❤️", "😂", "🔥", "👏", "🎉"].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleAddEmoji(emoji)}
            className="text-base p-1 hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-cinema-950">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white transition-all shadow-md shadow-brand-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
