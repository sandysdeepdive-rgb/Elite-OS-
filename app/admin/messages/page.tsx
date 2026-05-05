"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteInput from "@/components/ui/EliteInput";
import EliteButton from "@/components/ui/EliteButton";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { useSchoolData, useCollection, useChatCollection } from "@/lib/hooks/useSchoolData";
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";

interface Chat {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
}

export default function AdminMessagesPage() {
  const { schoolId, schoolName, adminName } = useSchoolData();
  const { data: chats, loading: chatsLoading, error: chatsError } = useChatCollection<Chat>(schoolId, auth.currentUser?.uid || null);
  
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  
  const [showNewChat, setShowNewChat] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    if (!showNewChat || !schoolId) return;
    
    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      try {
        // Fetch teachers
        const teachersRef = collection(db, "schools", schoolId, "teachers");
        const teachersSnapshot = await getDocs(teachersRef);
        const teachersList = teachersSnapshot.docs
          .map(doc => doc.data() as any)
          .filter(t => t.teacherUid)
          .map(t => ({
            id: t.teacherUid,
            uid: t.teacherUid,
            name: t.name,
            role: "teacher",
            email: t.email
          }));

        // Fetch parents from students
        const studentsRef = collection(db, "schools", schoolId, "students");
        const studentsSnapshot = await getDocs(studentsRef);
        const parentsList = studentsSnapshot.docs
          .map(doc => doc.data() as any)
          .filter(s => s.parentUid)
          .map(s => ({
            id: s.parentUid,
            uid: s.parentUid,
            name: s.parentName || `Parent of ${s.name}`,
            role: "parent",
            studentName: s.name
          }));
          
        // Deduplicate parents
        const uniqueParents = Array.from(new Map(parentsList.map(p => [p.uid, p])).values());
          
        setRecipients([...teachersList, ...uniqueParents]);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error("Error fetching recipients:", error);
      } finally {
        setLoadingRecipients(false);
      }
    };
    
    fetchRecipients();
  }, [showNewChat, schoolId]);

  const handleStartChat = async () => {
    if (!selectedRecipient || !newMessage.trim() || !schoolId || !auth.currentUser) return;
    
    try {
      // 1. Create chat document
      const chatRef = await addDoc(collection(db, "schools", schoolId, "chats"), {
        participants: [auth.currentUser.uid, selectedRecipient],
        updatedAt: serverTimestamp(),
        lastMessage: newMessage.trim(),
      });
      
      // 2. Add first message
      await addDoc(collection(db, "schools", schoolId, "chats", chatRef.id, "messages"), {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      
      setShowNewChat(false);
      setNewMessage("");
      setSelectedRecipient("");
      setActiveChat(chatRef.id);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("Error starting chat:", error);
    }
  };

  const { data: messagesRaw, error: messagesError } = useCollection<Message>(
    activeChat ? `${schoolId ? schoolId : 'none'}` : null,
    activeChat ? `chats/${activeChat}/messages` : "none"
  );
  
  const anyError = chatsError || messagesError;
  
  // useCollection orders by desc, so we reverse to show oldest first at top
  const messages = [...messagesRaw].reverse();

  const selectedChat = chats.find((c) => c.id === activeChat);

  const handleSendMessage = async () => {
    if (!schoolId || !activeChat || !messageText.trim()) return;
    
    const text = messageText.trim();
    setMessageText("");

    const timeString = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    // Add message
    await addDoc(
      collection(db, "schools", schoolId, "chats", activeChat, "messages"),
      {
        senderId: "admin",
        text,
        time: timeString,
        isMe: true,
        createdAt: serverTimestamp(),
      }
    );

    // Update chat last message
    await updateDoc(
      doc(db, "schools", schoolId, "chats", activeChat),
      {
        lastMessage: text,
        time: timeString,
        createdAt: serverTimestamp(), // to bump it to top
      }
    );
  };

  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/messages"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Messages" subtitle="Communication Center" />
        <div className="px-4 lg:px-6 max-w-6xl mx-auto w-full pt-6">
          <CollectionErrorBanner error={anyError} />
        </div>
        <main className="flex-1 px-4 lg:px-6 py-6 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)]">
          
          {/* Left Column: Chat List */}
          <div className={`w-full lg:w-1/3 flex flex-col gap-4 ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
            <div>
              <h2 className="font-headline text-3xl font-light italic text-primary">
                Messages
              </h2>
              <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
                Communicate with parents and staff
              </p>
            </div>

            <GlassCard padding="p-4" className="flex-1 flex flex-col min-h-0">
              <div className="mb-4">
                <EliteInput
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<span className="material-symbols-outlined text-[20px]">search</span>}
                />
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {chatsLoading ? (
                  <p className="text-center text-outline text-sm py-4">Loading chats...</p>
                ) : filteredChats.length === 0 ? (
                  <p className="text-center text-outline text-sm py-4">No chats found</p>
                ) : (
                  filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setActiveChat(chat.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
                        activeChat === chat.id
                          ? "bg-primary-container/10 border border-primary-container/20"
                          : "hover:bg-surface-container-low border border-transparent"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                        <span className="font-headline text-sm text-primary-container">
                          {chat.avatar || chat.name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="font-body text-sm font-medium text-on-surface truncate pr-2">
                            {chat.name}
                          </span>
                          <span className="font-label text-[9px] text-outline flex-shrink-0">
                            {chat.time}
                          </span>
                        </div>
                        <p className="font-label text-[10px] text-primary mb-1">
                          {chat.role}
                        </p>
                        <p className="font-body text-xs text-outline truncate font-light">
                          {chat.lastMessage}
                        </p>
                      </div>
                      {chat.unread > 0 && (
                        <div className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center font-label text-[9px] flex-shrink-0 mt-2">
                          {chat.unread}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Active Chat */}
          <div className={`w-full lg:w-2/3 flex flex-col ${!activeChat ? 'hidden lg:flex' : 'flex'}`}>
            <GlassCard padding="p-0" className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-outline-variant/20 flex items-center gap-3 bg-surface-container-lowest/50">
                    <button 
                      className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-outline"
                      onClick={() => setActiveChat(null)}
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-headline text-sm text-primary-container">
                        {selectedChat.avatar || selectedChat.name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-body text-sm font-medium text-on-surface">
                        {selectedChat.name}
                      </h3>
                      <p className="font-label text-[10px] text-outline">
                        {selectedChat.role}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-outline transition-colors">
                        <span className="material-symbols-outlined text-[18px]">call</span>
                      </button>
                      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-outline transition-colors">
                        <span className="material-symbols-outlined text-[18px]">more_vert</span>
                      </button>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex justify-center mb-6">
                      <span className="px-3 py-1 bg-surface-container-low rounded-full font-label text-[9px] text-outline uppercase tracking-[0.1em]">
                        Today
                      </span>
                    </div>

                    {messages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="font-body text-sm text-outline font-light">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.isMe ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-2xl ${
                              msg.isMe
                                ? "bg-primary-container text-white rounded-tr-sm"
                                : "bg-surface-container-low text-on-surface rounded-tl-sm"
                            }`}
                          >
                            <p className="font-body text-sm font-light leading-relaxed">
                              {msg.text}
                            </p>
                          </div>
                          <span className="font-label text-[9px] text-outline mt-1 px-1">
                            {msg.time}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-outline-variant/20 bg-surface-container-lowest/50">
                    <div className="flex items-center gap-2">
                      <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low text-outline transition-colors flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px]">attach_file</span>
                      </button>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendMessage();
                          }}
                          className="w-full h-12 bg-surface-container-low rounded-full pl-4 pr-12 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container text-outline transition-colors">
                          <span className="material-symbols-outlined text-[18px]">mood</span>
                        </button>
                      </div>
                      <EliteButton 
                        variant="primary" 
                        className="!w-12 !h-12 !p-0 rounded-full flex items-center justify-center flex-shrink-0"
                        disabled={!messageText.trim()}
                        onClick={handleSendMessage}
                      >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </EliteButton>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[32px] text-outline">
                      chat
                    </span>
                  </div>
                  <h3 className="font-headline text-xl font-light text-on-surface mb-2">
                    Your Messages
                  </h3>
                  <p className="font-body text-sm text-outline font-light max-w-xs">
                    Select a conversation from the list to view messages or start a new chat.
                  </p>
                </div>
              )}
            </GlassCard>
          </div>
        </main>

        {/* Floating Action Button for New Chat */}
        <button 
          onClick={() => setShowNewChat(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 lg:hidden"
        >
          <span className="material-symbols-outlined text-[24px]">edit_square</span>
        </button>
        <button 
          onClick={() => setShowNewChat(true)}
          className="hidden lg:flex absolute bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        >
          <span className="material-symbols-outlined text-[24px]">edit_square</span>
        </button>

      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/messages" />

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md" padding="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline text-2xl font-light italic text-primary">
                New Message
              </h3>
              <button
                onClick={() => setShowNewChat(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">To:</label>
                <select 
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  disabled={loadingRecipients}
                >
                  <option value="" disabled>Select recipient...</option>
                  {loadingRecipients ? (
                    <option disabled>Loading...</option>
                  ) : (
                    recipients.map(r => (
                      <option key={r.id} value={r.id}>{r.name || r.email} ({r.role})</option>
                    ))
                  )}
                </select>
              </div>
              
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">Message:</label>
                <textarea 
                  className="w-full h-32 bg-surface-container-low rounded-xl p-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none resize-none"
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end pt-2">
                <EliteButton 
                  variant="primary" 
                  onClick={handleStartChat}
                  disabled={!selectedRecipient || !newMessage.trim()}
                >
                  <span className="material-symbols-outlined text-[18px] mr-2">send</span>
                  Send Message
                </EliteButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
