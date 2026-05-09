"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { useSchoolData } from "@/lib/hooks/useSchoolData";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  useAuthGuard("admin");

  const { schoolId, schoolName } = useSchoolData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;

    const userMessage: Message = {
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-secret": process.env.NEXT_PUBLIC_API_SECRET!,
        },
        body: JSON.stringify({ prompt: query, schoolId }),
      });

      if (!res.ok) {
        throw new Error("AI request failed");
      }

      const data = await res.json();
      const aiResponse: string =
        data?.response ?? "I could not generate a response. Please try again.";

      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("AI Assistant error:", message);
      toast.error("Could not reach the AI assistant. Please try again.");
      // Remove the user message if the request failed
      setMessages((prev) => prev.filter((m) => m !== userMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar activeHref="/admin/ai-assistant" />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="AI Assistant" subtitle="Powered by Gemini" />

        <main className="flex-1 flex flex-col px-6 py-8 max-w-3xl mx-auto w-full">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">
                  auto_awesome
                </span>
              </div>
              <h2 className="font-headline text-2xl font-light text-on-surface">
                Ask anything about {schoolName || "your school"}
              </h2>
              <p className="font-body text-sm text-on-surface-variant max-w-sm">
                Query student records, fee balances, attendance trends, and more
                using plain English.
              </p>
              <div className="grid grid-cols-1 gap-2 mt-4 w-full max-w-sm">
                {[
                  "How many students are unpaid this term?",
                  "Which class has the lowest attendance?",
                  "Show me students in S.3A",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left px-4 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors font-body text-sm text-on-surface-variant"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          <div className="flex-1 space-y-4 overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl font-body text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-surface-container text-on-surface rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.role === "user"
                        ? "text-white/60 text-right"
                        : "text-outline"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <GlassCard padding="p-3" className="mt-6 sticky bottom-0">
            <div className="flex gap-3 items-end">
              <textarea
                rows={1}
                placeholder="Ask about your school data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent resize-none font-body text-sm text-on-surface placeholder:text-outline focus:outline-none min-h-[40px] max-h-[120px] py-2"
              />
              <EliteButton
                variant="primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="rounded-xl h-10 px-4 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </EliteButton>
            </div>
          </GlassCard>

        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/ai-assistant" />
    </div>
  );
}
