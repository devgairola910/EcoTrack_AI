import React, { useState, useRef, useEffect } from "react";
import { 
  Send, Leaf, User, MessageSquare, ShieldAlert,
  ArrowRight, Award, Zap, HelpCircle
} from "lucide-react";
import { useEco } from "../context/EcoContext";
import { api } from "../services/api";
import type { ChatMessage } from "../services/api";

export const AIChatAssistant: React.FC = () => {
  const { assessmentInput, assessmentResult, token } = useEco();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your EcoTrack AI Coach. 🌍\n\nI can answer questions about lowering your footprint, renewable energy setups, sustainable diet adjustments, or how our points systems work. What would you like to discuss today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the message feed
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Predefined Quick-Prompts
  const SUGGESTED_PROMPTS = [
    { text: "How can I lower my car emissions?", key: "ev" },
    { text: "How does solar power help my score?", key: "solar" },
    { text: "Explain the 2-ton Paris safety budget.", key: "paris" },
    { text: "What actions earn the most points?", key: "points" }
  ];

  // Send a message
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: textToSend
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage];
      const activeToken = token || "local_fallback_token";
      
      const reply = await api.sendChatMessage(
        chatHistory,
        assessmentInput,
        activeToken
      );

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setIsOfflineMode(!token);
    } catch (err) {
      console.error("Failed to send chat message:", err);
      setIsOfflineMode(true);
      
      // Fallback message
      setMessages(prev => [
        ...prev, 
        { 
          role: "assistant", 
          content: "Sorry, I encountered an issue matching your query. Let's try again! You can ask me about transportation tips, renewable energy, composting, or dietary adjustments." 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(input);
    }
  };

  // Format message text with bold tags and linebreaks
  const formatMessageContent = (text: string) => {
    return text.split("\n").map((paragraph, idx) => {
      // Simple bold replacements (**text**)
      const parts = paragraph.split(/\*\*([^*]+)\*\*/g);
      const formatted = parts.map((part, i) => {
        // Even indices are normal text, odd indices are bolded
        return i % 2 === 1 ? <strong key={i} className="text-white font-extrabold">{part}</strong> : part;
      });

      return (
        <p key={idx} className="mb-2 last:mb-0 leading-relaxed text-xs sm:text-sm">
          {formatted}
        </p>
      );
    });
  };

  // Profile context variables
  const score = assessmentResult?.eco_score || 0;
  const footprint = assessmentResult?.emissions.total || 0;
  const profileType = assessmentResult?.profile_type || "N/A";
  
  // Find highest category
  let highestCategory = "N/A";
  if (assessmentResult) {
    const ems = assessmentResult.emissions;
    const categories = [
      { name: "Transport", val: ems.transport },
      { name: "Home Energy", val: ems.energy },
      { name: "Diet & Food", val: ems.diet },
      { name: "Consumption", val: ems.consumption }
    ];
    categories.sort((a, b) => b.val - a.val);
    highestCategory = categories[0].name;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 bg-gradient-glow min-h-[85vh] flex flex-col">
      
      {/* Header and alerts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
            <span>AI Carbon Coach</span>
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Get instant, context-aware coaching advice regarding your carbon footprint reduction.
          </p>
        </div>

        {isOfflineMode && (
          <div className="flex items-center space-x-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl px-3.5 py-1.5 mt-4 md:mt-0">
            <ShieldAlert className="h-4 w-4" />
            <span>Local Chat Mode Active</span>
          </div>
        )}
      </div>

      {/* Main panel layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow items-stretch">
        
        {/* Chat Window Panel */}
        <div className="lg:col-span-3 glass-panel border border-white/5 rounded-3xl p-4 sm:p-6 flex flex-col justify-between h-[600px] relative">
          
          {/* Scrollable message thread */}
          <div className="flex-grow overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-thin">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div 
                  key={index} 
                  className={`flex items-start space-x-3 max-w-[85%] ${
                    isAssistant ? "mr-auto" : "ml-auto flex-row-reverse space-x-reverse"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 ${
                    isAssistant 
                      ? "bg-brand-500/10 border-brand-500/20 text-brand-400" 
                      : "bg-dark-900 border-white/10 text-dark-300"
                  }`}>
                    {isAssistant ? <Leaf className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  {/* Bubble content */}
                  <div className={`p-4 rounded-2xl border ${
                    isAssistant 
                      ? "bg-white/5 border-white/5 text-dark-200" 
                      : "bg-brand-600/20 border-brand-500/30 text-white font-medium"
                  }`}>
                    {formatMessageContent(msg.content)}
                  </div>
                </div>
              );
            })}

            {/* Typing Loader */}
            {isLoading && (
              <div className="flex items-start space-x-3 mr-auto max-w-[80%]">
                <div className="h-8 w-8 rounded-full border bg-brand-500/10 border-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Leaf className="h-4 w-4 animate-bounce" />
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-dark-400 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions Box (only shows when user is not typing/waiting) */}
          {!isLoading && messages.length <= 2 && (
            <div className="mb-4 pt-3 border-t border-white/5">
              <span className="text-[10px] font-bold text-dark-500 uppercase tracking-wider block mb-2">Suggested questions:</span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt.text)}
                    className="text-xxs bg-white/5 hover:bg-brand-500/10 hover:text-brand-400 border border-white/5 hover:border-brand-500/20 px-3 py-2 rounded-xl text-dark-300 transition duration-200 flex items-center space-x-1"
                  >
                    <span>{prompt.text}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Input Bar */}
          <div className="flex items-center space-x-2 pt-3 border-t border-white/5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask your carbon coach a question..."
              className="flex-grow bg-dark-950/60 border border-white/10 focus:border-brand-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-dark-100 placeholder-dark-500 outline-none transition focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="bg-brand-600 hover:bg-brand-500 disabled:bg-dark-900 disabled:text-dark-600 disabled:cursor-not-allowed text-white p-3 rounded-xl transition shadow shadow-brand-600/20 shrink-0"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>

        </div>

        {/* Coach Context Sidebar */}
        <div className="space-y-6">
          {/* User profile details overview */}
          <div className="glass-panel border border-white/5 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
            <div>
              <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-brand-400" />
                <span>Coach Context</span>
              </h3>
              
              <div className="space-y-4">
                {/* Eco Score badge */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-brand-400" />
                    <span className="text-xs text-dark-300">Eco Score</span>
                  </div>
                  <span className="text-sm font-bold text-brand-400">{score}/100</span>
                </div>

                {/* Footprint badge */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-brand-400">CO₂</span>
                    <span className="text-xs text-dark-300">Annual Footprint</span>
                  </div>
                  <span className="text-xs font-bold text-white">{Math.round(footprint)} kg</span>
                </div>

                {/* Profile category badge */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-brand-400" />
                    <span className="text-xs text-dark-300">Eco Profile</span>
                  </div>
                  <span className="text-xs font-bold text-white text-right">{profileType}</span>
                </div>

                {/* Highest Category */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="h-4 w-4 text-brand-400" />
                    <span className="text-xs text-dark-300">Highest Category</span>
                  </div>
                  <span className="text-xs font-bold text-rose-400">{highestCategory}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mt-6">
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block mb-1">Coach Tip</span>
              <p className="text-xxs text-dark-400 leading-relaxed">
                Your primary target category is **{highestCategory}**. Focus your chat queries on this topic to learn targeted, high-impact reduction strategies!
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
