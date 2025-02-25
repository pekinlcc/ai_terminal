import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  isFirstMessage: boolean;
  modelStatus?: string;
  selectedModel?: string;
  messages?: Message[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onSendMessage, 
  isFirstMessage, 
  modelStatus,
  selectedModel,
  messages = []
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      setIsSubmitting(true);
      try {
        await onSendMessage(message);
      } finally {
        setIsSubmitting(false);
        setMessage('');
      }
    }
  };

  return (
    <div className={`w-full ${isFirstMessage ? 'h-screen flex items-center justify-center' : 'h-full flex flex-col'}`}>
      {!isFirstMessage && messages && messages.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}>
                {msg.content.split('```').map((part, idx) => {
                  if (idx % 2 === 0) {
                    return (
                      <span key={idx} className="whitespace-pre-wrap">
                        {part.split('\n').map((line, lineIdx) => (
                          <span key={lineIdx}>
                            {line}
                            {lineIdx < part.split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </span>
                    );
                  }
                  
                  const [lang, ...code] = part.split('\n');
                  return (
                    <div key={idx} className="relative group">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg my-2 overflow-x-auto shadow-lg transition-all duration-200 hover:shadow-xl">
                        {lang && (
                          <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-md">
                            {lang}
                          </div>
                        )}
                        <code className="font-mono text-sm leading-relaxed">{code.join('\n')}</code>
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <Card className={`${isFirstMessage ? 'w-full max-w-3xl p-8 shadow-lg transition-all duration-300 hover:shadow-xl' : 'w-full p-4 border-t'}`}>
        {isFirstMessage && (
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Desktop Assistant</h1>
            <p className="text-xl text-gray-600 mb-6">How can I help you today?</p>
            <div className="space-y-6 max-w-2xl mx-auto">
              {modelStatus === 'error' && (
                <div className="text-center space-y-4 bg-red-50/80 backdrop-blur-sm p-8 rounded-2xl border border-red-100 shadow-lg animate-in fade-in duration-500">
                  <div className="text-red-600 font-semibold text-lg flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Ollama is not running or accessible
                  </div>
                  <div className="text-sm text-gray-700">
                    Please follow these steps:
                    <ol className="list-none mt-4 space-y-4 text-left max-w-md mx-auto">
                      <li className="flex items-center p-3 bg-white/80 rounded-lg shadow-sm transition-all hover:shadow-md">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-3 text-sm font-medium">1</span>
                        Install Ollama from <a href="https://ollama.com/download" className="text-blue-600 hover:text-blue-700 hover:underline ml-1 font-medium" target="_blank" rel="noopener noreferrer">ollama.com/download</a>
                      </li>
                      <li className="flex items-center p-3 bg-white/80 rounded-lg shadow-sm transition-all hover:shadow-md">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-3 text-sm font-medium">2</span>
                        Start the Ollama service
                      </li>
                      <li className="flex items-center p-3 bg-white/80 rounded-lg shadow-sm transition-all hover:shadow-md">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-3 text-sm font-medium">3</span>
                        Install a model using: <code className="bg-blue-50 px-3 py-1 rounded-lg ml-2 font-mono text-sm border border-blue-100">ollama pull llama2</code>
                      </li>
                      <li className="flex items-center p-3 bg-white/80 rounded-lg shadow-sm transition-all hover:shadow-md">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-3 text-sm font-medium">4</span>
                        Refresh this page
                      </li>
                    </ol>
                  </div>
                </div>
              )}
              {modelStatus === 'no_models' && (
                <div className="text-center space-y-2">
                  <div className="text-amber-500 font-medium">No AI models are installed</div>
                  <div className="text-sm text-gray-600">
                    Install a model using: <code className="bg-gray-100 px-2 py-1 rounded">ollama pull llama2</code>
                  </div>
                </div>
              )}
              {modelStatus === 'multiple_models' && !selectedModel && (
                <div className="text-blue-500 text-sm">Please select an AI model to begin.</div>
              )}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isFirstMessage ? "Type your message here..." : "Send a message..."}
            className="flex-1 h-14 text-lg rounded-xl shadow-sm transition-shadow focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          <Button 
            type="submit" 
            size="lg" 
            disabled={isSubmitting}
            className={`group h-14 w-14 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all duration-300 ${!isSubmitting && 'hover:scale-105'}`}
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Send className="h-6 w-6 transition-transform group-hover:translate-x-1 duration-300" />
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};
