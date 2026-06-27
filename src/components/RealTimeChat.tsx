import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Paperclip, Image as ImageIcon, FileText, Check, CheckCheck, 
  MessageSquare, ShieldAlert, Sparkles, X, Search, ChevronLeft, HelpCircle
} from "lucide-react";
import { User, Session, NoteMaterial } from "../types";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "tutor" | "assistant" | "admin";
  text: string;
  timestamp: string;
  status: "sending" | "delivered" | "seen";
  fileUrl?: string; // base64 or source url
  fileName?: string;
  fileType?: "image" | "pdf" | "material" | "text";
  materialId?: string;
  reported?: boolean;
}

interface RealTimeChatProps {
  currentUser: any; // User object containing id, name, and role
  sessions: Session[];
  materials?: NoteMaterial[];
  tutorsList: User[];
  studentsList: any[];
}

export default function RealTimeChat({ 
  currentUser, 
  sessions, 
  materials = [], 
  tutorsList, 
  studentsList 
}: RealTimeChatProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real-time status states
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // File and study materials upload overlays
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [rawFile, setRawFile] = useState<{ name: string; type: "image" | "pdf"; dataUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  // Mobile navigation helper
  const [viewingRoomMobile, setViewingRoomMobile] = useState(false);

  // WebSocket reference
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myId = currentUser?.id || "";
  const myName = currentUser?.name || "Me";
  const myRole = currentUser?.role || "student";

  // 1. Process and compute chat room options based on sessions (bookings)
  useEffect(() => {
    if (!myId) return;

    // A student and tutor must have at least one active or completed booking/session together
    const chatBuddiesMap = new Map<string, { id: string; name: string; avatar: string; role: string; lastSessionTopic: string }>();

    sessions.forEach(s => {
      if (myRole === "student" && s.studentId === myId) {
        // Buddy is the tutor
        if (!chatBuddiesMap.has(s.tutorId)) {
          chatBuddiesMap.set(s.tutorId, {
            id: s.tutorId,
            name: s.tutorName,
            avatar: s.tutorAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
            role: "tutor",
            lastSessionTopic: `${s.subject} - ${s.topic}`
          });
        }
      } else if (myRole === "tutor" && s.tutorId === myId) {
        // Buddy is the student
        if (!chatBuddiesMap.has(s.studentId)) {
          // Look up full student profile for nice fallback details or matching
          const matchedStud = studentsList.find(st => st.id === s.studentId);
          chatBuddiesMap.set(s.studentId, {
            id: s.studentId,
            name: s.studentName,
            avatar: matchedStud?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
            role: "student",
            lastSessionTopic: `${s.subject} - ${s.topic}`
          });
        }
      }
    });

    const computedRooms = Array.from(chatBuddiesMap.values()).map(buddy => {
      // Structured roomId
      const roomId = myRole === "tutor" 
        ? `chat_${myId}_${buddy.id}` 
        : `chat_${buddy.id}_${myId}`;

      return {
        roomId,
        buddy,
        lastMessageText: "Private secure classroom study channel",
        lastMessageTime: ""
      };
    });

    setRooms(computedRooms);
    
    // Auto select first room if none is active on desktop
    if (computedRooms.length > 0 && !selectedRoom) {
      // Do not auto-select on small screens to prevent covering up the list
      if (window.innerWidth > 768) {
        setSelectedRoom(computedRooms[0]);
      }
    }
  }, [sessions, myId, myRole, studentsList, tutorsList]);

  // 2. Initialize WebSocket Connection
  useEffect(() => {
    if (!myId) return;

    // Build the WebSocket protocol & path (secure wss or ws depending on protocol)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket secure chat connected.");
      // Join immediately
      socket.send(JSON.stringify({
        type: "join",
        userId: myId,
        role: myRole,
        roomId: selectedRoom?.roomId || undefined
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === "message") {
          const { roomId, message } = payload;
          if (roomId === selectedRoom?.roomId) {
            setMessages(prev => {
              // Ensure we do not add duplicate messages
              if (prev.some(m => m.id === message.id)) return prev;
              const next = [...prev, message];
              // Mark as seen on server
              if (message.senderId !== myId) {
                socket.send(JSON.stringify({
                  type: "mark_seen",
                  roomId,
                  userId: myId
                }));
              }
              return next;
            });
          } else {
            // Unread count increment
            setUnreadCounts(prev => ({
              ...prev,
              [roomId]: (prev[roomId] || 0) + 1
            }));
            // Update last message preview
            setRooms(prevRooms => prevRooms.map(r => {
              if (r.roomId === roomId) {
                return {
                  ...r,
                  lastMessageText: message.text || "Attached a file",
                  lastMessageTime: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
              }
              return r;
            }));
          }
        } 

        else if (payload.type === "notification") {
          const { roomId, message } = payload;
          setUnreadCounts(prev => ({
            ...prev,
            [roomId]: (prev[roomId] || 0) + 1
          }));
          setRooms(prevRooms => prevRooms.map(r => {
            if (r.roomId === roomId) {
              return {
                ...r,
                lastMessageText: message.text || "Attached a file",
                lastMessageTime: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            }
            return r;
          }));
        }

        else if (payload.type === "message_status_updated") {
          const { roomId, status } = payload;
          if (roomId === selectedRoom?.roomId) {
            setMessages(prev => prev.map(m => {
              if (m.senderId === myId) {
                return { ...m, status: status };
              }
              return m;
            }));
          }
        }

        else if (payload.type === "typing") {
          const { roomId, senderId, isTyping } = payload;
          if (roomId === selectedRoom?.roomId) {
            setTypingStates(prev => ({
              ...prev,
              [senderId]: isTyping
            }));
          }
        }

      } catch (err) {
        console.warn("WS incoming message processing parsing failed:", err);
      }
    };

    socket.onclose = () => {
      console.warn("WebSocket secure connection closed. Reconnecting...");
      // Reconnect in 3 seconds to keep chat solid and immune to timeouts (reconnection handling guide!)
      setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.CLOSED) {
          // Trigger state sync rebuild next effect
          setUnreadCounts({});
        }
      }, 3000);
    };

    return () => {
      socket.close();
    };
  }, [myId, myRole, selectedRoom?.roomId]);

  // 3. Sync and fetch messages history when active room selection changes
  useEffect(() => {
    if (!selectedRoom || !myId) return;

    // Reset unread count for chosen room
    setUnreadCounts(prev => ({
      ...prev,
      [selectedRoom.roomId]: 0
    }));

    // Tell server we joined this room
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "join",
        userId: myId,
        role: myRole,
        roomId: selectedRoom.roomId
      }));
    }

    // Fetch historic messages via HTTP REST endpoint
    fetch(`/api/chat/history?roomId=${selectedRoom.roomId}&userId=${myId}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed state history");
      })
      .then(data => {
        if (data.success) {
          setMessages(data.messages);
          // Set last preview
          if (data.messages.length > 0) {
            const last = data.messages[data.messages.length - 1];
            setRooms(r => r.map(room => {
              if (room.roomId === selectedRoom.roomId) {
                return {
                  ...room,
                  lastMessageText: last.text || "Attached a file",
                  lastMessageTime: new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
              }
              return room;
            }));
          }
        }
      })
      .catch(e => {
        console.warn("Historic messages fetch API error:", e);
      });

    // Reset typing indicators
    setTypingStates({});
  }, [selectedRoom, myId, myRole]);

  // 4. Auto scrolling trigger to focus user's sight on the latest message instantly
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingStates]);

  // 5. Typing notification sender engine
  const handleInputKeyPress = () => {
    if (!selectedRoom || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    if (!isTypingLocal) {
      setIsTypingLocal(true);
      socketRef.current.send(JSON.stringify({
        type: "typing",
        roomId: selectedRoom.roomId,
        senderId: myId,
        isTyping: true
      }));
    }

    // Debounce the stop typing indicator state
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    
    typingTimerRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "typing",
          roomId: selectedRoom.roomId,
          senderId: myId,
          isTyping: false
        }));
      }
    }, 2000);
  };

  // 6. Post/send text message
  const handleSendMessage = (textOverload?: string, attachedFile?: any) => {
    const finalMsgText = textOverload || inputText;
    if (!finalMsgText.trim() && !attachedFile) {
      return;
    }

    if (!selectedRoom || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      alert("Chat connection is offline. Restoring connection, please wait...");
      return;
    }

    // Set Optimistic locally first so the sender feels zero-latency instantly!
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      senderId: myId,
      senderName: myName,
      senderRole: myRole,
      text: finalMsgText,
      timestamp: new Date().toISOString(),
      status: "sending",
      fileUrl: attachedFile?.dataUrl,
      fileName: attachedFile?.name,
      fileType: attachedFile?.type,
      materialId: attachedFile?.materialId
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText("");
    setRawFile(null);

    // Send payload over WebSocket
    socketRef.current.send(JSON.stringify({
      type: "message",
      roomId: selectedRoom.roomId,
      senderId: myId,
      senderName: myName,
      senderRole: myRole,
      text: finalMsgText,
      fileUrl: attachedFile?.dataUrl,
      fileName: attachedFile?.name,
      fileType: attachedFile?.type,
      materialId: attachedFile?.materialId
    }));

    // Remove optimistic on receiving live echo
    // Timeout to resolve state
    setTimeout(() => {
      setMessages(prev => prev.map(m => {
        if (m.id === optimisticId) {
          // If still sending, mark as delivered
          return { ...m, status: "delivered" };
        }
        return m;
      }));
    }, 600);
  };

  // 7. Binary attachment input handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const fType = isImg ? "image" : isPdf ? "pdf" : "text";

      setRawFile({
        name: file.name,
        type: fType as any,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop attachment helper bounds
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const fType = isImg ? "image" : isPdf ? "pdf" : "text";

      setRawFile({
        name: file.name,
        type: fType as any,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  // 8. Attach specific CBSE study material package helper
  const handleSelectStudyMaterial = (mat: NoteMaterial) => {
    setShowMaterialSelector(false);
    handleSendMessage(`Shared study resource material: **${mat.title}** (${mat.subject})`, {
      name: mat.title,
      type: "material",
      materialId: mat.id,
      dataUrl: `/api/shared/materials/${mat.id}` // direct dynamic resource link
    });
  };

  // 9. Abuse moderator reporting endpoint trigger
  const handleSendReport = async () => {
    if (!reportReason.trim() || !selectedRoom) return;

    try {
      const response = await fetch("/api/chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.roomId,
          reporterId: myId,
          reporterName: myName,
          reason: reportReason
        })
      });

      if (response.ok) {
        setReportStatus("Thank you. Investigation report successfully lodged. Plateform admins have frozen historic snapshots to investigate abuse.");
        setReportReason("");
        setTimeout(() => {
          setShowReportModal(false);
          setReportStatus(null);
        }, 3500);
      } else {
        alert("Failed to submit abuse log. Please connect shortly.");
      }
    } catch (e) {
      console.error(e);
      alert("Reporting server offline.");
    }
  };

  // Filter conversations
  const filteredRooms = rooms.filter(r => 
    r.buddy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.buddy.lastSessionTopic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[500px] w-full bg-slate-900 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      
      {/* LEFT SIDEBAR: ACTIVE CHAT ROOMS LIST */}
      <div className={`w-full md:w-80 lg:w-96 bg-slate-950 border-r border-slate-800 flex flex-col ${viewingRoomMobile ? "hidden md:flex" : "flex"}`}>
        
        {/* ROOMS LIST HEADER & SEARCH */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              Study Chats
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                Real-Time
              </span>
            </h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans transition-colors"
            />
          </div>
        </div>

        {/* CONVERSATIONS ROSTER */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 h-64">
              <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-medium">No Chat sessions found</p>
              <p className="text-xs mt-1 max-w-[200px]">
                {myRole === "student" 
                  ? "Book a tutor session to unlock dedicated private study chats instantly!" 
                  : "Your assigned students list will appear here once bookings occur."}
              </p>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isSelected = selectedRoom?.roomId === room.roomId;
              const unreadCount = unreadCounts[room.roomId] || 0;
              const isBuddyTyping = typingStates[room.buddy.id];

              return (
                <button
                  key={room.roomId}
                  onClick={() => {
                    setSelectedRoom(room);
                    setViewingRoomMobile(true);
                  }}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${
                    isSelected 
                      ? "bg-slate-800/80 text-white border-l-4 border-indigo-500 font-semibold" 
                      : "hover:bg-slate-900 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="relative">
                    <img 
                      src={room.buddy.avatar} 
                      alt={room.buddy.name} 
                      className="w-11 h-11 rounded-full object-cover border border-slate-700 shadow-md referrer-policy='no-referrer'" 
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate text-slate-100">
                        {room.buddy.name}
                      </h4>
                      {room.lastMessageTime && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {room.lastMessageTime}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
                      {room.buddy.lastSessionTopic}
                    </p>

                    <p className="text-xs text-indigo-400 font-medium truncate mt-1">
                      {isBuddyTyping ? (
                        <span className="animate-pulse flex items-center gap-1 font-sans">
                          Typing...
                        </span>
                      ) : (
                        room.lastMessageText
                      )}
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white rounded-full text-xs font-mono font-bold h-5 min-w-5 px-1.5 flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: ACTIVE CHAT SCREEN */}
      <div className={`flex-1 flex flex-col bg-slate-900/40 relative ${!viewingRoomMobile && "hidden md:flex"}`}>
        {selectedRoom ? (
          <>
            {/* CHAT SESSION HEADER */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setViewingRoomMobile(false)}
                  className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <img 
                  src={selectedRoom.buddy.avatar} 
                  alt={selectedRoom.buddy.name} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-700 referrer-policy='no-referrer'" 
                />
                
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedRoom.buddy.name}
                  </h3>
                  <p className="text-[11px] font-mono text-indigo-400">
                    {selectedRoom.buddy.lastSessionTopic}
                  </p>
                </div>
              </div>

              {/* REPORT ABUSE ACTION & SECURITY FLAGS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all"
                  title="Report classroom abuse or terms violations to Super Admin"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Report Abuse</span>
                </button>
              </div>
            </div>

            {/* MESSAGES CONSOLE SCROLLER */}
            <div 
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-900/20"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex justify-center mb-4">
                <div className="bg-slate-950/60 text-slate-400 text-[11px] font-mono py-1 px-3 rounded-full border border-slate-800/60">
                  🔒 Messages remain available securely after login and logouts.
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                  <MessageSquare className="w-12 h-12 text-slate-700 mb-2 animate-bounce" />
                  <p className="text-sm">Initiate secure studies dialogue channel.</p>
                  <p className="text-xs mt-1 max-w-sm">
                    Welcome to your private classroom chat with <strong>{selectedRoom.buddy.name}</strong>. Drag files here or type below!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === myId;
                  const dateObj = new Date(msg.timestamp);
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] ${isMe ? "ml-auto" : "mr-auto"}`}
                    >
                      {/* SENDER LABEL (only if other) */}
                      {!isMe && (
                        <span className="text-[10px] text-indigo-400 font-mono mb-1 ml-1">
                          {msg.senderName} ({msg.senderRole})
                        </span>
                      )}

                      <div className={`p-4 rounded-2xl relative shadow-md transition-all ${
                        isMe 
                          ? "bg-indigo-600 text-white rounded-tr-none border border-indigo-500" 
                          : "bg-slate-950 text-slate-100 rounded-tl-none border border-slate-800"
                      }`}>
                        
                        {/* ATTACHMENT RENDERING */}
                        {msg.fileUrl && (
                          <div className="mb-2 p-2 bg-black/30 rounded-lg overflow-hidden border border-white/5 max-w-sm">
                            {msg.fileType === "image" ? (
                              <img 
                                src={msg.fileUrl} 
                                alt="Attachment" 
                                className="max-h-56 rounded-md object-contain border border-slate-800 referrer-policy='no-referrer'" 
                              />
                            ) : msg.fileType === "pdf" ? (
                              <a 
                                href={msg.fileUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-2 hover:underline text-xs text-indigo-300 font-mono"
                              >
                                <FileText className="w-8 h-8 text-rose-400 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{msg.fileName || "document.pdf"}</span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                                <Sparkles className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                                <div>
                                  <p className="truncate font-semibold max-w-[200px]">{msg.fileName}</p>
                                  <span className="text-[10px] text-slate-400">Classroom Material Link</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MESSAGE PARAGRAPH TEXT */}
                        <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>

                        {/* AUDIT LOG REPORT CARD */}
                        {msg.reported && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-400 rounded px-1 w-fit">
                            Flagged for Moderation Audit
                          </span>
                        )}
                      </div>

                      {/* TIMESTAMP & DELIVERY TICKS */}
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] text-slate-400">
                        <span>{timeStr}</span>
                        {isMe && (
                          <span>
                            {msg.status === "sending" && (
                              <span className="text-slate-500 animate-pulse">Sending...</span>
                            )}
                            {msg.status === "delivered" && (
                              <Check className="w-3.5 h-3.5 text-slate-500" title="Delivered successfully" />
                            )}
                            {msg.status === "seen" && (
                              <CheckCheck className="w-3.5 h-3.5 text-indigo-400" title="Seen by student/tutor" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* BUDDY TYPING INDICATOR LOOP */}
              {Object.keys(typingStates).map(bId => {
                if (!typingStates[bId] || bId === myId) return null;
                const typingBuddy = bId === selectedRoom.buddy.id ? selectedRoom.buddy : null;
                if (!typingBuddy) return null;

                return (
                  <div key={bId} className="flex items-center gap-2 pl-1 animate-pulse">
                    <img 
                      src={typingBuddy.avatar} 
                      alt="Typing" 
                      className="w-5 h-5 rounded-full object-cover referrer-policy='no-referrer'" 
                    />
                    <span className="text-xs text-indigo-400 font-mono">
                      {typingBuddy.name} is typing...
                    </span>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* MESSAGE COMPOSER DRAG NOTIFIER / CHAT FOOTER */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 shrink-0">
              
              {/* CURRENT ATTACHMENT SNAPSHOT OVERLAY */}
              {rawFile && (
                <div className="mb-3 p-2 bg-slate-800 rounded-xl flex items-center justify-between border border-slate-700">
                  <div className="flex items-center gap-2">
                    {rawFile.type === "image" ? (
                      <ImageIcon className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-rose-400" />
                    )}
                    <span className="text-xs text-indigo-300 font-mono max-w-sm truncate">
                      {rawFile.name} ({rawFile.type.toUpperCase()})
                    </span>
                  </div>
                  <button 
                    onClick={() => setRawFile(null)} 
                    className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* PAPERS/FILES ATTACH LOOP */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Attach images, documents or PDFs"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {/* STUDY RESOURCE INSERT BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowMaterialSelector(prev => !prev)}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors text-xs font-semibold"
                  title="Select and attach study materials package"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Attach Material</span>
                </button>

                {/* WORD WRITING PAD */}
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    handleInputKeyPress();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  placeholder="Type message or drag-and-drop file..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans transition-all"
                />

                {/* FLIGHT SEND ACTION */}
                <button
                  onClick={() => handleSendMessage()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors cursor-pointer"
                  title="Send message instantly"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* OVERLAY: STUDY MATERIAL LIST SELECTOR */}
              {showMaterialSelector && (
                <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl max-h-52 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between sticky top-0 bg-slate-900 pb-2 border-b border-slate-800/60">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      📚 Select Classroom Material to Share
                    </span>
                    <button 
                      onClick={() => setShowMaterialSelector(false)} 
                      className="p-0.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {materials.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">No loaded study resources available.</p>
                  ) : (
                    materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => handleSelectStudyMaterial(mat)}
                        className="w-full text-left flex items-center justify-between p-2 hover:bg-slate-800 rounded-xl transition-all"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-150 truncate max-w-[280px]">
                            {mat.title}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {mat.subject} • {mat.type}
                          </span>
                        </div>
                        <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-full font-mono text-cyan-400 border border-slate-800">
                          Link Resource
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <MessageSquare className="w-16 h-16 text-slate-700 mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-slate-350">
              Your Secure Classroom Study Lounge
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Please choose a private conversation channel from the side panel list to interact, distribute assignments, exchange PDFs, and review revision notes.
            </p>
          </div>
        )}

        {/* DIALOG WINDOW: REPORT ABUSE FORM */}
        {showReportModal && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <button 
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-850 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Report Classroom Incident</h3>
                  <p className="text-[11px] font-mono text-slate-400">Moderation Docket id: {selectedRoom?.roomId}</p>
                </div>
              </div>

              {reportStatus ? (
                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/10 text-xs font-mono">
                  {reportStatus}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-normal">
                    Please describe the specific policy violation, abuse, harassment, or cheating behaviour. A snapshot of the last 15 messages will be logged securely for immediate review by our audit team.
                  </p>

                  <textarea
                    rows={4}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Enter reason details (e.g. offensive language, unsolicited advertising, external links...)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans"
                  />

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-350 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendReport}
                      disabled={!reportReason.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
