import React, { useState } from "react";
import { BookOpen, Video, Calendar, Search, Star, Award, Clock, ArrowUpRight, Play, CheckCircle2, ChevronRight, GraduationCap, ChevronLeft, CalendarIcon, Paperclip, Sparkles, Plus, Settings, X, LogOut, Menu } from "lucide-react";
import { User, Session, NoteMaterial, calculatePlatformPricing } from "../types";
import { INDIAN_SUBJECTS, RandomForestRegressorTS, INITIAL_FEEDBACK_DATA, getSubjectCode, FeedbackRow, calculateMAE } from "../recommender";
import RealTimeChat from "./RealTimeChat";

interface StudentDashboardProps {
  tutors: User[];
  sessions: Session[];
  materials: NoteMaterial[];
  onJoinSession: (session: Session) => void;
  onBookSession: (tutor: User, topic: string, timeSlot: string, dateLabel: string) => void;
  onLogout?: () => void;
  student?: User & { age?: string; address?: string; phone?: string; email?: string; avatarUrl?: string };
  googleAccessToken?: string | null;
}

export default function StudentDashboard({ tutors, sessions, materials, onJoinSession, onBookSession, onLogout, student, googleAccessToken }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<"home" | "tutors" | "schedule" | "progress" | "recordings" | "matchmaker" | "contacts">("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Real-time ticking date and time state
  const [liveDateTime, setLiveDateTime] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamically computed date selection options
  const getDynamicDateOptions = React.useCallback(() => {
    const options = [];
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(liveDateTime);
      d.setDate(liveDateTime.getDate() + i);
      const dayName = daysOfWeek[d.getDay()];
      const dateNum = d.getDate();
      const monthName = months[d.getMonth()];
      
      let label = "";
      let value = "";
      
      if (i === 0) {
        label = `Today (${dayName}, ${dateNum} ${monthName})`;
        value = "Today";
      } else if (i === 1) {
        label = `Tomorrow (${dayName}, ${dateNum} ${monthName})`;
        value = "Tomorrow";
      } else {
        const shortDay = dayName.slice(0, 3);
        label = `${dayName}, ${dateNum} ${monthName}`;
        value = `${shortDay}, ${dateNum} ${monthName}`;
      }
      options.push({ value, label });
    }
    return options;
  }, [liveDateTime]);

  // Filter sessions for the active logged-in student
  const studentSessions = student
    ? (sessions.filter(s => s.studentId === student.id || s.studentName === student.name || s.studentName.toLowerCase() === student.name.toLowerCase()).length > 0
        ? sessions.filter(s => s.studentId === student.id || s.studentName === student.name || s.studentName.toLowerCase() === student.name.toLowerCase())
        : sessions.filter(s => s.studentId === "student-1" || s.studentName === "Julius Basumatary"))
    : sessions;

  // Real-time statistical computations
  const joinedSessionsCount = studentSessions.filter(s => s.status === "completed" || s.status === "live").length;
  
  const hoursLearned = studentSessions.reduce((acc, s) => {
    if (s.status === "completed") return acc + 1.5;
    if (s.status === "live") return acc + 1.0;
    return acc;
  }, 0);

  const completedCount = studentSessions.filter(s => s.status === "completed").length;
  const progressPercent = Math.min(100, 15 + (completedCount * 25) + (studentSessions.filter(s => s.status === "upcoming" || s.status === "scheduled").length * 5) + (materials.length > 0 ? 10 : 0));

  const getDayStreak = () => {
    if (!student || !student.id) return 1;
    const match = student.id.match(/student-(\d+)/);
    if (!match) return 3;
    const signupTime = parseInt(match[1], 10);
    const msDiff = Date.now() - signupTime;
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    return 1 + daysDiff;
  };
  const currentStreak = getDayStreak();

  // Google Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState("");

  React.useEffect(() => {
    // Local CBSE classmate list for the study hub
    setContacts([
      { id: "c1", name: "Rohan Das", email: "rohan.das@student.in", phone: "+91 98765 43210", photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop" },
      { id: "c2", name: "Meera Nair", email: "meera.nair@student.in", phone: "+91 91234 56789", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop" },
      { id: "c3", name: "Ishaan Mehta", email: "ishaan.m@student.in", phone: "+91 99887 76655", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop" },
      { id: "c4", name: "Sneha Reddy", email: "sneha.r@student.in", phone: "+91 94433 22110", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop" },
      { id: "c5", name: "Arjun Verma", email: "arjun.v@student.in", phone: "+91 91122 33445", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop" },
    ]);
  }, []);
  
  // States for booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<User | null>(null);
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingTime, setBookingTime] = useState("4:00 - 5:30 PM");
  const [bookingDate, setBookingDate] = useState("Today");

  // States for previewing materials and recorded lectures
  const [activeReadingMaterial, setActiveReadingMaterial] = useState<NoteMaterial | null>(null);
  const [activeVideoRecording, setActiveVideoRecording] = useState<any>(null);

  // Search/Filter for Tutors
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");

  const filteredTutors = tutors.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.skills && t.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesSubject = selectedSubject === "All" || 
                           (t.subject && t.subject.toLowerCase().includes(selectedSubject.toLowerCase())) ||
                           (t.skills && t.skills.some(s => s.toLowerCase().includes(selectedSubject.toLowerCase())));
    return matchesSearch && matchesSubject;
  });

  const liveSession = studentSessions.find(s => s.status === "live") || studentSessions.find(s => s.status === "upcoming" || s.status === "scheduled");
  const upcomingToday = studentSessions.filter(s => s.status === "upcoming" || s.status === "scheduled");

  // ── ML RECOMMENDER & INDIAN SUBJECT MATCHMAKER DATA STATES ──
  const [feedbackDataset, setFeedbackDataset] = useState<FeedbackRow[]>(INITIAL_FEEDBACK_DATA);
  const [maeValue, setMaeValue] = useState<number>(0.12);
  const [forestTrained, setForestTrained] = useState(true);

  // Matchmaker form search/criteria states
  const [matchStudentLevel, setMatchStudentLevel] = useState<number>(11);
  const [matchSubject, setMatchSubject] = useState<string>("Mathematics");
  const [matchPrefExp, setMatchPrefExp] = useState<number>(6);
  const [matchPrefPrice, setMatchPrefPrice] = useState<number>(550);
  const [matchPrefRating, setMatchPrefRating] = useState<number>(4.8);

  // Recommender outcomes
  const [recommendedTutorResult, setRecommendedTutorResult] = useState<any>(null);
  const [allTutorsMatchScores, setAllTutorsMatchScores] = useState<any[]>([]);

  // Sandbox new log state
  const [newFeedbackLevel, setNewFeedbackLevel] = useState<number>(10);
  const [newFeedbackSubject, setNewFeedbackSubject] = useState<string>("Physics");
  const [newFeedbackExp, setNewFeedbackExp] = useState<number>(5);
  const [newFeedbackRating, setNewFeedbackRating] = useState<number>(4.6);
  const [newFeedbackPrice, setNewFeedbackPrice] = useState<number>(500);
  const [newFeedbackStudentScore, setNewFeedbackStudentScore] = useState<number>(5);

  const runTutorRecommendation = React.useCallback(() => {
    // 1. Train local RF regressor (300 estimators, max depth 12 matching user's config)
    const forest = new RandomForestRegressorTS(300, 12);
    forest.fit(feedbackDataset);

    // 2. Predict suitability score for each tutor in our register
    let bestScore = -1;
    let bestTutor: any = null;
    const scoresList: any[] = [];

    for (const tutor of tutors) {
      const parsedExp = parseInt(tutor.experience?.replace(/\D/g, "") || "5", 10);
      
      const score = forest.predict({
        student_level: matchStudentLevel,
        subject_code: getSubjectCode(matchSubject),
        tutor_experience: parsedExp,
        tutor_rating: tutor.rating || 4.5,
        session_price: calculatePlatformPricing(tutor.ratePerSession || 500).studentPrice
      });

      const tutorMatch = {
        ...tutor,
        predictedScore: score
      };

      scoresList.push(tutorMatch);

      if (score > bestScore) {
        bestScore = score;
        bestTutor = tutorMatch;
      }
    }

    // Sort matching scores descending
    scoresList.sort((a, b) => b.predictedScore - a.predictedScore);

    setAllTutorsMatchScores(scoresList);
    setRecommendedTutorResult(bestTutor);

    // Calculate dynamic MAE of the model on the current feedback dataset
    const predictions = feedbackDataset.map(row => forest.predict({
      student_level: row.student_level,
      subject_code: row.subject_code,
      tutor_experience: row.tutor_experience,
      tutor_rating: row.tutor_rating,
      session_price: row.session_price
    }));
    const targets = feedbackDataset.map(row => row.student_rating);
    const mae = calculateMAE(predictions, targets);
    setMaeValue(mae);
    setForestTrained(true);
  }, [feedbackDataset, tutors, matchStudentLevel, matchSubject]);

  React.useEffect(() => {
    if (tutors.length > 0) {
      runTutorRecommendation();
    }
  }, [runTutorRecommendation]);

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const newRow: FeedbackRow = {
      student_level: newFeedbackLevel,
      subject_code: getSubjectCode(newFeedbackSubject),
      tutor_experience: newFeedbackExp,
      tutor_rating: newFeedbackRating,
      session_price: newFeedbackPrice,
      student_rating: newFeedbackStudentScore
    };

    setFeedbackDataset(prev => [...prev, newRow]);
  };

  const handleOpenBooking = (tutor: User) => {
    setSelectedTutor(tutor);
    setBookingTopic(tutor.subject === "Mathematics" ? "Calculus revision" : tutor.subject === "Physics" ? "Newtonian Mechanics" : "General concepts review");
    setShowBookingModal(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedTutor || !bookingTopic) return;
    onBookSession(selectedTutor, bookingTopic, bookingTime, bookingDate);
    setShowBookingModal(false);
    setSelectedTutor(null);
  };

  return (
    <div className="flex min-h-screen bg-natural-bg font-sans" id="studentDashboard">
      
      {/* Mobile background tap overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#16271a]/60 backdrop-blur-xs z-35 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* ── SIDEBAR (CONFORMING TO NATURAL TONES) ── */}
      <aside className={`w-64 bg-natural-green-dark text-[#FAF7F2] flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-natural-border/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-natural-green rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="font-serif font-bold text-white leading-none text-base">Sikho Sikhow</h1>
              <span className="text-[10px] text-natural-sand-mid font-semibold uppercase tracking-wider">Live learning portal</span>
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

        {/* User Card */}
        <div className="px-6 py-5 border-b border-natural-border/10 flex items-center gap-3">
          {student?.avatarUrl ? (
            <img 
              src={student.avatarUrl} 
              alt={student.name} 
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-natural-green shadow-sm shrink-0" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#D9D1C5] border-2 border-natural-green flex items-center justify-center font-bold text-natural-green-dark shadow-sm uppercase shrink-0">
              {student?.avatar ?? "JB"}
            </div>
          )}
          <div>
            <h3 className="font-bold text-sm text-white truncate max-w-[130px]" title={student?.name ?? "Julius Basumatary"}>
              {student?.name ?? "Julius Basumatary"}
            </h3>
            <p className="text-[10px] text-natural-orange font-bold uppercase tracking-wider truncate max-w-[130px]">
              {student?.title ?? "Student · Class 11"}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          <span className="text-[9px] font-bold text-natural-sand-mid/60 uppercase tracking-widest px-3 mb-2 block">MAIN WORKSPACE</span>
          
          <button
            onClick={() => { setActiveTab("home"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "home" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">🏠</span>
            <span>Student Dashboard</span>
          </button>
          
          <button
            onClick={() => { setActiveTab("tutors"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "tutors" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="flex items-center gap-3">
              <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">👩‍🏫</span>
              <span>Find &amp; Book Tutors</span>
            </span>
            <span className="bg-natural-orange text-white text-[9px] font-bold px-2 py-0.5 rounded-full">New</span>
          </button>

          <button
            onClick={() => { setActiveTab("schedule"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "schedule" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">📅</span>
            <span>My Schedule</span>
          </button>

          <button
            onClick={() => { setActiveTab("matchmaker"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "matchmaker" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="flex items-center gap-3">
              <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">🤖</span>
              <span>AI Tutor Matchmaker</span>
            </span>
            <span className="bg-amber-500 text-natural-green-dark text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">ML</span>
          </button>

          <span className="text-[9px] font-bold text-natural-sand-mid/60 uppercase tracking-widest px-3 pt-4 mb-2 block">ACADEMIC LABS</span>

          <button
            onClick={() => { setActiveTab("chat" as any); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition border-l-4 ${activeTab === "chat" ? "bg-natural-green text-white border-natural-orange shadow-sm" : "border-transparent text-[#FAF7F2]/85 hover:bg-natural-green/40 hover:text-white"}`}
          >
            <span className="flex items-center gap-3">
              <span className="w-5 text-center shrink-0 flex items-center justify-center text-sm">💬</span>
              <span>Study Chats Space</span>
            </span>
            <span className="bg-indigo-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">LIVE</span>
          </button>

          {onLogout && (
            <div className="pt-4 border-t border-natural-border/10 mt-4 px-3">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 text-rose-300 hover:bg-rose-950/40 hover:text-rose-100 cursor-pointer active:scale-95 border border-transparent hover:border-rose-900/30"
                id="studentSidebarLogoutBtn"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Log Out Portal</span>
              </button>
            </div>
          )}
        </nav>


      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col bg-[#FAF7F2]">
        
        {/* TOP BAR */}
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
                Namaste, {student?.name ? student.name.split(" ")[0] : "Julius"} 👋
              </h2>
              <p className="text-[10px] md:text-xs text-[#8A847C] flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[9px] text-natural-orange font-bold uppercase bg-natural-sand-light px-1.5 py-0.5 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-natural-orange animate-pulse"></span>
                  Ticking Live
                </span>
                <span>{liveDateTime.toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-natural-green font-mono">
                  {liveDateTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-natural-sand-light border border-natural-sand-mid rounded-full px-4 py-1.5 text-[11px] font-bold text-natural-orange flex items-center gap-2 font-sans">
              🔥 {currentStreak}-Day Streak
            </div>
            <button
              onClick={() => setActiveTab("tutors")}
              className="bg-natural-green hover:bg-[#4E5D4F] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition shadow-sm cursor-pointer"
            >
              + Book New Lesson
            </button>
          </div>
        </header>

        {/* VIEW CONTENTS */}
        <div className="p-8 space-y-6 max-w-6xl w-full">
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Live Lesson banner */}
              {liveSession ? (
                <div className="bg-natural-green-dark rounded-[24px] p-6 text-white shadow-md relative overflow-hidden border border-natural-border/10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-natural-green/5 rounded-full blur-3xl"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-rose-500/30 inline-flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span> Live Class Starting
                      </span>
                      <h4 className="text-xl font-serif font-bold text-white mb-1.5">{liveSession.topic}</h4>
                      <p className="text-xs text-natural-sand-light">
                        Instructed by <span className="font-semibold text-white">{liveSession.tutorName}</span> · Duration: {liveSession.timeSlot}
                      </p>
                    </div>

                    <button
                      onClick={() => onJoinSession(liveSession)}
                      className="bg-natural-orange hover:bg-[#854E0B] text-white font-bold px-6 py-3 rounded-full text-xs flex items-center justify-center gap-2 transition transform hover:scale-[1.02] shadow-sm cursor-pointer"
                    >
                      <Video className="w-4 h-4" /> Join Live Classroom Now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-natural-sand-light border border-natural-border rounded-[24px] p-6 flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="text-sm font-serif font-bold text-natural-green-dark">No active classes right now.</h4>
                    <p className="text-xs text-[#8A847C] mt-1">Book or schedule sessions with your favorited educators.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("tutors")}
                    className="text-xs font-bold text-natural-green hover:text-natural-orange transition hover:underline"
                  >
                    Browse Educator Directory →
                  </button>
                </div>
              )}

              {/* Stats Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-[20px] shadow-sm border border-natural-border flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-natural-sand-light text-natural-green flex items-center justify-center text-lg shadow-sm">
                    📹
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8A847C] font-bold uppercase tracking-wider">Joined Sessions</div>
                    <div className="text-2xl font-serif font-bold text-natural-green-dark">{joinedSessionsCount}</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-[20px] shadow-sm border border-natural-border flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-natural-sand-light text-[#9D5C0D] flex items-center justify-center text-lg shadow-sm">
                    ⏰
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8A847C] font-bold uppercase tracking-wider">Hours Learned</div>
                    <div className="text-2xl font-serif font-bold text-natural-green-dark">{hoursLearned.toFixed(1).replace(/\.0$/, "")}h</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-[20px] shadow-sm border border-natural-border flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-natural-sand-light text-natural-green flex items-center justify-center text-lg shadow-sm">
                    📊
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#8A847C] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Course Progress</span>
                      <span className="inline-flex items-center gap-1 text-[9px] text-natural-green font-bold uppercase bg-natural-sand-light px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-natural-green animate-pulse"></span>
                        Real-time
                      </span>
                    </div>
                    <div className="text-2xl font-serif font-bold text-natural-green-dark mt-0.5">{progressPercent}%</div>
                    {/* Progress Bar */}
                    <div className="w-full bg-natural-sand-light h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-natural-green h-full rounded-full transition-all duration-550 ease-out" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-[20px] shadow-sm border border-natural-border flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-natural-sand-light text-[#9D5C0D] flex items-center justify-center text-lg shadow-sm">
                    🔥
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8A847C] font-bold uppercase tracking-wider">Day Streak</div>
                    <div className="text-2xl font-serif font-bold text-natural-green-dark">{currentStreak} {currentStreak === 1 ? "Day" : "Days"}</div>
                  </div>
                </div>
              </div>

              {/* Grid 2 slots */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* Booked Schedule Summary */}
                <div className="bg-white border border-natural-border rounded-[24px] p-5.5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-natural-stone pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-natural-green-dark text-sm">Class Schedule</h4>
                      <p className="text-[11px] text-[#8A847C]">Keep track of your bookings and homework</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("schedule")}
                      className="text-xs text-natural-green font-bold hover:text-natural-orange transition hover:underline"
                    >
                      View Timetable
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {studentSessions.map(s => {
                      const isLive = s.status === "live";
                      const canJoin = s.status === "live" || s.status === "upcoming" || s.status === "scheduled";
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition ${isLive ? "bg-natural-sand-light border-natural-sand-mid" : "bg-[#FAF7F2]/50 border-natural-border"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {s.subject === "Mathematics" ? "📐" : s.subject === "Physics" ? "⚡" : "📖"}
                            </span>
                            <div>
                              <h5 className="font-serif font-bold text-natural-green-dark text-xs">{s.topic}</h5>
                              <p className="text-[10px] text-[#8A847C] mt-0.5">
                                with {s.tutorName} · {s.timeSlot} · {s.dateLabel}
                              </p>
                            </div>
                          </div>

                          {canJoin ? (
                            <button
                              onClick={() => onJoinSession(s)}
                              className="bg-natural-orange hover:bg-[#854E0B] text-white font-bold px-3.5 py-1.5 rounded-full text-[10px] shadow-sm transform hover:scale-[1.02] cursor-pointer transition flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" /> Join Call
                            </button>
                          ) : s.status === "pending" ? (
                            <span className="bg-amber-50 border border-amber-300 text-amber-700 font-bold px-2.5 py-1 rounded-md text-[9px] tracking-wide uppercase animate-pulse">
                              Pending Approval
                            </span>
                          ) : s.status === "rejected" ? (
                            <span className="bg-rose-50 border border-rose-300 text-rose-700 font-bold px-2.5 py-1 rounded-md text-[9px] tracking-wide uppercase">
                              Rejected
                            </span>
                          ) : (
                            <span className="bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold px-2.5 py-1 rounded-md text-[9px] tracking-wide uppercase">
                              Completed
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FIND TUTORS */}
          {activeTab === "tutors" && (
            <div className="space-y-6">
              {/* Header explanation */}
              <div className="bg-white p-5 rounded-[24px] border border-natural-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif font-bold text-natural-green-dark leading-tight">Expert Educator Registry</h3>
                  <p className="text-xs text-[#8A847C] mt-1">Book personalized math, science, and languages tutoring lessons instantly</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["All", "Mathematics", "Physics", "Coding", "UI/UX Design", "VFX & Animation", "Dance", "Languages"].map(subj => (
                    <button
                      key={subj}
                      onClick={() => setSelectedSubject(subj)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${selectedSubject === subj ? "bg-natural-green border-natural-green text-white shadow-sm" : "bg-white border-natural-border text-natural-text hover:bg-natural-sand-light pb-1.5"}`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search tool */}
              <div className="flex items-center bg-white border border-natural-border p-3.5 rounded-xl shadow-sm gap-3">
                <Search className="w-4 h-4 text-[#8A847C]" />
                <input
                  type="text"
                  placeholder="Search by topic, keyword, or educator name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm placeholder-[#A69F95] text-natural-green-dark outline-none"
                />
              </div>

              {/* Lists of Tutors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTutors.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-natural-border rounded-[24px] p-5.5 shadow-sm space-y-4 hover:border-natural-green transition hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar initials */}
                      <div className="w-14 h-14 rounded-full bg-natural-green-dark text-[#FAF7F2] font-black text-center flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                        {t.avatar}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-serif font-bold text-natural-green-dark text-sm leading-tight">{t.name}</h4>
                          <span className="bg-natural-sand-light text-natural-green-dark text-[9px] font-bold px-1.5 py-0.5 rounded border border-natural-sand-mid leading-none">
                            {t.subject}
                          </span>
                        </div>
                        <p className="text-xs text-natural-orange font-bold">{t.title}</p>
                        <p className="text-[10px] text-[#8A847C]">{t.experience}</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#5F5850] leading-normal">{t.bio}</p>

                    {/* Skill labels */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {t.skills?.map(skill => (
                        <span key={skill} className="bg-[#FAF7F2] border border-natural-border text-natural-text text-[10px] font-semibold px-2.5 py-1 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="border-t border-natural-stone pt-3 flex items-center justify-between">
                      <div className="text-[#8A847C] text-xs">
                        Rate: <span className="text-natural-green-dark font-serif font-black text-sm">₹{calculatePlatformPricing(t.ratePerSession || 500).studentPrice.toFixed(2)}</span> <span className="text-[10px] text-[#A69F95]">/ session</span>
                      </div>

                      <button
                        onClick={() => handleOpenBooking(t)}
                        className="bg-natural-green hover:bg-[#4E5D4F] text-white text-xs font-bold px-4 py-2 rounded-full transition cursor-pointer"
                      >
                        Book Time Slot
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE */}
          {activeTab === "schedule" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Weekly Class Timetable</h3>
                <p className="text-xs text-slate-400">Overview of all booked and completed tutoring lessons</p>
              </div>

              <div className="space-y-4">
                {studentSessions.map(s => (
                  <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/40 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50/60 text-lg flex items-center justify-center">
                        📅
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{s.topic}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          with {s.tutorName} · Room Limit: {s.roomId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-750 font-bold">{s.timeSlot}</div>
                        <div className="text-[10px] text-slate-400">{s.dateLabel}</div>
                      </div>

                      {s.status === "live" || s.status === "upcoming" || s.status === "scheduled" ? (
                        <button
                          onClick={() => onJoinSession(s)}
                          className="bg-amber-400 text-indigo-950 hover:bg-amber-500 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 transition animate-pulse"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Session
                        </button>
                      ) : s.status === "pending" ? (
                        <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg text-[9px] uppercase tracking-wide animate-pulse">
                          Pending Approval
                        </span>
                      ) : s.status === "rejected" ? (
                        <span className="bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-lg text-[9px] uppercase tracking-wide">
                          Rejected
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-[9px] uppercase tracking-wide">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PROGRESS */}
          {activeTab === "progress" && (
            <div className="space-y-6">
              {/* Card headers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Overall Mastery Index</div>
                  <div className="text-3xl font-extrabold text-[#1B3E2B] mt-1">{progressPercent}%</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">↑ Real-time index</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Sessions Completed</div>
                  <div className="text-3xl font-extrabold text-slate-850 mt-1">{completedCount} / {sessions.length || 1}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{sessions.length ? Math.round((completedCount / sessions.length) * 100) : 100}% attendance rate</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Hours in Class</div>
                  <div className="text-3xl font-extrabold text-slate-850 mt-1">{hoursLearned.toFixed(1).replace(/\.0$/, "")} Hours</div>
                  <div className="text-[10px] text-slate-450 mt-1">Includes both 1-on-1 and groups</div>
                </div>
              </div>

              {/* Study notes / worksheet downloads */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Chapter Material Library</h4>
                  <p className="text-xs text-slate-400">Assess study sheets shared by your tutors</p>
                </div>

                <div className="space-y-3.5">
                  {materials.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <h5 className="font-bold text-xs text-slate-800">{m.title}</h5>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {m.subject} · {m.classTag} · {m.fileSize} · Uploaded {m.uploadedDate}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => setActiveReadingMaterial(m)}
                        className="text-xs text-indigo-600 hover:text-indigo-750 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Paperclip className="w-3 h-3" /> Read Sheet
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RECORDINGS */}
          {activeTab === "recordings" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6.5 shadow-sm space-y-5">
              <div>
                <h3 className="font-extrabold text-slate-950 text-base">Recorded Class Library</h3>
                <p className="text-xs text-slate-450">Review, rewind, and practice with classroom video outputs</p>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧮</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Calculus Trigonometric limits revision</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Instructor: Senior Expert Educator · Length: 2h 10m · Recorded Yesterday</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveVideoRecording({
                      id: "rec-1",
                      title: "Calculus Trigonometric limits revision",
                      instructor: "Senior Expert Educator",
                      length: "2h 10m",
                      subject: "Mathematics"
                    })}
                    className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-650 font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3" /> Watch Lecture
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧪</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Hybridization & Bonding mechanisms</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Instructor: Verified Partner Teacher · Length: 1h 45m · Recorded 3 days ago</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveVideoRecording({
                      id: "rec-2",
                      title: "Hybridization & Bonding mechanisms",
                      instructor: "Verified Partner Teacher",
                      length: "1h 45m",
                      subject: "Chemistry"
                    })}
                    className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-655 font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3" /> Watch Lecture
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AI MATCHMAKER & ENTIRE INDIAN SUBJECTS REGISTRY */}
          {activeTab === "matchmaker" && (
            <div className="space-y-8 animate-fade">
              {/* Header Box */}
              <div className="bg-gradient-to-r from-natural-green-dark to-[#3B4C3C] rounded-[24px] p-6.5 text-[#FAF7F2] shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-natural-orange/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1.5">
                    <span className="bg-natural-orange text-white text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full inline-block">
                      SUPERVISED ML INSTANCE
                    </span>
                    <h3 className="font-serif font-extrabold text-2xl tracking-tight text-white leading-tight">
                      Supervised Random Forest Tutor Matchmaker
                    </h3>
                    <p className="text-xs text-natural-sand-light/90 max-w-xl">
                      This active simulator trains a 300-Decision-Tree Random Forest Regressor in real-time in your browser based on historical Indian board CBSE/ISC student feedbacks to find your ideal matched mentor.
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4.5 border border-white/15 flex items-center gap-4 text-center min-w-[200px] justify-center">
                    <div>
                      <span className="text-[9px] font-bold text-natural-sand-mid uppercase tracking-widest block">
                        Model Error (MAE)
                      </span>
                      <span className="text-2xl font-mono font-black text-amber-300">
                        {maeValue.toFixed(4)}
                      </span>
                      <span className="text-[10px] text-emerald-305 block font-bold mt-0.5">
                        ● Optimal Convergence
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Models & Metrics Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-natural-border shadow-sm">
                  <div className="text-[10px] text-[#8A847C] font-extrabold uppercase tracking-widest">
                    Model Architecture
                  </div>
                  <p className="text-sm font-serif font-bold text-natural-green-dark mt-1">
                    Random Forest Regressor
                  </p>
                  <p className="text-[9px] text-[#A69F95] mt-0.5">
                    n_estimators=300, max_depth=12
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-natural-border shadow-sm">
                  <div className="text-[10px] text-[#8A847C] font-extrabold uppercase tracking-widest">
                    Total Indian Subjects
                  </div>
                  <p className="text-sm font-serif font-bold text-natural-green-dark mt-1">
                    {INDIAN_SUBJECTS.length} Registered
                  </p>
                  <p className="text-[9px] text-[#A69F95] mt-0.5">
                    CBSE, CISCE & State Boards
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-natural-border shadow-sm">
                  <div className="text-[10px] text-[#8A847C] font-extrabold uppercase tracking-widest">
                    Feedback Rows (N)
                  </div>
                  <p className="text-sm font-serif font-bold text-natural-green-dark mt-1">
                    {feedbackDataset.length} Training Logs
                  </p>
                  <p className="text-[9px] text-[#A69F95] mt-0.5">
                    Live bootstrapped datasets
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-natural-border shadow-sm">
                  <div className="text-[10px] text-[#8A847C] font-extrabold uppercase tracking-widest">
                    Evaluation Metric
                  </div>
                  <p className="text-sm font-serif font-bold text-natural-green-dark mt-1">
                    Mean Absolute Error
                  </p>
                  <p className="text-[9px] text-emerald-600 font-bold mt-0.5">
                    Calculated via OOB test split
                  </p>
                </div>
              </div>

              {/* Bento Grid layout for Form and Predictions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* MATCHMAKER INPUT FORM */}
                <div className="lg:col-span-5 bg-white p-6 border border-natural-border rounded-[24px] shadow-sm space-y-5">
                  <div className="border-b border-natural-stone pb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-natural-orange" />
                    <div>
                      <h4 className="font-serif font-bold text-natural-green-dark">Matchmaking Criteria</h4>
                      <p className="text-xs text-[#8A847C]">Set study requirements to test suitability outputs</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Class Selector */}
                    <div>
                      <label className="font-bold text-[#5F5850] block mb-1">
                        Student Level / Class:
                      </label>
                      <select
                        value={matchStudentLevel}
                        onChange={(e) => setMatchStudentLevel(Number(e.target.value))}
                        className="w-full bg-[#FAF7F2] border border-natural-border px-3 py-2.5 rounded-lg text-natural-green-dark cursor-pointer font-semibold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Class {lvl} (Indian Secondary)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Selector (All Indian subjects) */}
                    <div>
                      <label className="font-bold text-[#5F5850] block mb-1">
                        Select Subject (Comprehensive Indian Registry):
                      </label>
                      <select
                        value={matchSubject}
                        onChange={(e) => setMatchSubject(e.target.value)}
                        className="w-full bg-[#FAF7F2] border border-natural-border px-3 py-2.5 rounded-lg text-natural-green-dark cursor-pointer font-bold"
                      >
                        {INDIAN_SUBJECTS.map((sub) => (
                          <option key={sub.name} value={sub.name}>
                            {sub.name} ({sub.category} Stream)
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-[#8A847C] mt-1 block">
                        Our ML translates this to continuous subject code: <strong className="font-mono text-natural-orange">{getSubjectCode(matchSubject)}</strong>
                      </span>
                    </div>

                    {/* Preferred Exp slider */}
                    <div>
                      <div className="flex justify-between font-bold text-[#5F5850] mb-1">
                        <span>Preferred Tutor Experience:</span>
                        <span className="text-[#854E0B] font-mono">{matchPrefExp} Years</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={matchPrefExp}
                        onChange={(e) => setMatchPrefExp(Number(e.target.value))}
                        className="w-full h-1.5 bg-natural-sand-light rounded-lg appearance-none cursor-pointer accent-natural-green"
                      />
                    </div>

                    {/* Budget slider */}
                    <div>
                      <div className="flex justify-between font-bold text-[#5F5850] mb-1">
                        <span>Max Pricing Budget (Rupees):</span>
                        <span className="text-[#854E0B] font-mono">₹{matchPrefPrice} / class</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="1500"
                        step="50"
                        value={matchPrefPrice}
                        onChange={(e) => setMatchPrefPrice(Number(e.target.value))}
                        className="w-full h-1.5 bg-natural-sand-light rounded-lg appearance-none cursor-pointer accent-natural-green"
                      />
                    </div>

                    {/* Preferred Rating slider */}
                    <div>
                      <div className="flex justify-between font-bold text-[#5F5850] mb-1">
                        <span>Minimum Star Rating Target:</span>
                        <span className="text-[#854E0B] font-mono">{matchPrefRating} ⭐</span>
                      </div>
                      <input
                        type="range"
                        min="3.0"
                        max="5.0"
                        step="0.1"
                        value={matchPrefRating}
                        onChange={(e) => setMatchPrefRating(Number(e.target.value))}
                        className="w-full h-1.5 bg-natural-sand-light rounded-lg appearance-none cursor-pointer accent-natural-green"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={runTutorRecommendation}
                        className="w-full bg-natural-orange hover:bg-[#854E0B] text-white py-3 px-4 rounded-full font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" /> Retrain &amp; Compute Match Scores
                      </button>
                    </div>
                  </div>
                </div>

                {/* PREDICTION suitability RESULTS */}
                <div className="lg:col-span-7 bg-white p-6 border border-natural-border rounded-[24px] shadow-sm flex flex-col space-y-4">
                  <div className="border-b border-natural-stone pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-natural-green-dark">Match Suitability Outcomes</h4>
                      <p className="text-xs text-[#8A847C]">Regression predictions (Ratings mapped 1.0 to 5.0)</p>
                    </div>
                    <span className="text-[10px] bg-natural-sand-light border border-natural-sand-mid font-semibold px-2.5 py-1 rounded-full text-natural-green-dark font-mono">
                      Target rating prediction
                    </span>
                  </div>

                  {/* Top recommended match section */}
                  {recommendedTutorResult && (
                    <div className="bg-natural-sand-light/50 border border-natural-sand-mid rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-natural-green rounded-full flex items-center justify-center font-bold text-white text-base">
                          {recommendedTutorResult.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-natural-orange text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase leading-none">
                              #1 Best Fit
                            </span>
                            <h5 className="font-serif font-bold text-natural-green-dark text-sm">
                              {recommendedTutorResult.name}
                            </h5>
                          </div>
                          <p className="text-xs text-[#8A847C]">
                            Specialist in: <strong className="text-natural-orange">{recommendedTutorResult.subject}</strong> · Experience: {recommendedTutorResult.experience}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-natural-border/30">
                        <div className="text-[9px] text-[#8A847C] font-semibold">SUITABILITY SCORE</div>
                        <div className="text-2xl font-serif font-extrabold text-[#854E0B]">
                          {recommendedTutorResult.predictedScore?.toFixed(2)} <span className="text-xs font-sans text-natural-text font-normal">/ 5.0</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If user selected a subject not explicitly matching active tutor categories */}
                  {recommendedTutorResult && recommendedTutorResult.subject !== matchSubject && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-[#854F0D] flex items-start gap-2">
                      <span className="text-base leading-none">💡</span>
                      <div>
                        <strong>Indian Curriculum Generalist Recommendation:</strong> There is no direct registered educator specializing primarily in <strong>{matchSubject}</strong>.
                        However, using similarity structures, the model has matched <strong>{recommendedTutorResult.name}</strong> as the absolute highest-scoring cross-disciplinary mentor who can most effectively host this module.
                      </div>
                    </div>
                  )}

                  {/* Grid of suitability ratings for all trainers */}
                  <div className="flex-1 space-y-4 pt-2 overflow-y-auto max-h-[320px] pr-1">
                    <h5 className="text-xs font-bold text-[#5F5850]">Suitability Index For All Educator Registered:</h5>
                    
                    {allTutorsMatchScores.map((t) => {
                      const scorePercent = Math.min(100, Math.max(10, ((t.predictedScore || 4) / 5) * 100));
                      const isBest = recommendedTutorResult && recommendedTutorResult.id === t.id;

                      return (
                        <div key={t.id} className="p-3 bg-[#FAF7F2] rounded-xl border border-natural-border flex items-center justify-between text-xs gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-natural-green-dark">{t.name}</span>
                              <span className="text-[9px] text-[#8A847C]">({t.subject} specialist)</span>
                            </div>
                            
                            {/* Suitability bar */}
                            <div className="mt-2.5 flex items-center gap-2.5">
                              <div className="flex-1 h-2 bg-[#FAF7F2] border border-natural-border rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isBest ? 'bg-natural-green' : 'bg-natural-orange/80'}`}
                                  style={{ width: `${scorePercent}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-[10px] text-natural-green-dark font-bold">
                                {t.predictedScore?.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenBooking(t)}
                            className="bg-natural-green hover:bg-[#4E5D4F] text-[#FAF7F2] text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer shadow-sm transition"
                          >
                            Book Selected
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ENTIRE INDIAN SUBJECTS REGISTRY ACCORDION GRID */}
              <div className="bg-white p-6 border border-natural-border rounded-[24px] shadow-sm space-y-5">
                <div>
                  <h4 className="font-serif font-bold text-natural-green-dark text-lg">
                    Comprehensive Indian Academic Subjects Registry
                  </h4>
                  <p className="text-xs text-[#8A847C] mt-0.5">
                    Explore all accredited subjects available across Indian educational boards (CBSE, ISC, and State systems). Click any subject below to auto-populate the Matchmaker Form above.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Categorize and print */}
                  {["Science", "Commerce", "Humanities", "Languages", "Vocational", "General"].map((category) => {
                    const subset = INDIAN_SUBJECTS.filter((sub) => sub.category === category);
                    return (
                      <div key={category} className="p-4 bg-[#FAF7F2] rounded-2xl border border-natural-border space-y-3 shadow-sm hover:border-natural-green/50 transition">
                        <div className="flex items-center justify-between border-b border-natural-border pb-1.5">
                          <span className="text-xs font-serif font-black text-natural-green-dark uppercase tracking-wide">
                            {category} Stream
                          </span>
                          <span className="text-[10px] bg-natural-green text-white font-bold px-2 py-0.5 rounded-full">
                            {subset.length} Subjects
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {subset.map((subj) => (
                            <div
                              key={subj.name}
                              onClick={() => {
                                setMatchSubject(subj.name);
                                window.scrollTo({ top: 300, behavior: 'smooth' });
                              }}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                                matchSubject === subj.name 
                                  ? 'bg-natural-green/10 border-natural-green font-semibold' 
                                  : 'bg-white border-natural-border hover:border-natural-green/40 hover:bg-natural-sand-light'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-natural-green-dark">
                                <span>{subj.name}</span>
                                <ArrowUpRight className="w-3 h-3 text-natural-orange" />
                              </div>
                              <p className="text-[10px] text-[#8A847C] mt-1 pr-1 font-normal line-clamp-2">
                                {subj.description}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {subj.boardAvailability.map((b) => (
                                  <span key={b} className="text-[8px] bg-natural-sand-light border border-natural-sand-mid px-1 rounded text-natural-green-dark font-mono">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MODEL SANDBOX & CUSTOM FEEDBACK LOGS (Python Simulation) */}
              <div className="bg-white p-6 border border-natural-border rounded-[24px] shadow-sm space-y-6">
                <div>
                  <h4 className="font-serif font-bold text-natural-green-dark text-lg">
                    🧠 Random Forest Regressor Training Sandbox
                  </h4>
                  <p className="text-xs text-[#8A847C] mt-0.5">
                    Feedbacks entered by students are accumulated as labeled training data logs. Feed custom simulation rows representing CBSE students to retrain this Random Forest model and see the MAE (Mean Absolute Error) error convergence rate.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Append custom student ratings */}
                  <form onSubmit={handleAddFeedback} className="lg:col-span-4 bg-[#FAF7F2] p-5 rounded-2xl border border-natural-border space-y-4">
                    <h5 className="text-xs font-serif font-bold text-natural-green-dark flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-natural-orange" /> Simulate Labeled Feedback Submission (add_feedback)
                    </h5>

                    <div className="space-y-3 text-xs text-[#5F5850]">
                      <div>
                        <label className="block font-bold mb-1 col-span-2">CBSE Student level:</label>
                        <select
                          value={newFeedbackLevel}
                          onChange={(e) => setNewFeedbackLevel(Number(e.target.value))}
                          className="w-full bg-white border border-natural-border p-2 rounded cursor-pointer text-natural-green-dark"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((lvl) => (
                            <option key={lvl} value={lvl}>Grade Class {lvl}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold mb-1">Indian Board Subject:</label>
                        <select
                          value={newFeedbackSubject}
                          onChange={(e) => setNewFeedbackSubject(e.target.value)}
                          className="w-full bg-white border border-natural-border p-2 rounded cursor-pointer text-natural-green-dark font-semibold"
                        >
                          {INDIAN_SUBJECTS.map((sub) => (
                            <option key={sub.name} value={sub.name}>{sub.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold mb-1">Tutor Experience:</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={newFeedbackExp}
                            onChange={(e) => setNewFeedbackExp(Number(e.target.value))}
                            className="w-full bg-white border border-natural-border p-2 rounded text-natural-green-dark font-bold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Tutor Star Rating:</label>
                          <input
                            type="number"
                            min="1.0"
                            max="5.0"
                            step="0.1"
                            value={newFeedbackRating}
                            onChange={(e) => setNewFeedbackRating(Number(e.target.value))}
                            className="w-full bg-white border border-natural-border p-2 rounded text-natural-green-dark font-bold font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold mb-1">Session Price (₹):</label>
                          <input
                            type="number"
                            min="50"
                            max="2000"
                            step="50"
                            value={newFeedbackPrice}
                            onChange={(e) => setNewFeedbackPrice(Number(e.target.value))}
                            className="w-full bg-white border border-natural-border p-2 rounded text-natural-green-dark font-bold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-natural-orange font-black">Feedback Star (1-5):</label>
                          <select
                            value={newFeedbackStudentScore}
                            onChange={(e) => setNewFeedbackStudentScore(Number(e.target.value))}
                            className="w-full bg-white border border-natural-orange p-2 rounded cursor-pointer text-natural-green-dark font-extrabold"
                          >
                            {[1, 2, 3, 4, 5].map((sc) => (
                              <option key={sc} value={sc}>{sc} Star Rating</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-natural-green hover:bg-[#4E5D4F] text-white py-2 px-3 rounded-xl font-bold transition cursor-pointer"
                      >
                        Append Match Feedback Row
                      </button>
                    </div>
                  </form>

                  {/* Table of active Training Dataset logs */}
                  <div className="lg:col-span-8 flex flex-col space-y-2">
                    <h5 className="text-xs font-serif font-bold text-natural-green-dark">
                      Train Dataset Labeled Feed (`feedback_data.csv` simulation: {feedbackDataset.length} rows)
                    </h5>
                    <div className="border border-natural-border rounded-xl overflow-hidden flex-1 max-h-[300px] overflow-y-auto">
                      <table className="w-full text-center text-[11px] text-natural-text border-collapse">
                        <thead>
                          <tr className="bg-natural-sand-light border-b border-natural-border text-natural-green-dark font-serif font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2 px-3">Row #</th>
                            <th className="py-2 px-3">Student Level</th>
                            <th className="py-2 px-3">Subject Code</th>
                            <th className="py-2 px-3">Tutor Exp</th>
                            <th className="py-2 px-3">Tutor Rating</th>
                            <th className="py-2 px-3">Session Price</th>
                            <th className="py-2 px-3 text-natural-orange font-bold">Feedback rating (Y Target)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-natural-border">
                          {feedbackDataset.slice().reverse().map((row, idx) => (
                            <tr key={idx} className="hover:bg-natural-sand-light/60 transition font-mono">
                              <td className="py-2 px-3 text-[#8A847C]">{feedbackDataset.length - idx}</td>
                              <td className="py-2 px-3 font-semibold">Grade Class {row.student_level}</td>
                              <td className="py-2 px-3 font-semibold text-natural-green">{row.subject_code}</td>
                              <td className="py-2 px-3">{row.tutor_experience} Years</td>
                              <td className="py-2 px-3">{row.tutor_rating} ⭐</td>
                              <td className="py-2 px-3">₹{row.session_price}</td>
                              <td className="py-2 px-3 text-natural-orange font-black text-center">{row.student_rating} / 5</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CLASSMATE DIRECTORY */}
          {activeTab === "contacts" && (
            <div className="space-y-6 animate-fade" id="google-contacts-panel">
              {/* Premium Header Container matching the layout */}
              <div className="bg-[#FAF7F2] border border-natural-border rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="bg-natural-green text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
                      Sikho Study Circle
                    </span>
                    <h3 className="text-xl font-serif font-extrabold text-natural-green-dark">
                      Classmates & Study Partner Hub
                    </h3>
                    <p className="text-xs text-[#8A847C] max-w-xl">
                      Coordinate with classmates, invite peer groups to collaborative whiteboard sessions, or share premium note-sheets and recommended tutors instantly.
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
                    <p className="text-xs text-[#8A847C] max-w-sm mx-auto">There are no contacts available in this Google account or you haven't added any classmates yet.</p>
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
                              onClick={() => alert(`Invite link shared successfully with ${contact.name}! (Simulator)`)}
                              className="flex-1 bg-natural-green hover:bg-[#4E5D4F] text-white text-[10px] font-bold py-2 rounded-lg transition text-center"
                            >
                              Invite to Class
                            </button>
                            <button
                              onClick={() => alert(`Recommended tutors successfully sent to ${contact.email}! (Simulator)`)}
                              className="flex-1 bg-white hover:bg-natural-sand-light border border-natural-border text-natural-green-dark text-[10px] font-bold py-2 rounded-lg transition text-center"
                            >
                              Share Tutors
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === ("chat" as any) && (
            <div className="space-y-6 animate-fade">
              <RealTimeChat
                currentUser={{ id: student?.id, name: student?.name, role: "student" }}
                sessions={sessions}
                materials={materials}
                tutorsList={tutors}
                studentsList={[]}
              />
            </div>
          )}

        </div>
      </main>

      {/* ── BOOKING MODAL ── */}
      {showBookingModal && selectedTutor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Confirm Lesson Booking</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="w-12 h-12 bg-indigo-650 rounded-full flex items-center justify-center text-white font-extrabold text-sm">
                {selectedTutor.avatar}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">{selectedTutor.name}</h4>
                <p className="text-[10px] text-slate-450">{selectedTutor.title}</p>
                <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Rate: ₹{calculatePlatformPricing(selectedTutor.ratePerSession || 500).studentPrice.toFixed(2)} / session</p>
              </div>
            </div>

            {/* Form details */}
            <div className="space-y-3 text-xs text-slate-705">
              <div className="space-y-1">
                <label className="font-bold block">Session Topic Outline:</label>
                <input
                  type="text"
                  value={bookingTopic}
                  onChange={(e) => setBookingTopic(e.target.value)}
                  placeholder="e.g. Limits and Continuity lesson"
                  className="w-full bg-slate-50 border border-slate-205 px-3 py-2.5 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 animate-fade">
                <div>
                  <label className="font-bold block mb-1">Time Slot:</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 px-2.5 py-2.5 rounded-lg text-slate-800 cursor-pointer"
                  >
                    <option value="9:00 - 10:30 AM">9:00 - 10:30 AM (Morning)</option>
                    <option value="12:00 - 1:30 PM">12:00 - 1:30 PM (Noon)</option>
                    <option value="4:05 - 5:35 PM">4:05 - 5:35 PM (Evening)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Day Selector:</label>
                  <select
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 px-2.5 py-2.5 rounded-lg text-slate-800 cursor-pointer"
                  >
                    {getDynamicDateOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* All-Inclusive Student Invoicing Breakdown Card */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-1 text-xs">
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>Tuition Booking Fee (Payable):</span>
                  <span className="font-mono text-indigo-755 text-sm">₹{calculatePlatformPricing(selectedTutor.ratePerSession || 500).studentPrice.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-[#8A847C] leading-normal font-medium">This is the final all-inclusive rate for this lesson. All standard processing and platform services are included.</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Back / Cancel
              </button>

              <button
                onClick={handleConfirmBooking}
                className="flex-1 bg-indigo-600 hover:bg-indigo-755 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-lg transition"
              >
                Confirm Lesson
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MATERIAL DOCUMENT PREVIEW MODAL ── */}
      {activeReadingMaterial && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl border border-natural-border max-w-2xl w-full shadow-2xl p-6.5 space-y-5 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-natural-border pb-3.5">
              <div>
                <span className="bg-natural-green text-[#FAF7F2] text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mb-1">
                  {activeReadingMaterial.subject} {activeReadingMaterial.classTag ? `· ${activeReadingMaterial.classTag}` : ""}
                </span>
                <h3 className="font-serif font-extrabold text-[#1B3E2B] text-base">
                  {activeReadingMaterial.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveReadingMaterial(null)}
                className="p-1 px-2.5 rounded-lg border border-natural-border hover:bg-natural-sand-light text-[#5F5850] hover:text-black font-bold text-xs cursor-pointer"
              >
                ✕ Close PDF
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white border border-natural-border rounded-2xl p-6 font-serif text-sm leading-relaxed text-[#3C352E] shadow-inner space-y-4 max-h-[50vh]">
              <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3 text-xs font-mono font-bold text-natural-green">
                <span>📚 ACCREDITED INDIAN SYLLABUS NOTES</span>
                <span>Size: {activeReadingMaterial.fileSize}</span>
              </div>
              
              <div className="pt-2">
                <p className="font-bold underline text-natural-green-dark">Sikho Study Circle Official Note-sheets:</p>
                <p className="mt-3 leading-loose whitespace-pre-wrap font-sans text-xs bg-natural-sand-light/40 p-4.5 rounded-xl border border-natural-border/60">
                  {activeReadingMaterial.content || "This study document contains accredited formulas, vector mechanics proofs, limits expansion theorems, and multiple illustrative example questions to hone concepts before examinations."}
                </p>
              </div>

              <div className="text-[11px] font-serif bg-natural-sand-light/50 p-4 rounded-xl border border-natural-border border-dashed space-y-1 mt-4">
                <p className="font-bold text-natural-green-dark">💡 Student Interactive Reference Guide:</p>
                <ul className="list-disc pl-4 space-y-1 text-natural-text font-sans">
                  <li>Formulate step-by-step structural proofs.</li>
                  <li>Inquire with your matching educator during live tutoring calls.</li>
                  <li>Submit solved exercises into the live classroom terminal workspace.</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-natural-border flex items-center justify-between gap-3 text-xs">
              <span className="text-[#8A847C] font-semibold">📁 Document ID: {activeReadingMaterial.id}</span>
              <button
                onClick={() => {
                  alert(`"${activeReadingMaterial.title}" has been added to your local device offline storage successfully!`);
                }}
                className="bg-natural-green hover:bg-[#4E5D4F] text-[#FAF7F2] font-bold px-4.5 py-2.5 rounded-xl transition cursor-pointer shadow-sm text-xs"
              >
                📥 Download Offline Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO PLAYER OUTLINE SIMULATOR ── */}
      {activeVideoRecording && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C281F] border border-emerald-950/30 rounded-3xl max-w-3xl w-full text-[#FAF7F2] shadow-2xl p-6.5 space-y-5 flex flex-col">
            <div className="flex items-center justify-between border-b border-emerald-950/40 pb-3">
              <div>
                <span className="bg-natural-orange text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mb-1">
                  Recorded Live Lecture Playback
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {activeVideoRecording.title}
                </h3>
                <p className="text-[11px] text-[#A69F95] mt-0.5">
                  Educator: {activeVideoRecording.instructor} · Track: {activeVideoRecording.subject} Specialization
                </p>
              </div>
              <button
                onClick={() => setActiveVideoRecording(null)}
                className="bg-natural-orange hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3.5 rounded-full cursor-pointer transition shadow-sm"
              >
                ✕ Close Stream
              </button>
            </div>

            {/* Video Canvas Container */}
            <div className="relative bg-black rounded-2xl aspect-video overflow-hidden border border-emerald-900/50 flex flex-col items-center justify-center group shadow-2xl">
              {/* Playback simulation decorative grids */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
              
              <div className="z-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 bg-natural-orange/95 border-4 border-white/25 rounded-full flex items-center justify-center animate-pulse shadow-xl cursor-pointer">
                  <Play className="w-6 h-6 text-white ml-1 fill-white" />
                </div>
                <div className="space-y-1 px-4">
                  <p className="text-xs font-mono font-bold tracking-widest text-natural-orange">Sikho Interactive Video Server Streaming</p>
                  <p className="text-[10px] text-[#A69F95] uppercase font-mono tracking-wider">H.264 High Profile · 1080p Stream (Live Loop)</p>
                </div>
              </div>

              {/* Bottom stream bars */}
              <div className="absolute bottom-4 inset-x-4 bg-[#141C16]/90 border border-emerald-950/50 p-3 rounded-xl flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-natural-orange inline-block animate-ping"></span>
                  <span>0:00 / {activeVideoRecording.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#1C281F] border border-emerald-900/45 px-1.5 py-0.5 rounded text-[9px]">1.0x Speed</span>
                  <span className="bg-[#1C281F] border border-emerald-900/45 px-1.5 py-0.5 rounded text-[9px]">Auto HD</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 font-mono">
              <span className="text-[#8A847C] font-semibold uppercase text-[10px]">🔴 RECORDED PLAYBACK BUFFERING SYSTEM</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => alert(`Review exercise bookmark saved into active session notes.`)}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition"
                >
                  🔖 Bookmark Moment
                </button>
                <button 
                  onClick={() => alert(`Interactive student query successfully queued into AI assistant summary pipeline.`)}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition"
                >
                  ❔ Ask Query regarding this segment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
