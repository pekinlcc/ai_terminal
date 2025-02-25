import { useState, useEffect } from 'react';
import { ChatInterface } from './components/chat/ChatInterface';
import { ConversationHistory } from './components/history/ConversationHistory';
import { ModelSelector } from './components/models/ModelSelector';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Message {
  role: string;
  content: string;
}

function App() {
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState<string>('');
  // Status message is now handled directly in the messages array
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<{
    id: number;
    title: string;
    summary: string;
    messages: Message[];
  }[]>([]);

  // Load conversations on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/conversations`)
      .then(res => res.json())
      .then(data => setConversations(data))
      .catch(error => console.error('Failed to load conversations:', error));
  }, []);

  useEffect(() => {
    // Fetch available models
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/models`)
      .then(res => res.json())
      .then(data => {
        console.log('Model API response:', data);
        setModelStatus(data.status);
        
        if (data.models && data.models.length > 0) {
          const modelNames = data.models.map((m: any) => m.name);
          setModels(modelNames);
          
          if (data.status === 'single_model') {
            setSelectedModel(modelNames[0]);
            setIsFirstMessage(false);
          }
        }

        // Set initial system message
        setMessages([{
          role: 'system',
          content: data.message || 'Welcome to AI Desktop Assistant'
        }]);
      })
      .catch(error => {
        console.error('Model API error:', error);
        setModelStatus('error');
        setMessages([{
          role: 'system',
          content: 'Failed to connect to the AI service. Please try again.'
        }]);
      });
  }, []);

  const handleSendMessage = (message: string) => {
    if (!selectedModel && modelStatus === 'multiple_models') {
      setMessages(prev => [...prev, { role: 'system', content: 'Please select a model before sending messages.' }]);
      return;
    }
    if (modelStatus === 'no_models' || modelStatus === 'error') {
      setMessages(prev => [...prev, { role: 'system', content: 'Cannot send messages while the AI service is unavailable.' }]);
      return;
    }
    
    if (isFirstMessage) {
      setIsFirstMessage(false);
    }
    if (modelStatus === 'error') {
      window.open('https://ollama.com/download', '_blank');
      return;
    }

    // Add user message immediately
    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);

    try {
      const wsUrl = `ws://127.0.0.1:8000/ws`;
      console.log("WebSocket connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      const assistantMessage = { role: 'assistant', content: '' };
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        ws.send(JSON.stringify({
          model: selectedModel,
          content: message
        }));
        setMessages(prev => [...prev, assistantMessage]);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket received:", data);
        
        if (data.type === 'stream') {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              // Handle code block detection
              if (data.content.includes('```')) {
                const isStartingCodeBlock = !lastMessage.content.includes('```');
                if (isStartingCodeBlock) {
                  lastMessage.content += '```python\n' + data.content.replace('```', '');
                } else {
                  lastMessage.content += data.content;
                }
              } else {
                lastMessage.content += data.content;
              }
            } else {
              newMessages.push({ role: 'assistant', content: data.content });
            }
            return newMessages;
          });
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.content);
          setMessages(prev => [...prev, { role: 'system', content: `Error: ${data.content}` }]);
        } else if (data.type === 'end') {
          // Save conversation
          const newConversation = {
            title: message.slice(0, 30) + '...',
            summary: 'Chat with ' + selectedModel,
            messages: [...messages]
          };
          
          // Save conversation to backend
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConversation)
          })
            .then(res => res.json())
            .then(savedConv => {
              setConversations(prev => {
                // Remove any existing conversations with the same title
                const filtered = prev.filter(c => c.title !== savedConv.title);
                return [...filtered, savedConv];
              });
            })
            .catch(error => {
              console.error('Failed to save conversation:', error);
            });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Failed to connect to the chat service. Please try again.'
        }]);
      };
    } catch (error) {
      console.error('Connection error:', error);
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: 'Failed to establish connection. Please try again.' 
      }]);
    }
  };

  const handleExit = () => {
    // Send exit command to backend which will close the window
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/exit`, { method: 'POST' })
      .catch(error => console.error('Failed to exit:', error));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex items-center p-4 border-b bg-white">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExit} 
          className="mr-4"
        >
          <X className="h-4 w-4 mr-2" />
          Exit to Desktop
        </Button>
        {!isFirstMessage && (
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
          />
        )}
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 ${isFirstMessage ? 'flex items-center justify-center bg-gray-50' : 'bg-white'}`}>
          <ChatInterface
            onSendMessage={handleSendMessage}
            isFirstMessage={isFirstMessage}
            modelStatus={modelStatus}
            selectedModel={selectedModel}
            messages={messages}
          />
        </div>
        <div className={`${isFirstMessage ? 'hidden' : 'w-[10%] border-l bg-white'}`}>
          <ConversationHistory
            conversations={conversations.filter((c, i, arr) => 
              arr.findIndex(conv => conv.title === c.title) === i
            )}
            onSelect={(id) => {
              const conv = conversations.find(c => c.id === id);
              if (conv) {
                setMessages(conv.messages);
                setIsFirstMessage(false);
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default App;
