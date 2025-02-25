import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  summary: string;
  messages: Message[];
}

interface ConversationHistoryProps {
  conversations: Conversation[];
  onSelect: (id: number) => void;
  className?: string;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ 
  conversations, 
  onSelect,
  className = ""
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <ScrollArea className={`h-screen border-l ${className}`}>
      <div className="p-2 space-y-2">
        {conversations.map((conv) => (
          <div key={conv.id} className="border rounded-lg">
            <div className="flex">
              <Button
                variant="ghost"
                className="flex-1 justify-between text-left p-3"
                onClick={() => toggleExpand(conv.id)}
              >
                <div className="flex items-center space-x-2">
                  {expandedId === conv.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div className="truncate">
                    <div className="font-medium text-sm">{conv.title}</div>
                    <div className="text-xs text-gray-500 truncate">{conv.summary}</div>
                  </div>
                </div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 hover:bg-gray-100"
                onClick={() => onSelect(conv.id)}
              >
                <div className="text-xs text-blue-600">Load</div>
              </Button>
            </div>
            {expandedId === conv.id && (
              <div className="border-t p-3 bg-gray-50/80 backdrop-blur-sm">
                {conv.messages.map((msg, idx) => (
                  <div key={idx} className="mb-3 last:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {msg.role === 'user' ? '👤 You' : '🤖 AI'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap pl-2 border-l-2 border-gray-200">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
