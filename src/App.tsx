/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Session, NoteMaterial, Assignment, calculatePlatformPricing } from "./types";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import Classroom from "./components/Classroom";
import { GraduationCap, ArrowRight, Star, BookOpen, Clock, Heart, Users2, X, Cloud, Terminal } from "lucide-react";
import TeacherSignUp from "./components/TeacherSignUp";
import StudentSignUp from "./components/StudentSignUp";
import SuperAdminPanel from "./components/SuperAdminPanel";
import TermsAndConditions, { CURRENT_TERMS_VERSION } from "./components/TermsAndConditions";
import { isSupabaseConfigured, supabase, dbService, SUPABASE_SCHEMA_SQL } from "./supabase";

// No local pre-seeded mock data or fallback. System relies entirely on Supabase database.
const DEFAULT_TUTORS: User[] = [];
const DEFAULT_MATERIALS: NoteMaterial[] = [];
const DEFAULT_ASSIGNMENTS: Assignment[] = [];
const DEFAULT_REGISTERED_STUDENTS: any[] = [];

export default function App() {
  // Navigation & Role States
  const [currentRole, setCurrentRole] = useState<"student" | "tutor" | "admin" | null>(null);
  const [adminEmailSelected, setAdminEmailSelected] = useState<string>("");
  const [publicStatuses, setPublicStatuses] = useState<Record<string, {
    status?: "active" | "blocked" | "suspended";
    verificationStatus?: "pending" | "verified" | "rejected";
  }>>({});
  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(11.11);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectorTab, setSelectorTab] = useState<"login" | "signup">("login");
  const [showTeacherSignUp, setShowTeacherSignUp] = useState(false);
  const [showStudentSignUp, setShowStudentSignUp] = useState(false);
  const [currentTutorId, setCurrentTutorId] = useState<string>("");
  const [currentStudent, setCurrentStudent] = useState<any>(null);

  // Core synchronized persistent states
  const [tutors, setTutors] = useState<User[]>(DEFAULT_TUTORS);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [materials, setMaterials] = useState<NoteMaterial[]>(DEFAULT_MATERIALS);
  const [assignments, setAssignments] = useState<Assignment[]>(DEFAULT_ASSIGNMENTS);

  // Manual Login Credentials & Remember Me States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Persistent student database to allow logging in with any registered student
  const [registeredStudents, setRegisteredStudents] = useState<any[]>(DEFAULT_REGISTERED_STUDENTS);

  // Supabase states
  const [supabaseActive, setSupabaseActive] = useState(isSupabaseConfigured());
  const [showSqlOverlay, setShowSqlOverlay] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Check terms acceptance on login/signup role changes
  useEffect(() => {
    if (!currentRole) {
      setTermsAccepted(false);
      return;
    }
    
    let activeUserId = "";
    if (currentRole === "student" && currentStudent) {
      activeUserId = currentStudent.id;
    } else if (currentRole === "tutor") {
      const activeTutor = tutors.find(t => t.id === currentTutorId) || tutors[0];
      if (activeTutor) {
        activeUserId = activeTutor.id;
      }
    } else if (currentRole === "admin") {
      setTermsAccepted(true);
      return;
    }

    if (activeUserId) {
      const storedAcceptances = localStorage.getItem("sikho_terms_acceptance_records");
      if (storedAcceptances) {
        try {
          const records = JSON.parse(storedAcceptances);
          const hasAcceptedCurrent = records.some(
            (r: any) => r.userId === activeUserId && r.version === CURRENT_TERMS_VERSION
          );
          if (hasAcceptedCurrent) {
            setTermsAccepted(true);
            return;
          }
        } catch (e) {
          console.error("Failed to parse terms acceptance records", e);
        }
      }
      setTermsAccepted(false);
    }
  }, [currentRole, currentTutorId, currentStudent, tutors]);

  const handleAcceptTerms = (record: {
    userId: string;
    userName: string;
    acceptedAt: string;
    version: string;
    deviceInfo: string;
  }) => {
    const storedAcceptancesStr = localStorage.getItem("sikho_terms_acceptance_records");
    let records = [];
    if (storedAcceptancesStr) {
      try {
        records = JSON.parse(storedAcceptancesStr);
      } catch (e) {
        records = [];
      }
    }
    records = records.filter((r: any) => !(r.userId === record.userId && r.version === record.version));
    records.push(record);
    localStorage.setItem("sikho_terms_acceptance_records", JSON.stringify(records));

    // Update state locally
    if (currentRole === "tutor") {
      setTutors(prev => prev.map(t => t.id === record.userId ? { ...t, termsAcceptedAt: record.acceptedAt, termsVersion: record.version } : t));
    } else if (currentRole === "student") {
      setRegisteredStudents(prev => prev.map(s => s.id === record.userId ? { ...s, termsAcceptedAt: record.acceptedAt, termsVersion: record.version } : s));
    }

    setTermsAccepted(true);
  };

  // Load data from Supabase if active, otherwise fallback to LocalStorage
  useEffect(() => {
    if (isSupabaseConfigured()) {
      const loadSupabaseData = async () => {
        setLoadingDb(true);
        try {
          // 1. Profiles & Tutors
          const dbProfiles = await dbService.getProfiles();
          if (dbProfiles && dbProfiles.length > 0) {
            const fetchedTutors = dbProfiles.filter(p => p.role === "tutor");
            const fetchedStudents = dbProfiles.filter(p => p.role === "student");
            if (fetchedTutors.length > 0) setTutors(fetchedTutors);
            if (fetchedStudents.length > 0) setRegisteredStudents(fetchedStudents);
          }

          // 2. Sessions
          const dbSessions = await dbService.getSessions();
          if (dbSessions && dbSessions.length > 0) {
            setSessions(dbSessions);
          }

          // 3. Materials
          const dbMaterials = await dbService.getMaterials();
          if (dbMaterials && dbMaterials.length > 0) {
            setMaterials(dbMaterials);
          }

          // 4. Assignments
          const dbAssignments = await dbService.getAssignments();
          if (dbAssignments && dbAssignments.length > 0) {
            setAssignments(dbAssignments);
          }
        } catch (err) {
          console.error("Supabase initial fetch / seed error. Proceeding with fallback.", err);
        } finally {
          setLoadingDb(false);
        }
      };
      loadSupabaseData();
    }
  }, [supabaseActive]);

  // ── SUPER ADMIN CONFIGS AND SESSION KILLED HANDLERS ──
  const fetchPublicStatuses = async () => {
    try {
      const res = await fetch("/api/public/user-statuses");
      if (res.ok) {
        const data = await res.json();
        if (data.userStatuses) setPublicStatuses(data.userStatuses);
        if (data.settings && data.settings.commissionRate !== undefined) {
          setPlatformCommissionRate(data.settings.commissionRate);
        }
      }
    } catch (err) {
      console.warn("Public status configurations fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchPublicStatuses();
  }, [currentRole]);

  // Session termination engine for blocked or suspended users
  useEffect(() => {
    if (currentStudent && publicStatuses[currentStudent.id]?.status && publicStatuses[currentStudent.id]?.status !== "active") {
      setCurrentStudent(null);
      setCurrentRole(null);
      alert("ACCESS DENIED: Your student account has been BLOCKED or SUSPENDED by the Super Admin.");
    }
    if (currentTutorId && publicStatuses[currentTutorId]?.status && publicStatuses[currentTutorId]?.status !== "active") {
      setCurrentTutorId("");
      setCurrentRole(null);
      alert("ACCESS DENIED: Your tutor account has been BLOCKED or SUSPENDED by the Super Admin.");
    }
  }, [publicStatuses, currentStudent, currentTutorId]);

  // Secure router guard for Super Admin Panel
  useEffect(() => {
    const isAuthorizedAdmin = 
      adminEmailSelected === "tutorconnect01@gmail.com" || 
      adminEmailSelected === "tutorconnect1@gmail.com" || 
      adminEmailSelected === "tutorconnect1@gmai.com";

    if (currentRole === "admin" && !isAuthorizedAdmin) {
      setCurrentRole(null);
      alert("Access Denied: Only authorized Super Admins can access the Super Admin Panel.");
    }
  }, [currentRole, adminEmailSelected]);

  // ── REDIRECT LIVE REAL-TIME DATABASE SYNCHRONISATION ──
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel("sikho-realtime-db-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        async () => {
          try {
            const dbProfiles = await dbService.getProfiles();
            if (dbProfiles) {
              setTutors(dbProfiles.filter(p => p.role === "tutor"));
              setRegisteredStudents(dbProfiles.filter(p => p.role === "student"));
            }
          } catch (err) {
            console.error("Realtime profiles sync error:", err);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        async () => {
          try {
            const dbSessions = await dbService.getSessions();
            if (dbSessions) setSessions(dbSessions);
          } catch (err) {
            console.error("Realtime sessions sync error:", err);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "materials" },
        async () => {
          try {
            const dbMaterials = await dbService.getMaterials();
            if (dbMaterials) setMaterials(dbMaterials);
          } catch (err) {
            console.error("Realtime materials sync error:", err);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        async () => {
          try {
            const dbAssignments = await dbService.getAssignments();
            if (dbAssignments) setAssignments(dbAssignments);
          } catch (err) {
            console.error("Realtime assignments sync error:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseActive]);

  // Pre-populate login states
  useEffect(() => {
    setLoginEmail("");
    setLoginPassword("");
  }, []);

  // Robust manual email & password sign-in verification
  const handleManualLogin = async (emailAddress: string, passwordText: string, remember: boolean) => {
    const normalizedEmail = emailAddress.trim().toLowerCase();
    const pw = passwordText.trim();

    if (!normalizedEmail || !pw) {
      alert("Please provide both email address and password.");
      return;
    }

    // ── SUPER ADMIN BYPASS ENTRYWAY ──
    const isAdminEmail = 
      normalizedEmail === "tutorconnect01@gmail.com" || 
      normalizedEmail === "tutorconnect1@gmail.com" || 
      normalizedEmail === "tutorconnect1@gmai.com";

    if (isAdminEmail) {
      if (pw !== "hi wellcome") {
        alert("Access Denied: Incorrect password for Super Admin account.");
        return;
      }
      setCurrentRole("admin");
      setAdminEmailSelected(normalizedEmail);
      setShowRoleSelector(false);
      alert(`Successfully signed in as Super Admin: ${normalizedEmail}!`);
      return;
    }

    // Fetch freshest user status catalog before authorizing entrance
    try {
      const fres = await fetch("/api/public/user-statuses");
      if (fres.ok) {
        const fdata = await fres.json();
        const records = fdata.userStatuses || {};
        
        // Find matching Profile ID from loaded lists (otherwise we check below)
        const match = tutors.find(t => t.email && t.email.toLowerCase() === normalizedEmail) ||
                      registeredStudents.find(s => s.email && s.email.toLowerCase() === normalizedEmail);
                      
        if (match && records[match.id]) {
          const statusVal = records[match.id].status;
          if (statusVal === "blocked") {
            alert("ACCESS DENIED: Your account is BLOCKED by the Super Admin for violating platform Terms of Service.");
            return;
          }
          if (statusVal === "suspended") {
            alert("ACCESS DENIED: Your account is SUSPENDED by the Super Admin for violating classroom guidelines.");
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Real-time check failed, proceeding with offline state:", e);
    }

    // Try Supabase Auth first if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pw,
        });

        if (!error && data?.user) {
          // Auth succeeded! Accessing profile database...
          const dbProfiles = await dbService.getProfiles();
          const foundProfile = dbProfiles.find(p => p.id === data.user.id || (p.email && p.email.toLowerCase() === normalizedEmail));

          if (foundProfile) {
            if (foundProfile.role === "tutor") {
              setTutors(prev => {
                if (!prev.some(t => t.id === foundProfile.id)) {
                  return [...prev, foundProfile];
                }
                return prev;
              });
              setCurrentTutorId(foundProfile.id);
              setCurrentRole("tutor");
            } else {
              setRegisteredStudents(prev => {
                if (!prev.some(s => s.id === foundProfile.id)) {
                  return [...prev, foundProfile];
                }
                return prev;
              });
              setCurrentStudent(foundProfile);
              setCurrentRole("student");
            }
            setShowRoleSelector(false);
            alert(`Successfully signed in via Supabase: ${foundProfile.name}!`);
            return;
          }
        }
      } catch (authErr) {
        console.warn("Supabase auth login failed or yielded error, falling back to local verification:", authErr);
      }
    }

    // Local In-Memory Match (for freshly registered tutors or offline fallback)
    const foundTutor = tutors.find(t => t.email && t.email.toLowerCase() === normalizedEmail);

    if (foundTutor) {
      const expectedPassword = foundTutor.password || "password123";
      if (pw === expectedPassword) {
        setCurrentTutorId(foundTutor.id);
        setCurrentRole("tutor");
        
        setShowRoleSelector(false);
        alert(`Successfully signed in as Tutor: ${foundTutor.name}!`);
        return;
      } else {
        alert("Incorrect password for this Tutor profile. Please check and try again.");
        return;
      }
    }

    // Match against registered student database
    const foundStudent = registeredStudents.find(s => s.email && s.email.toLowerCase() === normalizedEmail);

    if (foundStudent) {
      const expectedPassword = foundStudent.password || "password123";
      if (pw === expectedPassword) {
        setCurrentStudent(foundStudent);
        setCurrentRole("student");
        
        setShowRoleSelector(false);
        alert(`Successfully signed in as Student: ${foundStudent.name}!`);
        return;
      } else {
        alert("Incorrect password for this Student profile. Please check and try again.");
        return;
      }
    }

    alert("No registered account matches this email address. Please try again or create a new account.");
  };

  // Student books a new session
  const handleBookSession = async (tutor: User, topic: string, timeSlot: string, dateLabel: string) => {
    const newSession: Session = {
      id: `sess-${Date.now()}`,
      subject: tutor.subject || "Mathematics",
      topic: `${tutor.subject || "Maths"} — ${topic}`,
      tutorId: tutor.id,
      tutorName: tutor.name,
      tutorAvatar: tutor.avatar,
      studentId: currentStudent?.id || "student-1",
      studentName: currentStudent?.name || "Julius Basumatary",
      timeSlot: timeSlot,
      dateLabel: dateLabel,
      status: "pending", // Initially pending tutor approval
      roomId: `${tutor.subject ? tutor.subject.slice(0, 4).toUpperCase() : "LESSON"}-${Math.floor(100 + Math.random() * 900)}`
    };

    setSessions(prev => [...prev, newSession]);
    if (isSupabaseConfigured()) {
      try {
        await dbService.upsertSession(newSession);
      } catch (err) {
        console.error("Failed to persist booked session to Supabase:", err);
      }
    }
    const pricing = calculatePlatformPricing(tutor.ratePerSession || 500);
    alert(`Success! Requested "${topic}" with ${tutor.name} for ${dateLabel} at ${timeSlot}. The request has been sent to the teacher for approval. Final all-inclusive price: ₹${pricing.studentPrice.toFixed(2)}.`);
  };

  // Tutor grades student assignment
  const handleGradeAssignment = async (assignmentId: string, score: string, feedback: string) => {
    setAssignments(prev => {
      const updated = prev.map(a => 
        a.id === assignmentId ? { ...a, score, feedback, status: "graded" as const, submittedAt: "Just now" } : a
      );
      if (isSupabaseConfigured()) {
        const target = updated.find(a => a.id === assignmentId);
        if (target) {
          dbService.upsertAssignment(target).catch(err => console.error("Supabase assignment grading persist failed:", err));
        }
      }
      return updated;
    });
  };

  const handleUpdateSessionStatus = async (sessionId: string, newStatus: Session["status"]) => {
    setSessions(prev => {
      const updated = prev.map(s => 
        s.id === sessionId ? { ...s, status: newStatus } : s
      );
      if (isSupabaseConfigured()) {
        const found = updated.find(s => s.id === sessionId);
        if (found) {
          dbService.upsertSession(found).catch(err => console.error("Failed to update session status in Supabase:", err));
        }
      }
      return updated;
    });
  };

  // Tutor publishes study sheet
  const handleUploadMaterial = async (subject: string, title: string, content: string) => {
    const newMaterial: NoteMaterial = {
      id: `mat-${Date.now()}`,
      subject,
      title,
      type: "pdf",
      fileSize: `${(0.5 + Math.random() * 2).toFixed(1)} MB`,
      uploadedDate: "Today",
      classTag: "Class 11 Science",
      content
    };

    setMaterials(prev => [...prev, newMaterial]);
    if (isSupabaseConfigured()) {
      try {
        await dbService.upsertMaterial(newMaterial);
      } catch (err) {
        console.error("Failed to persist material to Supabase:", err);
      }
    }
  };

  // Tutor toggles availability status
  const handleToggleAvailability = async () => {
    const targetId = currentTutorId || "tutor-1";
    setTutors(prev => {
      const updated = prev.map(t => 
        t.id === targetId ? { ...t, isOnline: !t.isOnline } : t
      );
      if (isSupabaseConfigured()) {
        const target = updated.find(t => t.id === targetId);
        if (target) {
          dbService.upsertProfile(target).catch(err => console.error("Supabase profile status persist failed:", err));
        }
      }
      return updated;
    });
    const updatedTutor = tutors.find(t => t.id === targetId);
    if (updatedTutor) {
      alert(`Status changed! ${updatedTutor.name} is now ${!updatedTutor.isOnline ? "ONLINE" : "OFFLINE"}`);
    }
  };

  // Tutor updates hourly/session pricing
  const handleUpdatePricing = async (newPrice: number) => {
    const targetId = currentTutorId || "tutor-1";
    setTutors(prev => {
      const updated = prev.map(t => 
        t.id === targetId ? { ...t, ratePerSession: Number(newPrice) } : t
      );
      if (isSupabaseConfigured()) {
        const target = updated.find(t => t.id === targetId);
        if (target) {
          dbService.upsertProfile(target).catch(err => console.error("Supabase profile pricing persist failed:", err));
        }
      }
      return updated;
    });
  };

  // Transition directly into Live Class Room
  const handleJoinSession = async (session: Session) => {
    const updatedSession: Session = { ...session, status: "live" as const };
    setSessions(prev => prev.map(s => 
      s.id === session.id ? updatedSession : s
    ));
    if (isSupabaseConfigured()) {
      try {
        await dbService.upsertSession(updatedSession);
      } catch (err) {
        console.error("Failed to transition session state in Supabase:", err);
      }
    }
    setActiveSession(updatedSession);
  };

  const handleLeaveSession = async () => {
    // Revert status to completed on exit
    if (activeSession) {
      const updatedSession: Session = { ...activeSession, status: "completed" as const };
      setSessions(prev => prev.map(s => 
        s.id === activeSession.id ? updatedSession : s
      ));
      if (isSupabaseConfigured()) {
        try {
          await dbService.upsertSession(updatedSession);
        } catch (err) {
          console.error("Failed to mark session as complete in Supabase:", err);
        }
      }
    }
    setActiveSession(null);
  };

  // ── RENDER ACTIVE VIEW ROUTING ──
  if (activeSession) {
    return (
      <Classroom
        session={activeSession}
        userRole={currentRole || "student"}
        onLeave={handleLeaveSession}
      />
    );
  }

  // ── MANDATORY TERMS AND CONDITIONS ROUTER GUARD ──
  if (currentRole && (currentRole === "student" || currentRole === "tutor") && !termsAccepted) {
    let activeUserId = "";
    let activeUserName = "";
    if (currentRole === "student" && currentStudent) {
      activeUserId = currentStudent.id;
      activeUserName = currentStudent.name;
    } else if (currentRole === "tutor") {
      const activeTutor = tutors.find(t => t.id === currentTutorId) || tutors[0];
      if (activeTutor) {
        activeUserId = activeTutor.id;
        activeUserName = activeTutor.name;
      }
    }

    return (
      <TermsAndConditions
        userId={activeUserId}
        userName={activeUserName}
        userRole={currentRole}
        onAccept={handleAcceptTerms}
      />
    );
  }

  if (currentRole === "admin") {
    return (
      <SuperAdminPanel
        adminEmail={adminEmailSelected}
        allTutors={tutors}
        allStudents={registeredStudents}
        allSessions={sessions}
        allMaterials={materials}
        onLogout={() => {
          setCurrentRole(null);
          setAdminEmailSelected("");
          setLoginEmail("");
          setLoginPassword("");
        }}
      />
    );
  }

  if (currentRole === "student") {
    return (
      <StudentDashboard
        tutors={tutors}
        sessions={sessions}
        materials={materials}
        onJoinSession={handleJoinSession}
        onBookSession={handleBookSession}
        onLogout={() => {
          setCurrentRole(null);
          setLoginEmail("");
          setLoginPassword("");
        }}
        student={currentStudent || undefined}
        googleAccessToken={null}
      />
    );
  }

  if (currentRole === "tutor") {
    const activeTutor = tutors.find(t => t.id === currentTutorId) || tutors[0];
    return (
      <TutorDashboard
        tutor={activeTutor}
        sessions={sessions}
        materials={materials}
        assignments={assignments}
        onJoinSession={handleJoinSession}
        onGradeAssignment={handleGradeAssignment}
        onUploadMaterial={handleUploadMaterial}
        onToggleAvailability={handleToggleAvailability}
        onLogout={() => {
          setCurrentRole(null);
          setLoginEmail("");
          setLoginPassword("");
        }}
        googleAccessToken={null}
        onUpdatePricing={handleUpdatePricing}
        onUpdateSessionStatus={handleUpdateSessionStatus}
      />
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans flex flex-col justify-between">
      {/* ── SQL SCHEMA OVERLAY Dialog ── */}
      {showSqlOverlay && (
        <div className="fixed inset-0 bg-neutral-900/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 select-text">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-neutral-150 flex items-center justify-between bg-neutral-100">
              <div className="flex items-center gap-2">
                <Terminal className="text-emerald-700 w-5 h-5 animate-pulse" />
                <div>
                  <h3 className="font-serif font-black text-neutral-900 text-base leading-tight">Supabase Setup Guide</h3>
                  <p className="text-[10px] text-neutral-500 font-medium mt-0.5">Ready-to-run queries with public Row Level Security policies</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSqlOverlay(false)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-black cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <p className="leading-relaxed text-neutral-600">
                To link your Supabase project as the cloud backend, configure the environment secrets in the AI Studio sidebar, then copy and paste the SQL script below in your <strong>Supabase Dashboard &gt; SQL Editor</strong> to construct all system tables and open policies:
              </p>
              <div className="relative font-mono">
                <pre className="bg-neutral-900 text-slate-100 rounded-xl p-4 font-mono text-[9px] overflow-x-auto leading-relaxed max-h-[250px] border border-neutral-800">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
                    alert("SQL Schema copied to clipboard!");
                  }}
                  className="absolute top-3 right-3 bg-white/15 hover:bg-white/25 border border-white/10 text-white font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition"
                >
                  Copy to Clipboard 📋
                </button>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 leading-relaxed space-y-1">
                <p className="font-bold text-[11px]">💡 Pro-Tip for File Storage:</p>
                <p className="text-[10.5px]">
                  Go to <strong>Storage</strong> in Supabase, create a bucket with ID <code className="bg-[#D1EADC] px-1 py-0.5 rounded font-mono text-emerald-950">materials</code> and set it to <strong>Public</strong> so tutors can seamlessly publish PDF revision worksheets and syllabus guides.
                </p>
              </div>
            </div>
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
              <button 
                onClick={() => setShowSqlOverlay(false)}
                className="bg-neutral-800 hover:bg-black text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
              >
                Close Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LANDING NAVIGATION WITH NATURAL TONES ── */}
      <nav className="bg-white border-b border-natural-border px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-natural-green rounded-xl flex items-center justify-center shadow-sm">
            <div className="w-4 h-4 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="font-serif font-black text-natural-green-dark tracking-tight text-lg leading-none">Sikho Sikhow</h1>
            <p className="text-[9px] font-bold text-natural-orange uppercase tracking-wider mt-0.5">Learn together, Grow together</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectorTab("login");
              setShowRoleSelector(true);
            }}
            className="text-xs font-semibold text-natural-grey hover:text-natural-green cursor-pointer transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => {
              setSelectorTab("signup");
              setShowRoleSelector(true);
            }}
            className="bg-natural-green hover:bg-[#4E5D4F] text-white font-semibold text-xs px-5 py-2.5 rounded-full transition shadow-sm cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── HERO BANNER & RESPONSIVE SPLIT LAYOUT ── */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Heading, description, CTA */}
        <div className="lg:col-span-7 space-y-6 text-left animate-fade-in">
          <div className="bg-natural-sand-light border border-natural-sand-mid text-natural-orange text-[10px] md:text-[11px] font-bold tracking-wider uppercase px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-natural-orange animate-pulse"></span> ONE STUDENT. ONE TEACHER. UNLIMITED GROWTH
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-black text-natural-green-dark tracking-tight leading-tight">
            Where India's finest <span className="text-natural-orange border-b-4 border-natural-orange/20 pb-1">Educators</span> teach Live
          </h2>

          <p className="text-sm md:text-base text-natural-grey max-w-xl leading-relaxed">
            Book highly personalized 1-on-1 video classes. Boost performance with real-time whiteboards, interactive homework grading, structured worksheets, and instant feedback.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={() => {
                setSelectorTab("login");
                setShowRoleSelector(true);
              }}
              className="bg-natural-green hover:bg-[#3d493e] text-white font-bold text-xs px-8 py-4 rounded-xl transition duration-150 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer h-12"
            >
              <span>Access Learning Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectorTab("signup");
                setShowRoleSelector(true);
              }}
              className="bg-white hover:bg-natural-sand-light text-natural-green-dark border-2 border-natural-green/20 hover:border-natural-green/40 font-bold text-xs px-8 py-4 rounded-xl transition duration-150 text-center flex items-center justify-center cursor-pointer h-12"
            >
              Join as Partner Teacher
            </button>
          </div>

          {/* Core USP Badges */}
          <div className="pt-6 grid grid-cols-3 gap-4 border-t border-natural-border/40">
            <div>
              <div className="font-serif font-bold text-natural-green-dark text-lg md:text-xl">1-on-1</div>
              <div className="text-[10px] font-semibold text-natural-grey uppercase tracking-wider">Dedicated Focus</div>
            </div>
            <div>
              <div className="font-serif font-bold text-natural-green-dark text-lg md:text-xl">100% Verified</div>
              <div className="text-[10px] font-semibold text-natural-grey uppercase tracking-wider">Expert Teachers</div>
            </div>
            <div>
              <div className="font-serif font-bold text-natural-green-dark text-lg md:text-xl">Flexible</div>
              <div className="text-[10px] font-semibold text-natural-grey uppercase tracking-wider">Pay-per-Session</div>
            </div>
          </div>
        </div>

        {/* Right Column: Beautiful responsive visual wrapper with badge overlays */}
        <div className="lg:col-span-5 relative mt-6 lg:mt-0 flex justify-center">
          {/* Back accent circle decorations */}
          <div className="absolute -top-6 -left-6 w-32 h-32 bg-natural-orange/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-natural-green/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Main Visual Frame */}
          <div className="relative w-full max-w-sm md:max-w-md aspect-[4/3] rounded-[32px] overflow-hidden border-8 border-white shadow-xl rotate-1 hover:rotate-0 transition-all duration-500">
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop"
              alt="Live 1-on-1 study room"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-natural-green-dark/65 via-transparent to-transparent"></div>
          </div>

          {/* Decorative floating widgets that scale beautifully */}
          <div className="absolute -top-4 right-2 bg-white rounded-2xl p-3 shadow-md border border-natural-border/30 flex items-center gap-2.5 animate-bounce" style={{ animationDuration: "5s" }}>
            <span className="text-xl">⭐</span>
            <div>
              <div className="font-bold text-[11px] text-natural-green-dark">Top-Tier Quality</div>
              <div className="text-[9px] text-natural-grey">4.9/5 Classroom Rating</div>
            </div>
          </div>

          <div className="absolute -bottom-4 left-2 bg-natural-green-dark text-white rounded-2xl p-3 shadow-lg border border-white/10 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <div className="font-bold text-[11px]">Interactive Rooms</div>
              <div className="text-[9px] text-[#FAF7F2]/80">With Audio, Chat & Chalkboard</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DYNAMIC VALUE-PROP BENTO GRID SECTION ── */}
      <section className="bg-white border-t border-b border-natural-border/30 py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-natural-orange text-[10px] font-bold uppercase tracking-widest bg-natural-sand-light px-3.5 py-1 rounded-full">Platform Framework</span>
            <h3 className="text-2xl md:text-4xl font-serif font-bold text-natural-green-dark tracking-tight">
              Engineered for absolute conceptual clarity
            </h3>
            <p className="text-xs md:text-sm text-natural-grey max-w-xl mx-auto leading-relaxed">
              Say goodbye to pre-recorded video fatigue. Join highly engaging classrooms that respond exactly to your learning pace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-[#FAF7F2] border border-natural-border/40 rounded-3xl p-6.5 hover:shadow-md transition duration-200 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-11 h-11 bg-natural-green/10 text-natural-green rounded-2xl flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                  1️⃣
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-natural-green-dark text-base">Select & Book</h4>
                  <p className="text-xs text-natural-grey leading-relaxed">
                    Browse verified professional educators, pick a custom syllabus topic, and select your ideal timeslot to request an interactive session.
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-natural-orange font-bold uppercase tracking-wider pt-4">Easy & Transparent</div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#FAF7F2] border border-natural-border/40 rounded-3xl p-6.5 hover:shadow-md transition duration-200 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-11 h-11 bg-natural-orange/10 text-natural-orange rounded-2xl flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                  2️⃣
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-natural-green-dark text-base">Real-Time Approval</h4>
                  <p className="text-xs text-natural-grey leading-relaxed">
                    The educator is notified instantly on their dashboard where they can instantly accept or reschedule to keep both agendas perfectly aligned.
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-natural-green font-bold uppercase tracking-wider pt-4">Instant Notification</div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#FAF7F2] border border-natural-border/40 rounded-3xl p-6.5 hover:shadow-md transition duration-200 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-11 h-11 bg-natural-green/10 text-natural-green rounded-2xl flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                  3️⃣
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-natural-green-dark text-base">Launch Live Classroom</h4>
                  <p className="text-xs text-natural-grey leading-relaxed">
                    Enter your live room right from the scheduler. Teach with digital video feeds, interactive chat systems, and live chalkboard elements.
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-natural-orange font-bold uppercase tracking-wider pt-4">Interactive Stream</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SIGN UP / PORTAL SELECTOR OVERLAY MODAL ── */}
      {showRoleSelector && (
        <div className="fixed inset-0 bg-natural-green-dark/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white border border-natural-border/30 rounded-[32px] p-8 md:p-10 max-w-sm w-full relative shadow-2xl space-y-6">
            <button
              onClick={() => setShowRoleSelector(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-natural-grey hover:bg-natural-sand-light transition-colors cursor-pointer"
              aria-label="Close Auth Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif font-bold text-[#1a2f22]">Sikho Gateway</h3>
              <p className="text-xs text-natural-grey">
                Your sandbox-safe premium interactive classroom portal.
              </p>
            </div>

            {/* Custom high-contrast segment controller tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-natural-sand-light rounded-2xl border border-natural-border/40">
              <button
                type="button"
                onClick={() => setSelectorTab("login")}
                className={`py-2 text-xs font-bold rounded-xl transition duration-200 cursor-pointer ${selectorTab === "login" ? "bg-white text-natural-green-dark shadow-sm" : "text-natural-grey hover:text-natural-green-dark"}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setSelectorTab("signup")}
                className={`py-2 text-xs font-bold rounded-xl transition duration-200 cursor-pointer ${selectorTab === "signup" ? "bg-white text-natural-green-dark shadow-sm" : "text-natural-grey hover:text-natural-green-dark"}`}
              >
                Register
              </button>
            </div>

            {selectorTab === "login" ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleManualLogin(loginEmail, loginPassword, rememberMe);
                }}
                className="space-y-4 animate-fade-in"
              >
                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input 
                    type="email"
                    required
                    placeholder="e.g. name@domain.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-natural-sand-light/50 border border-natural-border focus:border-natural-green rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-natural-green-dark flex items-center justify-between uppercase tracking-wider">
                    <span>Password</span>
                  </label>
                  <input 
                    type="password"
                    required
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-natural-sand-light/50 border border-natural-border focus:border-natural-green rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors"
                  />
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-natural-grey cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-natural-border text-natural-green focus:ring-natural-green cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-natural-grey">Remember my account</span>
                  </label>
                </div>

                {/* Submit Sign In */}
                <button
                  type="submit"
                  className="w-full bg-natural-green hover:bg-[#4E5D4F] text-white font-bold text-xs py-3.5 px-6 rounded-2xl transition duration-200 cursor-pointer shadow-sm shadow-[#CEB395]/10 mt-2"
                >
                  Sign In
                </button>


              </form>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center pb-1">
                  <p className="text-xs text-natural-grey">Choose your pathway below to register your account manually.</p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStudentSignUp(true);
                      setShowRoleSelector(false);
                    }}
                    className="w-full text-center bg-white border border-natural-border hover:border-natural-green text-natural-text hover:text-natural-green-dark p-3.5 rounded-2xl transition duration-150 font-bold text-xs cursor-pointer shadow-sm"
                  >
                    📝 Enrol as a Student
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherSignUp(true);
                      setShowRoleSelector(false);
                    }}
                    className="w-full text-center bg-[#FAF7F2] border border-natural-border hover:border-natural-orange text-natural-text hover:text-natural-orange-dark p-3.5 rounded-2xl transition duration-150 font-bold text-xs cursor-pointer shadow-sm"
                  >
                    👩‍🏫 Become a Partner Teacher
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTeacherSignUp && (
        <TeacherSignUp
          onClose={() => setShowTeacherSignUp(false)}
          onSuccess={async (newTutor) => {
            let tutorToSave = { ...newTutor };
            if (isSupabaseConfigured() && supabase) {
              try {
                // Register via Supabase Authentication
                const { data, error } = await supabase.auth.signUp({
                  email: newTutor.email,
                  password: newTutor.password || "password123",
                  options: {
                    data: {
                      name: newTutor.name,
                      role: "tutor",
                      email: newTutor.email,
                      full_name: newTutor.name,
                    }
                  }
                });
                if (error) throw error;
                if (data?.user) {
                  tutorToSave.id = data.user.id;
                }
                await dbService.upsertProfile(tutorToSave);
              } catch (err: any) {
                console.error("Failed to register tutor to Supabase Auth:", err);
                alert(`Supabase Auth Registration: ${err.message || err}. Syncing profile directly to db profiles table.`);
                try {
                  await dbService.upsertProfile(tutorToSave);
                } catch (dbErr) {
                  console.error("Supabase direct profile upsert failed too:", dbErr);
                }
              }
            }
            setTutors(prev => [...prev, tutorToSave]);
            setCurrentTutorId(tutorToSave.id);
            setCurrentRole("tutor");
            setShowTeacherSignUp(false);
          }}
        />
      )}

      {showStudentSignUp && (
        <StudentSignUp
          onClose={() => setShowStudentSignUp(false)}
          onSuccess={async (newStudent) => {
            let studentToSave = { ...newStudent };
            if (isSupabaseConfigured() && supabase) {
              try {
                // Register via Supabase Authentication
                const { data, error } = await supabase.auth.signUp({
                  email: newStudent.email,
                  password: newStudent.password || "password123",
                  options: {
                    data: {
                      name: newStudent.name,
                      role: "student",
                      email: newStudent.email,
                      full_name: newStudent.name,
                    }
                  }
                });
                if (error) throw error;
                if (data?.user) {
                  studentToSave.id = data.user.id;
                }
                await dbService.upsertProfile(studentToSave);
              } catch (err: any) {
                console.error("Failed to register student to Supabase Auth:", err);
                alert(`Supabase Auth Registration: ${err.message || err}. Syncing profile directly to db profiles table.`);
                try {
                  await dbService.upsertProfile(studentToSave);
                } catch (dbErr) {
                  console.error("Supabase direct profile upsert failed too:", dbErr);
                }
              }
            }
            setRegisteredStudents(prev => [...prev, studentToSave]);
            setCurrentStudent(studentToSave);
            setCurrentRole("student");
            setShowStudentSignUp(false);
          }}
        />
      )}

      {/* ── FOOTER STATS ── */}
      <footer id="app-footer-stats-section" className="bg-natural-green-dark text-[#FAF7F2] py-12 px-6 border-t border-natural-border/20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-serif font-bold text-white">
              {loadingDb ? "..." : registeredStudents.length}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-natural-sand-mid mt-1">Live Active Learners</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-white">
              {loadingDb ? "..." : tutors.length}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-natural-sand-mid mt-1">Live Expert Tutors</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-white">
              {loadingDb ? "..." : materials.length}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-natural-sand-mid mt-1">Study Materials Shared</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-white">
              {loadingDb ? "..." : sessions.length}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-natural-sand-mid mt-1">Scheduled Classrooms</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
