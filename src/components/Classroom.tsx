import React, { useState, useEffect, useRef } from "react";
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Send, MessageSquare, Sparkles, BookOpen, Edit3, Trash2, ArrowLeft, ArrowRight, CheckCircle, Info } from "lucide-react";
import { Session, ChatMessage, WhiteboardStroke } from "../types";

interface ClassroomProps {
  session: Session;
  userRole: "student" | "tutor";
  onLeave: () => void;
}

export default function Classroom({ session, userRole, onLeave }: ClassroomProps) {
  // UI states
  const [activeTab, setActiveTab] = useState<"chat" | "assistant">("chat");
  const [activeWorkspace, setActiveWorkspace] = useState<"whiteboard" | "slides">("slides");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [classTimer, setClassTimer] = useState("08:42");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      senderName: userRole === "student" ? session.tutorName : session.studentName,
      senderRole: userRole === "student" ? "tutor" : "student",
      text: `Hello! Welcome to our session on: ${session.topic}. Let's get started.`,
      timestamp: "09:01"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Fetch chat history for this classroom room from backend store
  useEffect(() => {
    const roomId = `chat_${session.tutorId}_${session.studentId}`;
    const myId = userRole === "student" ? session.studentId : session.tutorId;

    async function fetchHistory() {
      try {
        const response = await fetch(`/api/chat/history?roomId=${roomId}&userId=${myId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages && data.messages.length > 0) {
            const mapped = data.messages.map((m: any) => ({
              id: m.id,
              senderName: m.senderName,
              senderRole: m.senderRole,
              text: m.text,
              timestamp: new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false })
            }));
            setMessages(mapped);
          }
        }
      } catch (err) {
        console.error("Error loading classroom chat history:", err);
      }
    }

    fetchHistory();
  }, [session.tutorId, session.studentId, userRole]);

  // Connect to real-time WebSocket server
  useEffect(() => {
    const roomId = `chat_${session.tutorId}_${session.studentId}`;
    const myId = userRole === "student" ? session.studentId : session.tutorId;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Classroom WebSocket session connected:", roomId);
      socket.send(JSON.stringify({
        type: "join",
        userId: myId,
        role: userRole,
        roomId: roomId
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message" && payload.roomId === roomId) {
          const { message } = payload;
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            const formattedTime = new Date(message.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
            return [...prev, {
              id: message.id,
              senderName: message.senderName,
              senderRole: message.senderRole,
              text: message.text,
              timestamp: formattedTime
            }];
          });
        }
      } catch (err) {
        console.error("Error parsing message from Classroom WebSocket:", err);
      }
    };

    socket.onclose = () => {
      console.log("Classroom WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, [session.tutorId, session.studentId, userRole]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Whiteboard drawing ref & state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawColor, setDrawColor] = useState("#4f46e5");
  const [drawWidth, setDrawWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const currentPath = useRef<{ x: number; y: number }[]>([]);

  // Slide Deck state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideContent = [
    {
      title: "1. The Concept of Limits",
      text: "A limit is the value that a function (or sequence) 'approaches' as the input (or index) approaches some value.",
      math: "f''(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
      notes: "Intuitive explanation: How does a curve behave as we zoom in infinitely?"
    },
    {
      title: "2. The Definitive Integral",
      text: "Geometrically, the definite integral of a continuous function on an interval [a, b] represents the signed area enclosed by the graph.",
      math: "\\int_a^b f(x) \\, dx = \\lim_{n \\to \\infty} \\sum_{i=1}^n f(x_i^*) \\Delta x",
      notes: "Limit of the sum of rectangular areas under the curve."
    },
    {
      title: "3. Fundamental Theorem of Calculus",
      text: "Connects differentiation and integration, showing they are inverse processes.",
      math: "\\frac{d}{dx} \\left( \\int_a^x f(t) \\, dt \\right) = f(x) \\quad \\text{and} \\quad \\int_a^b f(x) \\, dx = F(b) - F(a)",
      notes: "F is the anti-derivative of f."
    }
  ];

  // Gemini assistant states
  const [notesGenerated, setNotesGenerated] = useState<string>("");
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState<{ [key: number]: number }>({});
  const [score, setScore] = useState<number | null>(null);

  // Video streams refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Active speaker & voice feedback states (WhatsApp Style video call active speaker)
  const [activeSpeaker, setActiveSpeaker] = useState<"local" | "remote">("remote");
  const [localVoiceActive, setLocalVoiceActive] = useState(false);
  const [remoteVoiceActive, setRemoteVoiceActive] = useState(false);

  // Web Audio Voice Activity Detection for Local User when mic is ON
  useEffect(() => {
    if (!micOn || !localStream) {
      setLocalVoiceActive(false);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrameId: number | null = null;

    try {
      const AudioCtxConstructor = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtxConstructor();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        source = audioCtx.createMediaStreamSource(localStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let silenceCounter = 0;

        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          if (average > 15) {
            silenceCounter = 0;
            setLocalVoiceActive(true);
            setActiveSpeaker("local");
          } else {
            silenceCounter++;
            if (silenceCounter > 40) {
              setLocalVoiceActive(false);
            }
          }
          animationFrameId = requestAnimationFrame(checkVolume);
        };
        animationFrameId = requestAnimationFrame(checkVolume);
      }
    } catch (err) {
      console.warn("Speech detector error:", err);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (source) source.disconnect();
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
    };
  }, [micOn, localStream]);

  // Simulate Partner speaking on chat message or general active periods
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.senderRole !== userRole) {
      setRemoteVoiceActive(true);
      setActiveSpeaker("remote");
      const timer = setTimeout(() => {
        setRemoteVoiceActive(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [messages, userRole]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (localVoiceActive) return;
      const shouldTalk = Math.random() > 0.45;
      if (shouldTalk) {
        setRemoteVoiceActive(true);
        setActiveSpeaker("remote");
        setTimeout(() => {
          setRemoteVoiceActive(false);
        }, 4000);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [localVoiceActive]);

  // Auto increment timer
  useEffect(() => {
    const interval = setInterval(() => {
      setClassTimer(prev => {
        const [minutes, seconds] = prev.split(":").map(Number);
        let newSeconds = seconds + 1;
        let newMinutes = minutes;
        if (newSeconds >= 60) {
          newSeconds = 0;
          newMinutes += 1;
        }
        return `${String(newMinutes).padStart(2, "0")}:${String(newSeconds).padStart(2, "0")}`;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set up local camera media stream (using getUserMedia)
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startCamera() {
      if (!cameraOn) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          localStreamRef.current = null;
          setLocalStream(null);
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: micOn
        });
        activeStream = stream;
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setCameraError(null);
      } catch (err: any) {
        console.warn("Camera access denied or unavailable:", err.message);
        setCameraError("Camera unavailable. Using active avatar preview.");
      }
    }
    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraOn]);

  // Handle Exit and turn off all streams
  const handleExit = () => {
    // Stop local camera/mic stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track on exit: ${track.kind}`);
      });
      localStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    // Stop screen sharing tracks if any
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped screen sharing track on exit: ${track.kind}`);
      });
      screenStreamRef.current = null;
    }
    // Release the srcObject references
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    onLeave();
  };

  // Clean local streams on mic toggle
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = micOn;
      });
    }
  }, [micOn, localStream]);

  // Screen share API
  async function toggleScreenShare() {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setScreenSharing(true);
        // Turn camera off automatically while sharing screen
        setCameraOn(false);

        // Standard listener for when user clicks "Stop Sharing" from browser bar
        stream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          setCameraOn(true);
        };
      } catch (err) {
        console.warn("Screen share cancelled/denied:", err);
      }
    }
  }

  // Draw handler for whiteboard
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    redrawCanvas();
  }, [strokes]);

  // Handle Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && activeWorkspace === "whiteboard") {
      canvas.width = canvas.parentElement?.clientWidth || 700;
      canvas.height = 420;
      redrawCanvas();
    }
  }, [activeWorkspace]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    currentPath.current = [{ x, y }];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentPath.current.push({ x, y });

    // Draw active stroke locally in real-time
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const start = currentPath.current[currentPath.current.length - 2];
      if (start) {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.current.length > 1) {
      setStrokes(prev => [...prev, {
        color: drawColor,
        width: drawWidth,
        points: currentPath.current
      }]);
    }
    currentPath.current = [];
  };

  const clearCanvas = () => {
    setStrokes([]);
  };

  // Sent Messages Handling & Real-time WebSocket delivery
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const roomId = `chat_${session.tutorId}_${session.studentId}`;
    const myId = userRole === "student" ? session.studentId : session.tutorId;
    const myName = userRole === "student" ? session.studentName : session.tutorName;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "message",
        senderId: myId,
        senderName: myName,
        senderRole: userRole,
        roomId: roomId,
        text: inputText
      }));
      setInputText("");
    } else {
      // Offline fallback
      const newMsg: ChatMessage = {
        id: String(Date.now()),
        senderName: myName,
        senderRole: userRole,
        text: inputText,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false })
      };
      setMessages(prev => [...prev, newMsg]);
      setInputText("");
    }
  };

  // AI-Powered Actions (using full-stack server endpoints)
  const generateGeminiNotes = async () => {
    setLoadingNotes(true);
    setNotesGenerated("");
    setActiveTab("assistant");

    try {
      const response = await fetch("/api/gemini/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.topic,
          subject: session.subject
        })
      });
      const data = await response.json();
      setNotesGenerated(data.notes || "Failed to retrieve smart lesson outlines. Please check server.");
    } catch (err) {
      console.error(err);
      setNotesGenerated("Check connection or select API key.");
    } finally {
      setLoadingNotes(false);
    }
  };

  const generateGeminiQuiz = async () => {
    setLoadingQuiz(true);
    setQuizQuestions([]);
    setQuizAnswered({});
    setScore(null);
    setActiveTab("assistant");

    try {
      const response = await fetch("/api/gemini/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: session.topic })
      });
      const data = await response.json();
      setQuizQuestions(data.quiz || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const selectQuizOption = (questionIdx: number, optionIdx: number) => {
    setQuizAnswered(prev => ({
      ...prev,
      [questionIdx]: optionIdx
    }));
  };

  const submitQuiz = () => {
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswered[idx] === q.answerIndex) {
        correctCount++;
      }
    });
    setScore(correctCount);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50 text-slate-100 font-sans" id="classroomView">
      {/* ── TOP ROOM HEADER ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-natural-green rounded-lg p-2 text-white flex items-center justify-center font-bold">
            🏫
          </div>
          <div>
            <div className="flex items-center gap-2 font-serif">
              <h2 className="text-lg font-bold tracking-tight text-white">{session.topic}</h2>
              <span className="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {session.subject} · Room: <span className="font-mono text-natural-orange font-semibold">{session.roomId}</span> · Joined as <span className="capitalize text-natural-orange font-bold">{userRole}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Class Timer */}
          <div className="bg-slate-800/80 rounded-full px-4 py-1.5 border border-slate-700 font-mono text-sm font-bold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            Timer: {classTimer}
          </div>

          {/* Leave Button */}
          <button
            onClick={handleExit}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded-full cursor-pointer flex items-center gap-2 transition hover:scale-[1.02]"
            id="leaveBtn"
          >
            <PhoneOff className="w-4 h-4" /> Exit Room
          </button>
        </div>
      </header>

      {/* ── MAIN CLASS CONTAINER ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden bg-slate-950">
        
        {/* COLUMN 1 WAS REMOVED AS REQUESTED BY THE USER */}

        {/* ── COLUMN 2: CAMERA STREAM VIDEO BOXES ── */}
        <div className="w-full md:w-3/5 lg:w-2/3 bg-slate-900 p-4 md:p-6 lg:p-8 flex flex-col gap-6 md:overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 justify-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex-shrink-0">
            Classroom Feeds
          </div>

          <div className="flex-1 w-full relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center max-w-5xl mx-auto my-auto min-h-[380px]">
            
            {/* ── LOCAL VIDEO FEED (USER) ── */}
            <div 
              onClick={() => activeSpeaker === "remote" && setActiveSpeaker("local")}
              className={`transition-all duration-550 ease-out overflow-hidden bg-slate-950 relative border shadow-lg ${
                activeSpeaker === "local" 
                  ? "absolute inset-0 w-full h-full z-10 border-transparent rounded-none" 
                  : "absolute top-4 right-4 w-28 sm:w-40 aspect-video md:w-48 rounded-xl border-indigo-500/80 hover:border-indigo-400 hover:scale-[1.05] active:scale-95 cursor-pointer z-20"
              }`}
            >
              {cameraOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-600">
                  <VideoOff className="w-6 h-6 mb-1 text-rose-500/30" />
                  <span className="text-[8px] uppercase font-bold tracking-wider text-slate-500">Camera Off</span>
                </div>
              )}

              {/* Dynamic volume activity visual halo */}
              {localVoiceActive && (
                <div className="absolute inset-0 border-2 border-emerald-400 rounded-inherit pointer-events-none animate-pulse z-30" />
              )}

              {/* Label Tag */}
              {activeSpeaker === "local" ? (
                <div className="absolute bottom-3 left-3 z-30 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white font-bold flex items-center gap-1.5 shadow-md">
                  <span className={`w-1.5 h-1.5 rounded-full ${micOn ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                  You ({userRole === "student" ? session.studentName : session.tutorName})
                  {localVoiceActive && <span className="text-emerald-400 text-[8px] font-bold uppercase animate-pulse">● Speaking</span>}
                </div>
              ) : (
                <div className="absolute bottom-1.5 left-1.5 z-30 bg-slate-950/85 backdrop-blur-sm rounded px-1.5 py-0.5 text-[8px] text-white/95 font-semibold shadow">
                  You
                </div>
              )}

              {cameraError && activeSpeaker === "local" && (
                <div className="absolute top-2 left-2 right-2 bg-rose-500/50 border border-rose-500 p-1 rounded text-[8px] text-white leading-tight z-30">
                  {cameraError}
                </div>
              )}
            </div>

            {/* ── REMOTE VIDEO FEED (PARTNER) ── */}
            <div 
              onClick={() => activeSpeaker === "local" && setActiveSpeaker("remote")}
              className={`transition-all duration-550 ease-out overflow-hidden bg-slate-900 relative border shadow-lg ${
                activeSpeaker === "remote" 
                  ? "absolute inset-0 w-full h-full z-10 border-transparent rounded-none" 
                  : "absolute top-4 right-4 w-28 sm:w-40 aspect-video md:w-48 rounded-xl border-indigo-500/80 hover:border-indigo-400 hover:scale-[1.05] active:scale-95 cursor-pointer z-20"
              }`}
            >
              {/* Simulated/Active video box */}
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 relative">
                <div className={`rounded-full bg-indigo-650 flex items-center justify-center font-bold text-white border border-indigo-400 border-dashed mb-2 transition-all duration-500 ${
                  activeSpeaker === "remote" ? "w-16 h-16 text-lg animate-pulse" : "w-10 h-10 text-xs"
                }`}>
                  {userRole === "student" ? session.tutorAvatar : "AR"}
                </div>
                
                {activeSpeaker === "remote" && (
                  <>
                    <span className="text-xs text-slate-300 font-semibold">
                      {userRole === "student" ? session.tutorName : session.studentName}
                    </span>
                    <span className="text-[10px] text-indigo-400 mt-1 font-semibold animate-pulse">● Connected</span>
                  </>
                )}

                {/* Sound waves overlay for speech indicator */}
                <div className={`absolute flex items-end gap-0.5 ${activeSpeaker === "remote" ? "top-4 right-4 h-4" : "top-2 right-2 h-2.5"}`}>
                  <div className={`w-0.5 bg-emerald-400 ${remoteVoiceActive ? "animate-bounce" : "h-1"}`} style={{ animationDelay: "0.1s" }} />
                  <div className={`w-0.5 bg-emerald-400 ${remoteVoiceActive ? "animate-bounce h-3" : "h-1.5"}`} style={{ animationDelay: "0.3s" }} />
                  <div className={`w-0.5 bg-emerald-400 ${remoteVoiceActive ? "animate-bounce h-2" : "h-1"}`} style={{ animationDelay: "0.2s" }} />
                </div>
              </div>

              {/* Dynamic speech border indicator */}
              {remoteVoiceActive && (
                <div className="absolute inset-0 border-2 border-emerald-400 rounded-inherit pointer-events-none animate-pulse z-30" />
              )}

              {/* Label Tag */}
              {activeSpeaker === "remote" ? (
                <div className="absolute bottom-3 left-3 z-30 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white font-bold flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {userRole === "student" ? session.tutorName : session.studentName} ({userRole === "student" ? "Tutor" : "Student"})
                  {remoteVoiceActive && <span className="text-emerald-400 text-[8px] font-bold uppercase animate-pulse">● Speaking</span>}
                </div>
              ) : (
                <div className="absolute bottom-1.5 left-1.5 z-30 bg-slate-950/85 backdrop-blur-sm rounded px-1.5 py-0.5 text-[8px] text-white/95 font-semibold shadow truncate max-w-[85%]">
                  {userRole === "student" ? session.tutorName : session.studentName}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── COLUMN 3: SIDEBAR PANEL (RIGHT) ── */}
        <aside className="w-full md:w-2/5 lg:w-1/3 bg-slate-900 flex flex-col border-t md:border-t-0 border-slate-800 min-h-[480px] md:min-h-0">
          {/* Static Header replaces tab switch buttons */}
          <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Session Chat
            </span>
            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Active
            </span>
          </div>

          {/* CHAT PANEL */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${msg.senderRole === userRole ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <span className="text-[10px] text-slate-500 mb-0.5 font-semibold">
                    {msg.senderName} ({msg.timestamp})
                  </span>
                  <div
                    className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.senderRole === userRole ? "bg-indigo-650 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none"}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input
                type="text"
                placeholder="Ask a question..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-xl text-white cursor-pointer transition flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
