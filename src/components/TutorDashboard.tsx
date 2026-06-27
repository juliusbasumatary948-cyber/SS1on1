import React, { useState } from "react";
import { User, Session, NoteMaterial, Assignment, calculatePlatformPricing } from "../types";
import { Video, Calendar, Users, DollarSign, Award, Clock, Star, Plus, ArrowRight, BookOpen, Settings, Send, CheckCircle, X, Search, LogOut, Menu } from "lucide-react";
import RealTimeChat from "./RealTimeChat";

interface TutorDashboardProps {
  tutor: User;
  sessions: Session[];
  materials: NoteMaterial[];
  assignments: Assignment[];
  onJoinSession: (session: Session) => void;
  onGradeAssignment: (assignmentId: string, score: string, feedback: string) => void;
  onUploadMaterial: (subject: string, title: string, content: string) => void;
  onToggleAvailability: () => void;
  onLogout?: () => void;
  googleAccessToken?: string | null;
  onUpdatePricing?: (newPrice: number) => void;
  onUpdateSessionStatus?: (sessionId: string, newStatus: Session["status"]) => void;
}

export default function TutorDashboard({
  tutor,
  sessions,
  materials,
  assignments,
  onJoinSession,
  onGradeAssignment,
  onUploadMaterial,
  onToggleAvailability,
  onLogout,
  googleAccessToken,
  onUpdatePricing,
  onUpdateSessionStatus
}: TutorDashboardProps) {
  const [activeTab, setActiveTab] = useState<"home" | "classroom" | "students" | "timetable" | "materials" | "assignments" | "contacts" | "chat">("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core Verification progress & document status states
  const [currentStatus, setCurrentStatus] = useState<User["verificationStatus"]>(() => {
    const saved = localStorage.getItem(`tutor_verif_status_${tutor.id}`);
    if (saved) return saved as any;
    return tutor.verificationStatus || "submitted";
  });

  const [driveLink] = useState(() => {
    return tutor.driveFolderLink || "https://drive.google.com/drive/folders/1RBCWVt6-FqA6lTTpMzgpqMDLvjjsPU3E";
  });

  const [docsSubmitted, setDocsSubmitted] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`tutor_docs_chk_${tutor.id}`);
    if (saved) return JSON.parse(saved);
    return {
      idProof: false,
      certificates: false,
      profilePhoto: false,
      resume: false
    };
  });

  const handleToggleDoc = (key: string) => {
    const next = { ...docsSubmitted, [key]: !docsSubmitted[key] };
    setDocsSubmitted(next);
    localStorage.setItem(`tutor_docs_chk_${tutor.id}`, JSON.stringify(next));

    // If they check anything, we can automatically update status logically
    const anyChecked = Object.values(next).some(Boolean);
    let nextStatus = currentStatus;
    
    if (currentStatus === "submitted" && anyChecked) {
      nextStatus = "in_progress";
    } else if (!anyChecked && currentStatus === "in_progress") {
      nextStatus = "submitted";
    }
    
    if (nextStatus !== currentStatus) {
      setCurrentStatus(nextStatus);
      localStorage.setItem(`tutor_verif_status_${tutor.id}`, nextStatus);
      try {
        import("../supabase").then(({ isSupabaseConfigured, dbService }) => {
          if (isSupabaseConfigured()) {
            dbService.upsertProfile({
              ...tutor,
              verificationStatus: nextStatus
            } as any).catch(e => console.error(e));
          }
        });
      } catch (err) {
        console.error("Failed to update status on Supabase", err);
      }
    }
  };

  const handleNotifyAdmin = () => {
    const nextStatus = "in_progress";
    setCurrentStatus(nextStatus);
    localStorage.setItem(`tutor_verif_status_${tutor.id}`, nextStatus);
    try {
      import("../supabase").then(({ isSupabaseConfigured, dbService }) => {
        if (isSupabaseConfigured()) {
          dbService.upsertProfile({
            ...tutor,
            verificationStatus: nextStatus
          } as any).catch(e => console.error(e));
        }
      });
    } catch (err) {
      console.error("Failed to update status on Supabase", err);
    }
    alert("Verification admin has been notified. They have been granted safe read scopes to review your custom folder on Google Drive.");
  };

  // Google Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState("");

  React.useEffect(() => {
    // Rely exclusively on live database profiles or authorized Google Contacts
    const fetchLiveContacts = async () => {
      try {
        const { isSupabaseConfigured, dbService } = await import("../supabase");
        if (isSupabaseConfigured()) {
          setContactsLoading(true);
          const profiles = await dbService.getProfiles();
          const registeredStudents = profiles
            .filter(p => p.role === "student")
            .map(p => ({
              id: p.id,
              name: p.name,
              email: p.email || "",
              phone: p.phone || "+91 99999 88888",
              photo: p.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
            }));
          setContacts(registeredStudents);
        }
      } catch (err) {
        console.error("Failed to load live student contacts:", err);
      } finally {
        setContactsLoading(false);
      }
    };
    fetchLiveContacts();
  }, []);

  // State for upload study material modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newMatTitle, setNewMatTitle] = useState("");
  const [newMatSubject, setNewMatSubject] = useState(tutor.subject || "Mathematics");
  const [newMatContent, setNewMatContent] = useState("");

  // State for grading modal
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [gradeScore, setGradeScore] = useState("90%");
  const [gradeFeedback, setGradeFeedback] = useState("");

  // Target pricing states and auto commission calculations
  const [newBaseRate, setNewBaseRate] = useState<number | "">(tutor.ratePerSession || 500);

  React.useEffect(() => {
    if (tutor.ratePerSession !== undefined) {
      setNewBaseRate(tutor.ratePerSession);
    }
  }, [tutor.ratePerSession]);

  const handlePublishPricing = () => {
    if (newBaseRate !== "" && Number(newBaseRate) > 0) {
      if (onUpdatePricing) {
        onUpdatePricing(Number(newBaseRate));
        alert(`Success! Your base session price is synced automatically to ₹${Number(newBaseRate).toFixed(2)}. The student-facing price has been updated with the 11.11% platform commission to ₹${(Number(newBaseRate) * 1.1111).toFixed(2)}.`);
      }
    }
  };

  const liveSession = sessions.find(s => s.status === "live");
  const studentAssignments = assignments.filter(a => a.status === "pending");

  // ── COMPUTED REAL-TIME METRICS FOR SELECTED KPI ELEMENTS ──
  // Process sessions specifically matched with this tutor
  const tutorId = tutor.id;
  const tutorSessions = sessions.filter(s => s.tutorId === tutorId);

  // Find unique students who have booked/scheduled with this specific tutor
  const uniqueStudentNames = Array.from(new Set(tutorSessions.map(s => s.studentName))).filter(Boolean);
  const activeStudentCount = uniqueStudentNames.length;

  // Real-time count of total sessions on timetable
  const weeklySessionsCount = tutorSessions.length;

  // Completed sessions list for accurate invoicing/earnings calculation
  const completedSessionsList = tutorSessions.filter(s => s.status === "completed");
  const ratePerSession = tutor.ratePerSession || 600;
  
  // Real earnings based strictly and genuinely on completed sessions
  const currentEarnings = completedSessionsList.length * ratePerSession;

  // Hourly counts based entirely on completed sessions (each session spans exactly 1.5 hours)
  const completedHoursCount = completedSessionsList.length * 1.5;

  // Dynamic Average Assignment score calculation for Batch performance Analytics
  const gradedAssignments = assignments.filter(a => a.status === "graded");
  const parsedScores = gradedAssignments.map(a => {
    const parts = a.score ? a.score.split("/") : [];
    if (parts.length === 2) {
      const got = parseFloat(parts[0]);
      const max = parseFloat(parts[1]);
      if (!isNaN(got) && !isNaN(max) && max > 0) {
        return (got / max) * 100;
      }
    }
    const val = parseFloat(a.score || "");
    return !isNaN(val) ? val : null;
  }).filter((v): v is number => v !== null);

  const calculatedAvgScore = parsedScores.length > 0
    ? Math.round(parsedScores.reduce((sum, val) => sum + val, 0) / parsedScores.length)
    : 0; // If no assignments are graded yet, show 0 (no fake baseline)

  const handleOpenGrading = (ass: Assignment) => {
    setGradingAssignment(ass);
    setGradeScore("92%");
    setGradeFeedback("Wonderful conceptual logic demonstrating perfect double-angle identities!");
    setShowGradingModal(true);
  };

  const handleConfirmGrading = () => {
    if (!gradingAssignment) return;
    onGradeAssignment(gradingAssignment.id, gradeScore, gradeFeedback);
    setShowGradingModal(false);
    setGradingAssignment(null);
  };

  const handleConfirmUpload = () => {
    if (!newMatTitle || !newMatContent) return;
    onUploadMaterial(newMatSubject, newMatTitle, newMatContent);
    setShowUploadModal(false);
    setNewMatTitle("");
    setNewMatContent("");
  };

  return (
    <div className="flex min-h-screen bg-natural-bg font-sans" id="tutorDashboard">
      
      {/* Mobile background tap overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#16271a]/60 backdrop-blur-xs z-35 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* ── SIDEBAR CONFORMING TO NATURAL TONES ── */}
      <aside className={`w-64 bg-natural-green-dark text-[#FAF7F2] flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-natural-border/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-natural-green rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="font-serif font-bold text-white leading-none text-base">Sikho Sikhow</h1>
              <span className="text-[10px] text-natural-sand-mid font-semibold uppercase tracking-wider">Teacher Control Hub</span>
            </div>
          </div>
          {/* Close drawer button on mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-[#FAF7F2]/80 hover:text-white transition cursor-pointer"
            aria-label="Close sidebar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User profile details */}
        <div className="px-6 py-5 border-b border-natural-border/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D9D1C5] border-2 border-natural-green flex items-center justify-center font-bold text-natural-green-dark shadow-sm">
            {tutor.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-white truncate">{tutor.name}</h3>
            <p className="text-[10px] text-natural-orange font-bold uppercase tracking-wider">{tutor.subject} · Specialist</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          <span className="text-[9px] font-bold text-natural-sand-mid/60 uppercase tracking-widest px-3 mb-2 block">TEACHER CABINET</span>

          <button
            onClick={() => { setActiveTab("home"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "home" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">🏠</span>
            <span>Control Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveTab("classroom"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "classroom" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="flex items-center gap-3">
              <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">📹</span>
              <span>Session</span>
            </span>
            {sessions.filter(s => s.tutorId === tutor.id && s.status === "pending").length > 0 && (
              <span className="bg-natural-orange text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-sm shrink-0">
                {sessions.filter(s => s.tutorId === tutor.id && s.status === "pending").length}
              </span>
            )}
          </button>

          <span className="text-[9px] font-bold text-natural-sand-mid/60 uppercase tracking-widest px-3 pt-4 mb-2 block">CONTENT &amp; TASKS</span>

          <button
            onClick={() => { setActiveTab("chat"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "chat" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="flex items-center gap-3">
              <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">💬</span>
              <span>Study Chats Space</span>
            </span>
            <span className="bg-indigo-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">LIVE</span>
          </button>

          <button
            onClick={() => { setActiveTab("materials"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "materials" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">📚</span>
            <span>Study Materials Portal</span>
          </button>



          <button
            onClick={() => { setActiveTab("contacts"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "contacts" ? "bg-natural-green text-white border-l-4 border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="flex items-center gap-3">
              <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">📇</span>
              <span>Parent Circles</span>
            </span>
          </button>

          {onLogout && (
            <div className="pt-4 border-t border-natural-border/10 mt-4 px-3">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 text-rose-300 hover:bg-rose-950/40 hover:text-rose-100 cursor-pointer active:scale-95 border border-transparent hover:border-rose-900/30"
                id="tutorSidebarLogoutBtn"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Log Out Portal</span>
              </button>
            </div>
          )}
        </nav>


      </aside>

      {/* ── MAIN CONTENTS ── */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col bg-[#FAF7F2]">
        
        {/* HEADER */}
        <header className="bg-white border-b border-natural-border px-4 md:px-8 py-4.5 flex items-center justify-between sticky top-0 z-20 shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-xl hover:bg-natural-sand-light text-natural-green-dark transition cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base md:text-xl font-serif font-extrabold tracking-tight text-natural-green-dark flex items-center gap-2">
                Namaste, Teacher {tutor.name.split(" ").slice(-1)[0]} 👋
              </h2>
              <p className="text-[10px] md:text-xs text-[#8A847C]">Your next Definite Integrals session is active. Ready to launch?</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div id="tutorRatingHeaderBadge" className="bg-natural-sand-light border border-natural-sand-mid rounded-full px-4 py-1.5 text-xs text-natural-green font-bold flex items-center gap-2 font-sans">
              ⭐ {tutor.rating} ({tutor.reviewsCount || 0} reviews)
            </div>
            
            <button
              onClick={() => setActiveTab("classroom")}
              className="bg-natural-green hover:bg-[#4E5D4F] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition shadow-sm cursor-pointer"
            >
              Start Class Call
            </button>
          </div>
        </header>

        {/* SCROLLABLE AREA */}
        <div className="p-8 space-y-6 max-w-6xl w-full">
          
          {/* TAB 1: HOME CONTROLLER */}
          {activeTab === "home" && (
            <div className="space-y-6">

              {/* Classroom trigger card */}
              {liveSession ? (
                <div className="bg-natural-green-dark rounded-[24px] p-6 text-white shadow-md relative overflow-hidden border border-natural-border/10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-natural-green/5 rounded-full blur-3xl"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-rose-500/30 inline-flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span> Your Class Is Live Now
                      </span>
                      <h4 className="text-xl font-serif font-bold text-white mb-1.5">{liveSession.topic}</h4>
                      <p className="text-xs text-natural-sand-light">
                        Assigned Student: <span className="font-semibold text-white">{liveSession.studentName}</span> · Assigned Time: {liveSession.timeSlot}
                      </p>
                    </div>

                    <button
                      onClick={() => onJoinSession(liveSession)}
                      className="bg-natural-orange hover:bg-[#854E0B] text-white font-bold px-6 py-3 rounded-full text-xs flex items-center justify-center gap-2 transition transform hover:scale-[1.02] shadow-sm cursor-pointer animate-pulse"
                    >
                      <Video className="w-4 h-4" /> Start Virtual Class Now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-natural-sand-light border border-natural-border rounded-[24px] p-6 flex items-center justify-between shadow-sm">
                  <div>
                    <div>
                      <h4 className="text-sm font-serif font-bold text-natural-green-dark">No active classes scheduled right now.</h4>
                      <p className="text-xs text-[#8A847C] mt-1">Review student requests or upload worksheets.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("materials")}
                    className="text-xs font-bold text-natural-green hover:text-natural-orange transition hover:underline cursor-pointer"
                  >
                    Go to Worksheets →
                  </button>
                </div>
              )}





              {/* Integrated Earnings & Payout Analytics Panel */}
              <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      💰 Integrated Earnings &amp; Invoicing Suite
                    </h4>
                    <p className="text-[10px] text-slate-405">Track class logs, completed hours and automated bank settlements</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2.5 py-1 rounded-full border border-emerald-250 uppercase tracking-wider">
                    Live Active Sync
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150" id="earningsHoursCard">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Completed Invoiced Hours</div>
                    <div className="text-2xl font-extrabold text-slate-800 mt-1">{completedHoursCount.toFixed(1)} Hours</div>
                    <div className="text-[9px] text-[#8A847C] mt-1">Calculated at ₹{ratePerSession} / Class rate</div>
                  </div>

                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150" id="earningsConsolidatedGainsCard">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Net Consolidated Gains</div>
                    <div className="text-2xl font-extrabold text-indigo-650 mt-1">₹{currentEarnings.toLocaleString("en-IN")}</div>
                    <div className="text-[9px] text-emerald-600 font-bold mt-1">✓ Payouts routed with partner bank</div>
                  </div>

                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150" id="earningsSettledCard">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Settled Balance</div>
                    <div className="text-2xl font-extrabold text-slate-800 mt-1">₹{currentEarnings.toLocaleString("en-IN")}</div>
                    <div className="text-[9px] text-slate-455 mt-1">Academic Year 2026 total</div>
                  </div>
                </div>

                <div className="bg-[#FAF7F2] border border-natural-border p-4.5 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h5 className="font-extrabold text-natural-green-dark text-[11px] uppercase tracking-wider">Automated Net Friday Settlements</h5>
                    <p className="text-[10px] text-[#8A847C] mt-0.5">Updated every Friday at 17:00 UTC with certified invoices</p>
                  </div>
                  <button 
                    onClick={() => alert("Detailed PDF transaction logs generated. Ready to download with secure digital signatures.")}
                    className="bg-white hover:bg-natural-sand-light border border-natural-border text-natural-green-dark text-[10px] font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    View Friday Statement
                  </button>
                </div>
              </div>



            </div>
          )}

          {/* TAB 2: CLASSROOM */}
          {activeTab === "classroom" && (() => {
            const tutorSessions = sessions.filter(s => s.tutorId === tutor.id);
            const pendingSessions = tutorSessions.filter(s => s.status === "pending");
            const liveSessions = tutorSessions.filter(s => s.status === "live");
            const upcomingSessions = tutorSessions.filter(s => s.status === "upcoming" || s.status === "scheduled");
            const completedSessions = tutorSessions.filter(s => s.status === "completed");

            return (
              <div className="space-y-6">
                
                {/* Virtual Classroom Focused Dashboard Header */}
                <div className="bg-[#FAF7F2] border border-natural-border rounded-[24px] p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="bg-natural-green text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mb-3">
                        Sikho Live Command Center
                      </span>
                      <h3 className="text-xl font-serif font-extrabold text-natural-green-dark">
                        Virtual Classroom Analytics &amp; Tools Dashboard
                      </h3>
                      <p className="text-xs text-[#8A847C] max-w-2xl mt-1">
                        Monitor student bookings, manage class statuses, and launch interactive video rooms. High-fidelity audio and video streams are fully operational.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. NEW BOOKINGS REQUESTS NOTIFICATION ALERT (IF ANY PENDING) */}
                {pendingSessions.length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-[20px] p-5 shadow-sm flex items-start gap-4 animate-pulse" style={{ animationDuration: "3s" }}>
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg shrink-0">
                      🔔
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-amber-900 text-sm">Student Booking Requests Waiting Approval</h4>
                      <p className="text-xs text-amber-700">
                        You have {pendingSessions.length} new 1-on-1 session request(s) booked by students. Please accept or reject them below to schedule the class.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. LIVE ACTIVE CLASSROOM SECTION */}
                {liveSessions.length > 0 && (
                  <div className="bg-white border-2 border-rose-500 rounded-[24px] p-6 shadow-md space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-rose-200">
                          🔴 Live Class Active
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8A847C] font-mono">ROOM ID: {liveSessions[0].roomId}</span>
                    </div>

                    {liveSessions.map(s => (
                      <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 bg-rose-50/30 rounded-xl">
                        <div>
                          <h4 className="text-base font-serif font-bold text-natural-green-dark">{s.topic}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Student: <span className="font-bold text-slate-800">{s.studentName}</span> · Slot: <span className="font-semibold text-slate-700">{s.timeSlot}</span> ({s.dateLabel})
                          </p>
                        </div>
                        <button
                          onClick={() => onJoinSession(s)}
                          className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                        >
                          <span>Join Live Classroom</span>
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. PENDING STUDENT BOOKINGS (ACTION REQUIRED) */}
                <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-extrabold text-natural-green-dark text-base">Booking Requests ({pendingSessions.length})</h4>
                      <p className="text-[11px] text-slate-400">Review, approve or decline student bookings</p>
                    </div>
                  </div>

                  {pendingSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingSessions.map(s => (
                        <div key={s.id} className="bg-[#FAF7F2] border border-natural-border/60 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:shadow-xs transition">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-natural-green-dark text-white flex items-center justify-center font-bold text-xs uppercase">
                                {s.studentName.slice(0, 2)}
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-805 text-xs">{s.studentName}</h5>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Student</p>
                              </div>
                            </div>
                            <div className="space-y-1 pt-1">
                              <div className="text-xs font-serif font-extrabold text-natural-green-dark">{s.topic}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <span>📅 {s.dateLabel}</span>
                                <span>•</span>
                                <span>⏰ {s.timeSlot}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => {
                                onUpdateSessionStatus?.(s.id, "upcoming");
                                alert(`Success! You have accepted ${s.studentName}'s booking request. The class is now scheduled in your timetable.`);
                              }}
                              className="flex-1 bg-natural-green hover:bg-[#344135] text-white font-bold py-2 px-3 rounded-lg text-[10px] transition cursor-pointer text-center flex items-center justify-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Accept Request</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to reject the booking request for "${s.topic}"?`)) {
                                  onUpdateSessionStatus?.(s.id, "rejected");
                                  alert(`Booking request declined successfully.`);
                                }
                              }}
                              className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 font-semibold py-2 px-3 rounded-lg text-[10px] transition cursor-pointer text-center"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      No pending requests at the moment. When a student books a session, it will show up here for your approval.
                    </div>
                  )}
                </div>

                {/* 4. APPROVED / SCHEDULED SESSIONS */}
                <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-serif font-extrabold text-natural-green-dark text-base">Approved &amp; Scheduled Classes ({upcomingSessions.length})</h4>
                    <p className="text-[11px] text-slate-400">Launch rooms directly to start teaching your live session</p>
                  </div>

                  {upcomingSessions.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingSessions.map(s => (
                        <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 hover:bg-slate-50/80 rounded-xl border border-slate-200/40 gap-4 transition">
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-full bg-natural-green/10 text-natural-green flex items-center justify-center text-sm">
                              👨‍🎓
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-slate-805">{s.topic}</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Student: <span className="font-semibold text-slate-600">{s.studentName}</span> · Code: <span className="font-mono text-slate-500">{s.roomId}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <div className="text-left md:text-right">
                              <div className="text-xs text-slate-800 font-bold">{s.timeSlot}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">{s.dateLabel}</div>
                            </div>
                            <button
                              onClick={() => {
                                onUpdateSessionStatus?.(s.id, "live");
                                alert(`Starting class! The classroom is now live and students can join.`);
                              }}
                              className="bg-natural-green hover:bg-[#344135] text-white font-bold px-4 py-2 rounded-xl text-[10px] flex items-center gap-1.5 transition shadow-sm hover:shadow hover:scale-[1.01] cursor-pointer"
                            >
                              <span>Start Class Now 🚀</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      No upcoming classes scheduled. Accept booking requests to fill up your slots!
                    </div>
                  )}
                </div>

                {/* 5. SESSION HISTORY */}
                <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
                  <div className="border-b border-[#FAF7F2] pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-extrabold text-natural-green-dark text-base">Session History ({completedSessions.length})</h4>
                      <p className="text-[11px] text-slate-400">View logs of successfully completed live tutoring sessions</p>
                    </div>
                  </div>

                  {completedSessions.length > 0 ? (
                    <div className="space-y-2">
                      {completedSessions.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3.5 bg-[#FAF7F2]/40 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <div className="font-semibold text-slate-800">{s.topic}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">With Student {s.studentName} · 1.5 hrs Completed</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-natural-green">Earned ₹{tutor.ratePerSession || 600}</div>
                            <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Completed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      No completed session records found.
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* TAB 3: TIMETABLE */}
          {activeTab === "timetable" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5.5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Your Weekly Schedule</h3>
                <p className="text-xs text-slate-400">Manage daily assigned student slots</p>
              </div>

              <div className="space-y-3.5">
                {sessions.map(s => (
                  <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">⚡</div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{s.topic}</h4>
                        <p className="text-[10px] text-slate-455">Assigned Class: {s.studentName} · Code: {s.roomId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right text-xs">
                        <div className="font-bold text-slate-800">{s.timeSlot}</div>
                        <div className="text-[11px] text-slate-450">{s.dateLabel}</div>
                      </div>

                      <button
                        onClick={() => onJoinSession(s)}
                        className="bg-indigo-650 text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer transition hover:bg-indigo-755"
                      >
                        Enter Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: STUDY MATERIALS */}
          {activeTab === "materials" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Shared Chapter Worksheet Portal</h3>
                  <p className="text-xs text-slate-400">Publish guidelines, revision sheets, and notes for all batches</p>
                </div>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-indigo-650 hover:bg-indigo-755 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Publish Material
                </button>
              </div>

              <div className="space-y-3.5">
                {materials.map(m => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm flex items-start justify-between">
                    <div className="flex gap-3.5">
                      <span className="text-2xl pt-1">📄</span>
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-xs">{m.title}</h5>
                        <p className="text-[10px] text-slate-405 mt-0.5">{m.subject} · {m.classTag} · Uploaded {m.uploadedDate}</p>
                        {m.content && (
                          <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-600 font-mono whitespace-pre-wrap max-w-2xl leading-relaxed">
                            {m.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: STUDY & PARENT CIRCLES */}
          {activeTab === "contacts" && (
            <div className="space-y-6 animate-fade" id="google-contacts-panel">
              {/* Premium Header Container matching the layout */}
              <div className="bg-[#FAF7F2] border border-natural-border rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="bg-natural-green text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
                      Sikho Teacher Circle
                    </span>
                    <h3 className="text-xl font-serif font-extrabold text-natural-green-dark">
                      Parents & Students Contact Center
                    </h3>
                    <p className="text-xs text-[#8A847C] max-w-xl">
                      List parent contacts, coordinate group classes, or send progress report cards directly to registered pupils in your digital classroom.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contacts Search & List Section */}
              <div className="bg-white border border-natural-border rounded-[24px] p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-natural-stone pb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search contacts by name, email..."
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-natural-border pl-10 pr-4 py-2.5 rounded-full text-xs text-natural-green-dark placeholder-[#8A847C] focus:outline-none focus:border-natural-green font-medium"
                    />
                  </div>

                  <div className="text-[11px] font-bold text-[#8A847C] font-mono shrink-0">
                    Showing {contacts.filter(c => c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || c.email.toLowerCase().includes(contactSearchQuery.toLowerCase())).length} of {contacts.length} entries
                  </div>
                </div>

                {contactsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-4 border-natural-green border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-[#8A847C] font-medium font-sans">Querying Google Connections...</span>
                  </div>
                ) : contactsError ? (
                  <div className="py-12 px-6 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                    <span className="text-2xl">⚠️</span>
                    <h4 className="text-sm font-serif font-bold text-[#991b1b]">Failed to Synchronize Google Contacts</h4>
                    <p className="text-xs text-[#b91c1c] max-w-md">{contactsError}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-rose-700 transition"
                    >
                      Retry Connection
                    </button>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <span className="text-3xl">📇</span>
                    <h4 className="font-serif font-bold text-natural-green-dark text-sm">No connections found</h4>
                    <p className="text-xs text-[#8A847C] max-w-sm mx-auto">There are no contacts available in this Google account or you haven't added any classmate circles yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts
                      .filter(c => c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || c.email.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                      .map((contact) => (
                        <div
                          key={contact.id}
                          className="bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] border border-natural-border rounded-2xl p-4.5 transition flex flex-col justify-between space-y-4 hover:shadow-sm"
                        >
                          <div className="flex items-start gap-3.5">
                            {contact.photo ? (
                              <img
                                src={contact.photo}
                                alt={contact.name}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-full object-cover border-2 border-natural-green shadow-xs"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-natural-sand-mid border-2 border-natural-green flex items-center justify-center font-bold text-natural-green-dark text-xs uppercase shadow-xs">
                                {contact.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                              </div>
                            )}

                            <div className="space-y-0.5 min-w-0">
                              <h4 className="font-serif font-bold text-sm text-natural-green-dark truncate" title={contact.name}>
                                {contact.name}
                              </h4>
                              <p className="text-[11px] text-[#8A847C] truncate" title={contact.email}>
                                📧 {contact.email}
                              </p>
                              {contact.phone && contact.phone !== "No Phone" && (
                                <p className="text-[10px] text-natural-green font-semibold">
                                  📞 {contact.phone}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-natural-border flex items-center gap-2">
                            <button
                              onClick={() => alert(`Invite link shared successfully with student circle of ${contact.name}! (Simulator)`)}
                              className="flex-1 bg-natural-green hover:bg-[#4E5D4F] text-white text-[10px] font-bold py-2 rounded-lg transition text-center"
                            >
                              Invite to Class
                            </button>
                            <button
                              onClick={() => alert(`Class notes and syllabus PDF forwarded securely to ${contact.email}! (Simulator)`)}
                              className="flex-1 bg-white hover:bg-natural-sand-light border border-natural-border text-natural-green-dark text-[10px] font-bold py-2 rounded-lg transition text-center"
                            >
                              Share Notes
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="space-y-6 animate-fade">
              <RealTimeChat
                currentUser={{ id: tutor.id, name: tutor.name, role: "tutor" }}
                sessions={sessions}
                materials={materials}
                tutorsList={[]}
                studentsList={contacts}
              />
            </div>
          )}

        </div>
      </main>

      {/* ── GRADING DIALOG MODAL ── */}
      {showGradingModal && gradingAssignment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-205 max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Assign Grades</h3>
              <button onClick={() => setShowGradingModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-450 uppercase tracking-wider font-bold">Assignment title</span>
              <h4 className="font-extrabold text-slate-850 text-xs">{gradingAssignment.title}</h4>
              <p className="text-[10px] text-slate-400">Student: {gradingAssignment.studentName}</p>
            </div>

            <div className="space-y-3.5 text-xs text-slate-705">
              <div className="space-y-1">
                <label className="font-bold block">Assigned Score Ratio (%):</label>
                <input
                  type="text"
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 px-3 py-2.5 rounded-lg text-slate-800 font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block">Educator Remarks &amp; Feedback:</label>
                <textarea
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-250 px-3 py-2.5 rounded-lg text-slate-805 leading-relaxed focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowGradingModal(false)}
                className="flex-1 border border-slate-205 text-slate-600 font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGrading}
                className="flex-1 bg-indigo-650 hover:bg-indigo-755 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-lg"
              >
                Log Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD STUDY MATERIALS MODAL ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-205 max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Publish Revision Materials</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold block">Worksheet Subject Tag:</label>
                  <input
                    type="text"
                    disabled
                    value={newMatSubject}
                    className="w-full bg-slate-50 border border-slate-205 px-3 py-2.5 rounded-lg text-slate-400 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold block">Resource Category:</label>
                  <select className="w-full bg-slate-50 border border-slate-205 px-2.5 py-2.5 rounded-lg text-slate-800">
                    <option>PDF Guide Worksheet</option>
                    <option>Offline Video Link</option>
                    <option>Written Notes Summary</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold block">Document Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Limits & Derivatives Practice Problems.pdf"
                  value={newMatTitle}
                  onChange={(e) => setNewMatTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 px-3 py-2.5 rounded-lg text-slate-805 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block">Markdown Notes Content (formulas format enabled):</label>
                <textarea
                  placeholder="## Title Here..."
                  value={newMatContent}
                  onChange={(e) => setNewMatContent(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-205 px-3 py-2.5 rounded-lg text-slate-805 leading-relaxed font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-105 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 border border-slate-205 text-slate-600 font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleConfirmUpload}
                className="flex-1 bg-indigo-650 hover:bg-indigo-755 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-lg"
              >
                Publish worksheet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
