"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Send, ChevronLeft, MessageSquare } from "lucide-react";
import BottomNavBar, { PARENT_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import { useParentData } from "@/lib/hooks/useParentData";
import { useCollection } from "@/lib/hooks/useSchoolData";

// ─── Types & Mock Data ────────────────────────────────────────────────────────

type MessageRole = "teacher" | "parent" | "admin" | "student";

type Contact = {
  id: string;
  name: string;
  initials: string;
  role: MessageRole;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
};

type Message = {
  id: string;
  senderId: string; // "me" or contact id
  text: string;
  time: string;
  status: "sent" | "delivered" | "read";
};

const ROLE_COLORS: Record<MessageRole, { bg: string; text: string; label: string }> = {
  teacher: { bg:"rgba(43,77,90,0.1)",    text:"#2B4D5A", label:"Teacher" },
  admin:   { bg:"rgba(20,20,22,0.08)",   text:"#141416", label:"Admin"   },
  parent:  { bg: "rgba(43,77,90,0.1)",  text: "#2B4D5A", label: "Parent"    },
  student: { bg: "rgba(193,199,203,0.3)", text: "#41484b", label: "Student" },
};

const AVATAR_COLORS = ["#123643","#2B4D5A","#41484b","#393125","#72787b","#51473a"];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function CustomTopAppBar({ initials }: { initials: string }) {
  return (
    <header
      className="fixed top-0 w-full z-40"
      style={{
        background: "rgba(244,242,237,0.88)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(193,199,203,0.2)",
      }}
    >
      <div className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 rounded-[10px] flex flex-col justify-center items-center gap-[3px] active:scale-95 transition-transform"
            style={{ background: "#2B4D5A" }}
          >
            <span className="w-5 h-[2px] bg-white rounded-full" />
            <span className="w-[14px] h-[2px] bg-white rounded-full self-start ml-[3px]" />
            <span className="w-5 h-[2px] bg-white rounded-full" />
          </button>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "1.2rem",
              color: "#141416",
              letterSpacing: "-0.01em",
            }}
          >
            EliteSchool OS
          </span>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium select-none border-2"
          style={{
            background: "#123643",
            borderColor: "rgba(43,77,90,0.3)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParentMessagesPage() {
  const router = useRouter();
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [showConversation, setShowConversation] = useState(false); // mobile only
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { parentProfile } = useParentData();
  const { data: chats } = useCollection<any>(
    parentProfile?.schoolId || null, "chats"
  );

  // Filter chats involving this parent
  const myChats = chats.filter(c =>
    c.participants?.includes(parentProfile?.uid || "")
  );

  const activeContact = myChats.find(c => c.id === activeContactId) ?? null;
  const activeMessages = activeContactId ? (messages[activeContactId] ?? []) : [];
  const filteredContacts = myChats.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parentInitials = parentProfile?.name ? parentProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "PN";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeContactId, messages, showConversation]);

  function handleSend() {
    if (!draft.trim() || !activeContactId) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      senderId: "me",
      text: draft.trim(),
      time: new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }),
      status: "sent",
    };
    setMessages(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] ?? []), newMsg],
    }));
    setDraft("");
  }

  function handleSelectContact(id: string) {
    setActiveContactId(id);
    setShowConversation(true); // mobile: switch to conversation panel
  }

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <CustomTopAppBar initials={parentInitials} />
      
      <div className="pt-20 h-screen flex flex-col w-full" style={{ maxHeight: "100dvh" }}>
        <div className="flex-1 flex overflow-hidden px-4 pb-[88px] gap-4 max-w-5xl mx-auto w-full">
          
          {/* Left panel — contact list */}
          <div className={`
            ${showConversation ? "hidden" : "flex"} lg:flex
            flex-col w-full lg:w-[320px] lg:flex-shrink-0
            rounded-2xl overflow-hidden
          `} style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>

            {/* Panel header */}
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-2xl text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Messages</h2>
              <p className="text-[10px] uppercase tracking-widest text-[#72787b] mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                {myChats.filter(c => c.unread > 0).length} unread
              </p>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#72787b]" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full h-10 rounded-full pl-9 pr-4 text-sm outline-none"
                  style={{
                    background: "#f0eee9",
                    border: "1px solid rgba(193,199,203,0.2)",
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1b1c19",
                  }}
                />
              </div>
            </div>

            {/* Contact rows — scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#c1c7cb]/10 no-scrollbar">
              {myChats.length === 0 && (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-[48px]
                                   text-outline/30 block mb-3">
                    chat_bubble
                  </span>
                  <p className="font-headline text-2xl font-light
                                italic text-primary mb-2">
                    No messages yet
                  </p>
                  <p className="font-body text-sm text-outline font-light">
                    Messages from your school will appear here
                  </p>
                </div>
              )}
              {filteredContacts.map((contact, i) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors"
                  style={{
                    background: activeContactId === contact.id
                      ? "rgba(43,77,90,0.07)"
                      : "transparent",
                  }}
                  onMouseEnter={e => { if (activeContactId !== contact.id)
                    (e.currentTarget as HTMLElement).style.background = "rgba(240,238,233,0.6)"; }}
                  onMouseLeave={e => { if (activeContactId !== contact.id)
                    (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Avatar with online dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ background: AVATAR_COLORS[i % 6], fontFamily: "'DM Sans', sans-serif" }}>
                      {contact.initials || "C"}
                    </div>
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4A6741] border-2 border-white" />
                    )}
                  </div>

                  {/* Name + preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#1b1c19] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{contact.name}</span>
                      <span className="text-[10px] text-[#72787b] flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{contact.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      {/* Role badge */}
                      <span className="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest"
                        style={{ ...(ROLE_COLORS[contact.role as MessageRole] || ROLE_COLORS.teacher), fontFamily: "'DM Mono', monospace" }}>
                        {ROLE_COLORS[contact.role as MessageRole]?.label || "User"}
                      </span>
                      {contact.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#2B4D5A] text-white text-[10px] font-bold flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {contact.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#72787b] truncate mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{contact.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel — conversation */}
          <div className={`
            ${!showConversation ? "hidden" : "flex"} lg:flex
            flex-col flex-1 rounded-2xl overflow-hidden
          `} style={{ background:"rgba(255,255,255,0.55)", border:"1px solid rgba(193,199,203,0.15)" }}>

            {activeContact ? (
              <>
                {/* Conversation header */}
                <div className="flex items-center gap-3 px-5 py-4"
                  style={{ borderBottom: "1px solid rgba(193,199,203,0.15)" }}>

                  {/* Mobile back button */}
                  <button onClick={() => setShowConversation(false)}
                    className="lg:hidden mr-1 active:scale-90 transition-transform">
                    <ChevronLeft size={20} style={{ color: "#2B4D5A" }} />
                  </button>

                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ background: AVATAR_COLORS[myChats.findIndex(c=>c.id===activeContact.id) % 6] || AVATAR_COLORS[0], fontFamily: "'DM Sans', sans-serif" }}>
                      {activeContact.initials || "C"}
                    </div>
                    {activeContact.online && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4A6741] border-2 border-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1b1c19] truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{activeContact.name}</p>
                    <p className="text-[10px] text-[#72787b] truncate" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {activeContact.online ? "Online now" : "Last seen " + activeContact.time}
                    </p>
                  </div>

                  {/* Role badge in header */}
                  <span className="text-[9px] px-2 py-1 rounded-full uppercase tracking-widest hidden sm:inline-block"
                    style={{ ...(ROLE_COLORS[activeContact.role as MessageRole] || ROLE_COLORS.teacher), fontFamily: "'DM Mono', monospace" }}>
                    {ROLE_COLORS[activeContact.role as MessageRole]?.label || "User"}
                  </span>
                </div>

                {/* Messages area — scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
                  {activeMessages.map((msg, i) => {
                    const isMe = msg.senderId === "me";
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl"
                          style={{
                            background: isMe ? "#2B4D5A" : "#f0eee9",
                            borderRadius: isMe
                              ? "1.5rem 1.5rem 0.25rem 1.5rem"
                              : "1.5rem 1.5rem 1.5rem 0.25rem",
                          }}
                        >
                          <p className="text-sm leading-relaxed"
                            style={{ fontFamily: "'DM Sans', sans-serif", color: isMe ? "#ffffff" : "#1b1c19" }}>
                            {msg.text}
                          </p>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                            <span className="text-[9px]"
                              style={{ fontFamily: "'DM Mono', monospace", color: isMe ? "rgba(255,255,255,0.5)" : "#72787b" }}>
                              {msg.time}
                            </span>
                            {isMe && (
                              <span className="text-[9px]"
                                style={{ fontFamily: "'DM Mono', monospace", color: msg.status === "read" ? "#9abdcc" : "rgba(255,255,255,0.4)" }}>
                                {msg.status === "sent" ? "✓" : "✓✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Compose bar */}
                <div className="px-4 py-3"
                  style={{ borderTop: "1px solid rgba(193,199,203,0.15)" }}>
                  <div className="flex items-center gap-3">
                    <input
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder="Type a message…"
                      className="flex-1 h-11 rounded-full px-5 text-sm outline-none transition-all"
                      style={{
                        background: "#f0eee9",
                        border: "1px solid rgba(193,199,203,0.2)",
                        fontFamily: "'DM Sans', sans-serif",
                        color: "#1b1c19",
                      }}
                      onFocus={e => (e.target.style.boxShadow = "0 0 0 2px rgba(43,77,90,0.2)")}
                      onBlur={e => (e.target.style.boxShadow = "none")}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!draft.trim()}
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
                      style={{
                        background: draft.trim() ? "#2B4D5A" : "#e4e2dd",
                      }}
                    >
                      <Send size={16} style={{ color: draft.trim() ? "#ffffff" : "#72787b" }} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <MessageSquare size={40} style={{ color: "#c1c7cb" }} />
                <p className="text-2xl italic text-[#72787b]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Select a conversation</p>
                <p className="text-sm text-[#72787b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Choose a contact from the list to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavBar items={PARENT_NAV_ITEMS} activeHref="/parent/messages" onNavigate={(href) => router.push(href)} />
    </div>
  );
}
