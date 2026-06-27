import React, { useState, useEffect } from "react";
import { 
  Users, 
  ShieldAlert, 
  Coins, 
  FileText, 
  Settings2, 
  UserX, 
  UserCheck, 
  RotateCcw, 
  Search, 
  TrendingUp, 
  Calendar, 
  Layers, 
  Power, 
  FolderLock, 
  Clock, 
  Activity, 
  Grid,
  Sparkles,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  X,
  Lock,
  ArrowRight
} from "lucide-react";
import { User, Session, NoteMaterial } from "../types";

interface AuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  targetUserId?: string;
  targetUserName?: string;
  details: string;
}

interface AdminSettings {
  commissionRate: number;
  categories: string[];
  subjects: string[];
  maintenanceMode: boolean;
}

interface SuperAdminPanelProps {
  adminEmail: string;
  allTutors: User[];
  allStudents: User[];
  allSessions: Session[];
  allMaterials: NoteMaterial[];
  onLogout: () => void;
}

export default function SuperAdminPanel({
  adminEmail,
  allTutors,
  allStudents,
  allSessions,
  allMaterials,
  onLogout
}: SuperAdminPanelProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<"users" | "tutors" | "students" | "verification" | "earnings" | "logs" | "settings" | "moderation">("users");

  // Moderation Workspace States
  const [chatReports, setChatReports] = useState<any[]>([]);
  const [loadingChatReports, setLoadingChatReports] = useState(false);
  const [selectedRoomIdDetail, setSelectedRoomIdDetail] = useState<string | null>(null);
  const [inspectedRoomMessages, setInspectedRoomMessages] = useState<any[]>([]);
  const [loadingMessagesAudit, setLoadingMessagesAudit] = useState(false);

  // Trigger chat reports fetch on tab change
  useEffect(() => {
    if (activeTab === "moderation") {
      fetchChatReports();
    }
  }, [activeTab]);

  const fetchChatReports = async () => {
    setLoadingChatReports(true);
    try {
      const response = await fetch("/api/chat/admin/reports", {
        headers: { "x-admin-email": adminEmail }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChatReports(data.reports);
        }
      }
    } catch (e) {
      console.error("Error fetching chat reports:", e);
    } finally {
      setLoadingChatReports(false);
    }
  };

  const fetchRoomMessages = async (roomId: string) => {
    setLoadingMessagesAudit(true);
    setSelectedRoomIdDetail(roomId);
    try {
      const response = await fetch(`/api/chat/admin/room-messages?roomId=${roomId}`, {
        headers: { "x-admin-email": adminEmail }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInspectedRoomMessages(data.messages);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessagesAudit(false);
    }
  };

  const handleResolveReport = async (ticketId: string) => {
    if (!confirm("Are you sure you want to resolve and archive this abuse dispute? This action will write a formal entry to the system audit logs.")) return;
    try {
      const response = await fetch("/api/chat/admin/resolve-report", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": adminEmail 
        },
        body: JSON.stringify({ ticketId, adminEmail })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert("Dispute report resolved successfully.");
          fetchChatReports();
          // Sync audit logs also
          if (data.auditLogs) {
            setAuditLogs(data.auditLogs);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Persistent server state synchronized from our custom APIs
  const [userStatuses, setUserStatuses] = useState<Record<string, {
    status?: "active" | "blocked" | "suspended";
    verificationStatus?: "submitted" | "pending_docs" | "in_progress" | "verified" | "additional_docs" | "rejected" | "pending";
    flagged?: boolean;
    flagReason?: string;
    updatedAt?: string;
  }>>({});
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    commissionRate: 11.11,
    categories: ["School Curricula", "Competitive Exams", "Language Learning", "Music & Drawing"],
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English Literature", "Computer Science"],
    maintenanceMode: false
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [termsAcceptances, setTermsAcceptances] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === "logs") {
      const stored = localStorage.getItem("sikho_terms_acceptance_records");
      if (stored) {
        try {
          setTermsAcceptances(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse terms acceptances", e);
        }
      }
    }
  }, [activeTab]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Search and Filter states
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "student" | "tutor">("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "blocked" | "suspended">("all");

  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("all");

  // Modal Details State
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);

  // Settings Forms Edit State
  const [newCommissionRate, setNewCommissionRate] = useState<number>(11.11);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");

  // Fetch from DB on Mount
  useEffect(() => {
    fetchAdminConfig();
  }, [adminEmail]);

  const fetchAdminConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/dashboard-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({ adminEmail })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.userStatuses) setUserStatuses(data.userStatuses);
        if (data.settings) {
          setAdminSettings(data.settings);
          setNewCommissionRate(data.settings.commissionRate);
        }
        if (data.auditLogs) setAuditLogs(data.auditLogs);
      } else {
        console.error("Failed to load admin context from server");
      }
    } catch (err) {
      console.error("API error syncing admin configs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generic status updater (Block / Unblock / Suspend)
  const handleUpdateStatus = async (userId: string, userName: string, newStatus: "active" | "blocked" | "suspended") => {
    setLoadingAction(userId);
    try {
      const response = await fetch("/api/admin/update-user-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          adminEmail,
          targetUserId: userId,
          targetUserName: userName,
          status: newStatus
        })
      });
      if (response.ok) {
        const data = await response.json();
        setUserStatuses(data.userStatuses);
        setAuditLogs(data.auditLogs);
        alert(`Account for ${userName} has been successfully configured to '${newStatus.toUpperCase()}'.`);
      } else {
        const err = await response.json();
        alert(`Failed to update status: ${err.error || "Internal Error"}`);
      }
    } catch (err) {
      console.error("Error setting user status:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Verification updates
  const handleVerifyTutor = async (userId: string, userName: string, verified: boolean) => {
    setLoadingAction(userId);
    try {
      const response = await fetch("/api/admin/update-tutor-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          adminEmail,
          targetUserId: userId,
          targetUserName: userName,
          verificationStatus: verified ? "verified" : "rejected"
        })
      });
      if (response.ok) {
        const data = await response.json();
        setUserStatuses(data.userStatuses);
        setAuditLogs(data.auditLogs);
        alert(`Tutor credentials filed by ${userName} have been ${verified ? "VERIFIED & APPROVED" : "REJECTED"}.`);
      } else {
        const err = await response.json();
        alert(`Action failed: ${err.error || "Internal Error"}`);
      }
    } catch (err) {
      console.error("Error verifying tutor:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Settings synchronizer
  const handleUpdateCommission = async () => {
    if (newCommissionRate < 0 || newCommissionRate > 100) {
      alert("Invalid commission rate percentage (0-100 expected).");
      return;
    }
    try {
      const response = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          adminEmail,
          settings: { ...adminSettings, commissionRate: newCommissionRate },
          logDetails: `Changed base system processing commission rate to ${newCommissionRate}%.`
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data.settings);
        setAuditLogs(data.auditLogs);
        alert("Platform tariff commission rate synchronized successfully.");
      }
    } catch (err) {
      console.error("Failed to commit settings:", err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const updatedCategories = [...adminSettings.categories, newCategoryName.trim()];
    try {
      const response = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          adminEmail,
          settings: { ...adminSettings, categories: updatedCategories },
          logDetails: `Registered new academic category profile: "${newCategoryName.trim()}"`
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data.settings);
        setAuditLogs(data.auditLogs);
        setNewCategoryName("");
        alert("Category registered successfully.");
      }
    } catch (err) {
      console.error("Failed adding category:", err);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    const updatedSubjects = [...adminSettings.subjects, newSubjectName.trim()];
    try {
      const response = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          adminEmail,
          settings: { ...adminSettings, subjects: updatedSubjects },
          logDetails: `Added course syllabus parameter: "${newSubjectName.trim()}"`
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data.settings);
        setAuditLogs(data.auditLogs);
        setNewSubjectName("");
        alert("Course subject added successfully.");
      }
    } catch (err) {
      console.error("Failed adding subject:", err);
    }
  };

  const handleRemoveCategory = async (indexToRemove: number) => {
    const updated = adminSettings.categories.filter((_, idx) => idx !== indexToRemove);
    try {
      const response = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          adminEmail,
          settings: { ...adminSettings, categories: updated },
          logDetails: `Removed academic category profile index: ${indexToRemove}`
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data.settings);
        setAuditLogs(data.auditLogs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSubject = async (indexToRemove: number) => {
    const updated = adminSettings.subjects.filter((_, idx) => idx !== indexToRemove);
    try {
      const response = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          adminEmail,
          settings: { ...adminSettings, subjects: updated },
          logDetails: `Removed syllabus course index: ${indexToRemove}`
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data.settings);
        setAuditLogs(data.auditLogs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compile combined user list with local states attached
  const combinedUsersList: Array<User & { 
    status: "active" | "blocked" | "suspended"; 
    verificationStatus: "submitted" | "pending_docs" | "in_progress" | "verified" | "additional_docs" | "rejected" | "pending";
    signupDate: string;
    lastActive: string;
  }> = [];

  // Add Tutors
  allTutors.forEach((t, idx) => {
    const record = userStatuses[t.id];
    combinedUsersList.push({
      ...t,
      status: record?.status || "active",
      verificationStatus: record?.verificationStatus || (idx === 0 ? "verified" : "pending"),
      signupDate: t.address ? "2026-05-10" : "2026-06-01",
      lastActive: "Today at 10:44 AM"
    });
  });

  // Add Students
  allStudents.forEach((st) => {
    const record = userStatuses[st.id];
    combinedUsersList.push({
      ...st,
      status: record?.status || "active",
      verificationStatus: "verified", // students don't need tutor verifications
      signupDate: st.phone ? "2026-05-18" : "2026-06-12",
      lastActive: "Active now"
    });
  });

  // Filter Users List
  const filteredUsers = combinedUsersList.filter(user => {
    const nameMatch = user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                      (user.email || "").toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      (user.subject || "").toLowerCase().includes(userSearchQuery.toLowerCase());
    const roleMatch = userRoleFilter === "all" ? true : user.role === userRoleFilter;
    const statusMatch = userStatusFilter === "all" ? true : user.status === userStatusFilter;
    return nameMatch && roleMatch && statusMatch;
  });

  // Tutors List specific Tab
  const activeTutorsList = combinedUsersList.filter(u => u.role === "tutor");
  // Students List specific Tab
  const activeStudentsList = combinedUsersList.filter(u => u.role === "student");

  // Verification Requests queue (tutors with pending status)
  const pendingTutorsQueue = activeTutorsList.filter(t => t.verificationStatus === "pending");

  // Platform Earnings Analytics computations based on real sessions database
  const commissionMultiplier = (adminSettings.commissionRate / 100);
  
  // Total transaction cash flow processed on platform
  const processedTransactionsVolume = allSessions.reduce((sum, s) => {
    // extract tutor rate or fallback
    const matchedTutor = allTutors.find(t => t.id === s.tutorId);
    const tutorRate = matchedTutor?.ratePerSession || 500;
    return sum + tutorRate;
  }, 0);

  // Platform collected commission margins (e.g. 11.11% of base tutor rate processed)
  const collectedCommissionEarned = allSessions.reduce((sum, s) => {
    const matchedTutor = allTutors.find(t => t.id === s.tutorId);
    const tutorRate = matchedTutor?.ratePerSession || 500;
    return sum + (tutorRate * commissionMultiplier);
  }, 0);

  // Complete Audit Logs Filters
  const filteredLogs = auditLogs.filter(log => {
    const searchMatch = log.adminEmail.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                        log.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                        log.details.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                        (log.targetUserName || "").toLowerCase().includes(logSearchQuery.toLowerCase());
    const actionMatch = logActionFilter === "all" ? true : log.action === logActionFilter;
    return searchMatch && actionMatch;
  });

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#222221] font-sans flex flex-col justify-between" id="superAdminMasterContext">
      {/* HEADER BAR */}
      <header className="bg-neutral-900 text-white px-8 py-4.5 flex flex-col md:flex-row md:items-center justify-between border-b border-black shadow-md shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center border border-amber-600 shadow-sm animate-pulse">
            <FolderLock className="text-neutral-950 w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-black text-lg text-amber-400 tracking-tight leading-none">Super Admin Portal</h1>
              <span className="bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded">RBAC Secure</span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-1">Logged as: <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded font-bold font-serif">{adminEmail}</strong></p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button 
            onClick={fetchAdminConfig} 
            disabled={loading}
            className="p-2.5 bg-neutral-800 hover:bg-neutral-750 text-gray-300 font-bold border border-neutral-700 hover:text-white rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh administrative data records"
          >
            <Clock className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Storage
          </button>
          
          <button 
            onClick={onLogout}
            className="bg-red-700 hover:bg-red-800 px-4 py-2.5 rounded-xl border border-red-800 hover:border-red-900 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5" />
            Sign Out Panel
          </button>
        </div>
      </header>

      {/* ADMIN CONTROLS CONTAINER GRID */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT DIRECTORY PANEL RAIL */}
        <div className="lg:col-span-3 bg-white border border-[#E9E6E2] rounded-3xl p-5 shadow-sm space-y-6">
          <div>
            <h3 className="font-serif font-black text-[#1A2F22] text-sm uppercase tracking-wider mb-1.5">Control Tower</h3>
            <p className="text-[10px] text-neutral-500 leading-normal font-medium">Verify credentials, adjust tariff settings, suspend offending accounts, and view synchronized audit books.</p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "users" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                All Users Directory
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.8 py-0.3 rounded-md ${activeTab === "users" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                {combinedUsersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tutors")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "tutors" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4" />
                Tutors Registrar
              </span>
              <span className="text-[10px] font-mono font-bold px-1.8 py-0.3 rounded-md bg-neutral-100/50 text-neutral-600">
                {activeTutorsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "students" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <Grid className="w-4 h-4" />
                Students Roster
              </span>
              <span className="text-[10px] font-mono font-bold px-1.8 py-0.3 rounded-md bg-neutral-100/50 text-neutral-600">
                {activeStudentsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("verification")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "verification" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4" />
                Verification Queue
              </span>
              {pendingTutorsQueue.length > 0 && (
                <span className="bg-amber-500 text-neutral-900 text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
                  {pendingTutorsQueue.length} NEW
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("earnings")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "earnings" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <Coins className="w-4 h-4" />
                Cash Flows &amp; Margins
              </span>
              <span className="text-[10px] font-bold text-emerald-600">
                ₹{collectedCommissionEarned.toFixed(0)}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "logs" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                Integrated Audit Log
              </span>
              <span className="text-[10px] font-mono font-bold px-1.8 py-0.3 rounded-md bg-stone-100 text-[#55524E]">
                {auditLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "settings" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <Settings2 className="w-4 h-4" />
                Platform Settings
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>

            <button
              onClick={() => setActiveTab("moderation")}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-2xl flex items-center justify-between transition ${activeTab === "moderation" ? "bg-natural-green text-white shadow-sm" : "text-[#55524E] hover:bg-neutral-50 hover:text-[#1A2F22]"}`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Abuse &amp; Chat Audit
              </span>
              <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-full font-bold">
                {chatReports.length}
              </span>
            </button>
          </nav>

          <div className="border-t border-neutral-100 pt-4.5 space-y-3 font-serif">
            <h5 className="text-[11px] font-extrabold uppercase tracking-widest text-[#8A847C]">System Monitors</h5>
            
            <div className="bg-neutral-50 rounded-2xl p-3.5 border border-[#ECE9E4] font-sans space-y-2">
              <div className="flex justify-between items-center text-[10px] text-[#A69F95]">
                <span>Sikho Sandbox Node:</span>
                <span className="font-bold text-natural-green-dark">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#A69F95]">
                <span>Supabase Sync Hook:</span>
                <span className="font-bold text-[#E07A5F]">LIVE</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#A69F95]">
                <span>Local FS Db Store:</span>
                <span className="font-bold text-natural-green">HEALTHY</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT DISPLAY WORKPLACE BODY */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TOP REAL-TIME METRICS PANELS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#E9E6E2] rounded-3xl shadow-xs">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400 block mb-1">Total Cash Flow</span>
              <div className="text-xl font-serif font-black text-slate-800">₹{processedTransactionsVolume.toFixed(2)}</div>
              <span className="text-[8px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-200 mt-1.5 inline-block">Tuition booked</span>
            </div>

            <div className="p-4 bg-white border border-[#E9E6E2] rounded-3xl shadow-xs">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400 block mb-1">Platform Commission</span>
              <div className="text-xl font-serif font-black text-indigo-750">₹{collectedCommissionEarned.toFixed(2)}</div>
              <span className="text-[8px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-150 mt-1.5 inline-block">{adminSettings.commissionRate}% base margin</span>
            </div>

            <div className="p-4 bg-white border border-[#E9E6E2] rounded-3xl shadow-xs">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400 block mb-1">Pending Verifications</span>
              <div className="text-xl font-serif font-black text-amber-600">{pendingTutorsQueue.length}</div>
              <span className="text-[8px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 mt-1.5 inline-block">Review queues</span>
            </div>

            <div className="p-4 bg-white border border-[#E9E6E2] rounded-3xl shadow-xs">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400 block mb-1">Audit Trail Actions</span>
              <div className="text-xl font-serif font-black text-rose-700">{auditLogs.length}</div>
              <span className="text-[8px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200 mt-1.5 inline-block">Secured catalog</span>
            </div>
          </div>

          {/* ACTIVE WORKSPACE RENDER VIEWS */}

          {/* TAB 1: ALL USERS DIRECTORY */}
          {activeTab === "users" && (
            <div className="bg-white border border-[#E9E6E2] rounded-3xl p-6 shadow-xs space-y-6 animate-fade">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3.5 gap-3">
                <div>
                  <h3 className="font-serif font-black text-[#1A2F22] text-base">Global Users Directory</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Full search index of students and educators registered across the database.</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    value={userRoleFilter} 
                    onChange={(e: any) => setUserRoleFilter(e.target.value)}
                    className="bg-neutral-50 border border-[#ECE9E4] text-[11px] font-bold px-2.5 py-1.5 rounded-xl text-neutral-800 outline-none cursor-pointer"
                  >
                    <option value="all">Roles (All)</option>
                    <option value="tutor">Tutors Only</option>
                    <option value="student">Students Only</option>
                  </select>

                  <select 
                    value={userStatusFilter} 
                    onChange={(e: any) => setUserStatusFilter(e.target.value)}
                    className="bg-neutral-50 border border-[#ECE9E4] text-[11px] font-bold px-2.5 py-1.5 rounded-xl text-neutral-800 outline-none cursor-pointer"
                  >
                    <option value="all">Status (All)</option>
                    <option value="active">Active Accounts</option>
                    <option value="blocked">Blocked Accounts</option>
                    <option value="suspended">Suspended Accounts</option>
                  </select>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A847C] w-4 h-4 cursor-text" />
                <input
                  type="text"
                  placeholder="Query by name, email descriptor, academic specialty, course..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#ECE9E4] pl-9 pr-4 py-2.5 rounded-2xl text-[11.5px] text-[#222221] font-medium outline-none focus:border-stone-400 placeholder-[#8A847C]"
                />
              </div>

              {/* Users table */}
              <div className="overflow-x-auto rounded-2xl border border-stone-150">
                <table className="w-full border-collapse text-left text-xs bg-white">
                  <thead>
                    <tr className="bg-neutral-50 text-[#8A847C] font-extrabold uppercase text-[9px] tracking-wider border-b border-stone-150">
                      <th className="py-3 px-4">User Identity</th>
                      <th className="py-3 px-4">Role Profile</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Signup Date</th>
                      <th className="py-3 px-4">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 font-serif italic text-xs">
                          No matching registered profiles matching search indices...
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-amber-50/15 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"} 
                                alt="" 
                                className="w-9 h-9 rounded-full object-cover shrink-0 border border-stone-200"
                              />
                              <div>
                                <div className="font-bold text-[#1A2F22] flex items-center gap-1.5">
                                  {user.name}
                                  {user.verificationStatus === "verified" && user.role === "tutor" && (
                                    <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">Verified</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${user.role === "tutor" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-sky-50 text-sky-800 border border-sky-150"}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                              user.status === "active" 
                                ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                                : user.status === "blocked" 
                                ? "bg-rose-100 text-rose-950 border border-rose-300"
                                : "bg-amber-100 text-amber-950 border border-amber-300 font-black animate-pulse"
                            }`}>
                              {user.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-gray-500">
                            {user.signupDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedUserDetails(user)}
                                className="bg-[#FAF7F2] hover:bg-neutral-100 border border-[#ECE9E4] text-[#55524E] px-2.5 py-1.5 rounded-xl font-bold cursor-pointer text-[10.5px] transition"
                              >
                                View Details 📋
                              </button>

                              {/* Toggle block status */}
                              {user.status === "active" ? (
                                <button
                                  onClick={() => handleUpdateStatus(user.id, user.name, "blocked")}
                                  disabled={loadingAction === user.id}
                                  className="bg-red-50 hover:bg-red-150 border border-red-200 hover:border-red-300 text-red-700 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer text-[10.5px] transition"
                                >
                                  Block User
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(user.id, user.name, "active")}
                                  disabled={loadingAction === user.id}
                                  className="bg-emerald-50 hover:bg-emerald-150 border border-emerald-200 hover:border-emerald-300 text-emerald-800 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer text-[10.5px] transition"
                                >
                                  Unblock 🔓
                                </button>
                              )}

                              {/* Suspend optionally */}
                              {user.status !== "suspended" && (
                                <button
                                  onClick={() => handleUpdateStatus(user.id, user.name, "suspended")}
                                  disabled={loadingAction === user.id}
                                  className="bg-amber-50 hover:bg-amber-150 border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer text-[10.5px] transition"
                                  title="Suspend account due to rules violation"
                                >
                                  Suspend Rules Violator
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TUTORS REGISTRAR */}
          {activeTab === "tutors" && (
            <div className="bg-white border border-[#E9E6E2] rounded-3xl p-6 shadow-xs space-y-6 animate-fade">
              <div>
                <h3 className="font-serif font-black text-[#1A2F22] text-base">Tutors Directory</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">Verify credentials, configure courses, view specialties, and active session tarifs.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTutorsList.map(tutor => (
                  <div key={tutor.id} className="border border-stone-200 rounded-2xl p-4.5 space-y-4 hover:border-natural-green/40 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <img src={tutor.avatar} className="w-11 h-11 rounded-2xl object-cover border" alt="" />
                        <div>
                          <h4 className="font-bold text-xs text-[#1A2F22]">{tutor.name}</h4>
                          <span className="text-[10px] text-neutral-500 block leading-tight">{tutor.title || "Educator Partner"}</span>
                          <span className="text-[9.5px] text-[#E07A5F] font-mono leading-tight inline-block font-black uppercase mt-1">{tutor.subject || "No Course Linked"}</span>
                        </div>
                      </div>
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded tracking-wide ${tutor.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                        {tutor.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100 text-[10.5px] text-neutral-600 font-sans space-y-1">
                      <div className="flex justify-between">
                        <span>Original rate:</span>
                        <span className="font-bold text-neutral-800 font-mono">₹{tutor.ratePerSession || 500} / session</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform pricing adjusted:</span>
                        <span className="font-bold text-indigo-700 font-mono">₹{((tutor.ratePerSession || 500) * (1 + commissionMultiplier)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#8A847C] text-[9.5px]">
                        <span>Experience dossier:</span>
                        <span className="font-medium">{tutor.experience || "Fresh application"}</span>
                      </div>
                    </div>

                    {/* Quick controls */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUserDetails(tutor)}
                        className="flex-1 bg-[#FAF7F2] hover:bg-[#F3EFE9] text-[#55524E] border border-[#ECE9E4] text-center font-bold px-3 py-1.8 rounded-xl text-[10px] cursor-pointer transition"
                      >
                        File Dossier 🔬
                      </button>

                      {tutor.status === "active" ? (
                        <button
                          onClick={() => handleUpdateStatus(tutor.id, tutor.name, "blocked")}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.8 rounded-xl text-[10px] cursor-pointer border border-red-200 transition"
                        >
                          Block
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(tutor.id, tutor.name, "active")}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.8 rounded-xl text-[10px] cursor-pointer border border-emerald-200 transition"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STUDENTS ROSTER */}
          {activeTab === "students" && (
            <div className="bg-white border border-[#E9E6E2] rounded-3xl p-6 shadow-xs space-y-6 animate-fade">
              <div>
                <h3 className="font-serif font-black text-[#1A2F22] text-base">Students Active Roster</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">Browse student directory files, block access to troublemakers, or modify permissions indices.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStudentsList.map(student => (
                  <div key={student.id} className="border border-stone-200 rounded-2xl p-4.5 space-y-3.5 hover:border-natural-green/40 transition bg-white shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <img src={student.avatar} className="w-10 h-10 rounded-full object-cover border border-stone-150" alt="" />
                        <div>
                          <h4 className="font-bold text-xs text-[#1A2F22]">{student.name}</h4>
                          <span className="text-[10px] font-serif text-neutral-500 block leading-tight font-black uppercase mt-0.5 text-natural-orange">Regular Learner</span>
                          <span className="text-[10px] text-neutral-400 font-mono block mt-1">{student.email}</span>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${student.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                        {student.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-150 text-[10.5px] text-neutral-600 font-sans space-y-1">
                      <div className="flex justify-between">
                        <span>Contact number:</span>
                        <span className="font-semibold text-slate-800">{student.phone || "No phone linked"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mailing register:</span>
                        <span className="text-gray-500">{student.address || "Assam, India"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUserDetails(student)}
                        className="flex-1 bg-[#FAF7F2] hover:bg-[#F3EFE9] text-[#55524E] border border-[#ECE9E4] font-bold py-1.8 rounded-xl text-[10px] cursor-pointer transition text-center"
                      >
                        Student Record 📋
                      </button>

                      {student.status === "active" ? (
                        <button
                          onClick={() => handleUpdateStatus(student.id, student.name, "blocked")}
                          className="bg-red-50 hover:bg-rose-100 text-red-800 font-bold px-3.5 py-1.8 rounded-xl text-[10px] cursor-pointer border border-red-200 transition"
                        >
                          Block Acc
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(student.id, student.name, "active")}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3.5 py-1.8 rounded-xl text-[10px] cursor-pointer border border-emerald-200 transition"
                        >
                          Unblock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: VERIFICATION QUEUE */}
          {activeTab === "verification" && (
            <div className="bg-white border border-[#E9E6E2] rounded-3xl p-6 shadow-xs space-y-6 animate-fade">
              <div>
                <h3 className="font-serif font-black text-[#1A2F22] text-base flex items-center gap-2">
                  🛡️ Tutor Credentials Validation Desk
                  {pendingTutorsQueue.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full">
                      {pendingTutorsQueue.length} Action Needed
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Approve tutor syllabus authorizations. Applicants receive platform status validations upon authorization.</p>
              </div>

              {pendingTutorsQueue.length === 0 ? (
                <div className="p-10 border border-dashed border-stone-200 rounded-3xl text-center space-y-2">
                  <div className="text-3xl">🎉</div>
                  <h4 className="font-serif font-black text-xs text-[#1A2F22]">Review Desk Entirely Empty</h4>
                  <p className="text-[10px] text-neutral-400 max-w-sm mx-auto">There are currently no newly submitted educator partner validation requests pending evaluation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTutorsQueue.map((tutor) => (
                    <div key={tutor.id} className="border border-amber-200 bg-amber-50/10 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <img src={tutor.avatar} className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-amber-300" alt="" />
                          <div className="space-y-1">
                            <h4 className="font-bold text-xs text-[#1A2F22]">{tutor.name}</h4>
                            <p className="text-[10px] text-gray-400 font-mono italic leading-none">{tutor.email}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[8.5px] px-2 py-0.5 rounded uppercase">{tutor.subject} Specialist</span>
                              <span className="bg-neutral-100 text-neutral-600 border border-neutral-200 font-bold text-[8.5px] px-2 py-0.5 rounded uppercase">{tutor.experience || "No experience declared"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Approve / Reject Panel */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerifyTutor(tutor.id, tutor.name, false)}
                            disabled={loadingAction === tutor.id}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold px-3.5 py-2 rounded-xl text-xs cursor-pointer border border-rose-200 transition"
                          >
                            Reject Application ❌
                          </button>
                          
                          <button
                            onClick={() => handleVerifyTutor(tutor.id, tutor.name, true)}
                            disabled={loadingAction === tutor.id}
                            className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer border border-emerald-700 transition flex items-center gap-1 shadow-sm font-serif"
                          >
                            Approve &amp; Verify Partner 🎓
                          </button>
                        </div>
                      </div>

                      {/* Bio details / credentials statement */}
                      <div className="bg-white/80 p-3.5 border border-amber-150 rounded-xl text-xs leading-relaxed text-[#55524E]">
                        <strong className="text-[9.5px] uppercase tracking-wider block text-amber-900 font-serif mb-1">Educator Professional Statement:</strong>
                        {tutor.bio || "No professional overview bio was written for this application. Please authorize with discretion based on listed subjects."}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COMMISSION & CASH FLOWS */}
          {activeTab === "earnings" && (
            <div className="bg-white border border-[#E9E6E2] rounded-3xl p-6 shadow-xs space-y-6 animate-fade">
              <div>
                <h3 className="font-serif font-black text-[#1A2F22] text-base">Ecosystem Earnings &amp; Reports</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Platform margins collected from processed virtual session volumes.</p>
              </div>

              {/* Earnings Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50/40 border border-emerald-150 p-5 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-emerald-800 block mb-1 tracking-widest">Platform Margins</span>
                  <p className="text-[8px] text-emerald-600 mb-1 font-medium font-sans">Accumulated 11.11% service fee on all classrooms</p>
                  <div className="text-2xl font-serif font-black text-[#1A2F22]">₹{collectedCommissionEarned.toFixed(2)}</div>
                </div>

                <div className="bg-indigo-50/40 border border-indigo-150 p-5 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-indigo-800 block mb-1 tracking-widest">Gross Cash Volume</span>
                  <p className="text-[8px] text-indigo-600 mb-1 font-medium font-sans">Sum total processed bookings transaction flow</p>
                  <div className="text-2xl font-serif font-black text-indigo-950">₹{processedTransactionsVolume.toFixed(2)}</div>
                </div>

                <div className="bg-neutral-50 border border-[#ECE9E4] p-5 rounded-2xl">
                  <span className="text-[9px] uppercase font-black text-neutral-500 block mb-1 tracking-widest">Authorized Settings</span>
                  <p className="text-[8px] text-neutral-450 mb-1 font-medium font-sans">Commission Rate percentage set securely</p>
                  <div className="text-2xl font-serif font-black text-neutral-800">{adminSettings.commissionRate}%</div>
                </div>
              </div>

              {/* Dynamic commission management form */}
              <div className="border border-stone-200 rounded-3xl p-5 space-y-4">
                <div>
                  <h4 className="font-serif font-black text-xs text-[#1A2F22]">Modify Ecosystem Tariff Commission Rate</h4>
                  <p className="text-[10px] text-neutral-450 mt-0.5 leading-normal font-medium">Changing the rate automatically structures booking invoices. Students are invoiced the base rate increased by this margin percentage.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
                  <div className="relative w-full">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      placeholder="e.g. 11.11"
                      value={newCommissionRate}
                      onChange={(e) => setNewCommissionRate(Number(e.target.value))}
                      className="w-full bg-[#FAF7F2] border border-[#ECE9E4] px-4 py-2 text-xs text-[#222221] font-bold font-mono rounded-xl outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-450 font-bold text-xs">%</span>
                  </div>

                  <button
                    onClick={handleUpdateCommission}
                    className="w-full sm:w-auto bg-natural-green hover:bg-[#4D5A4E] text-white font-bold font-serif text-xs px-5 py-2.5 rounded-xl border border-[#4C5B4E] shadow-sm cursor-pointer whitespace-nowrap transition"
                  >
                    Set Tariff Comm Rate
                  </button>
                </div>
              </div>

              {/* Ecosystem booking list breakdown */}
              <div className="space-y-3">
                <h4 className="font-serif font-black text-xs text-[#1A2F22]">Historic Booking Manifest</h4>
                
                <div className="overflow-x-auto rounded-2xl border border-stone-150">
                  <table className="w-full text-xs text-left bg-white">
                    <thead className="bg-[#FAF7F2] text-stone-500 uppercase text-[8.5px] tracking-wider border-b font-extrabold border-stone-200">
                      <tr className="divide-x divide-stone-100">
                        <th className="py-2.5 px-3">Session Topic / specialty</th>
                        <th className="py-2.5 px-3">Educator Client</th>
                        <th className="py-2.5 px-3">Student Invoiced</th>
                        <th className="py-2.5 px-3">Original Rate</th>
                        <th className="py-2.5 px-3">Margin Margin ({adminSettings.commissionRate}%)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-150 font-sans">
                      {allSessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center italic text-stone-400">
                            No virtual classrooms booked yet on this platform.
                          </td>
                        </tr>
                      ) : (
                        allSessions.map((sess) => {
                          const originalPrice = 500; // default mapping price
                          const commVal = originalPrice * commissionMultiplier;
                          return (
                            <tr key={sess.id} className="hover:bg-neutral-50/30">
                              <td className="py-2.5 px-3 font-semibold text-slate-850">{sess.topic}</td>
                              <td className="py-2.5 px-3 font-mono">{sess.tutorName}</td>
                              <td className="py-2.5 px-3 text-stone-600">{sess.studentName}</td>
                              <td className="py-2.5 px-3 font-mono text-gray-500">₹{originalPrice.toFixed(2)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">+ ₹{commVal.toFixed(2)}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full ${
                                  sess.status === "live" ? "bg-red-100 text-red-950 animate-pulse border border-red-200" :
                                  sess.status === "completed" ? "bg-emerald-100 text-emerald-900 border border-emerald-200" :
                                  "bg-indigo-100 text-indigo-900 border border-indigo-200"
                                }`}>
                                  {sess.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: INTEGRATED AUDIT LOGS */}
          {activeTab === "logs" && (
            <div className="bg-white border border-[#E9E6E2] rounded-3xl p-6 shadow-xs space-y-6 animate-fade">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
                <div>
                  <h3 className="font-serif font-black text-[#1A2F22] text-base flex items-center gap-1.5">
                    📖 Unified Administrative Audit Log
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">All Super Admin changes are logged chronologically. Actions performed by other admins sync here.</p>
                </div>
                
                <select 
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="bg-neutral-50 border border-[#ECE9E4] text-[10.5px] font-bold px-2.5 py-1.5 rounded-xl text-neutral-800 outline-none cursor-pointer"
                >
                  <option value="all">Actions (All)</option>
                  <option value="block_user">Block User</option>
                  <option value="unblock_user">Unblock User</option>
                  <option value="suspend_user">Suspend User</option>
                  <option value="verify_tutor">Verify Tutor</option>
                  <option value="reject_tutor">Reject Tutor</option>
                  <option value="update_settings">Update Settings</option>
                </select>
              </div>

              {/* Logs Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A847C] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter logs by admin email, action types, targets, specifics..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#ECE9E4] pl-9 pr-4 py-2 rounded-xl text-xs text-[#222221] font-semibold outline-none focus:border-stone-400 placeholder-[#8A847C]"
                />
              </div>

              {/* Logs list */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredLogs.length === 0 ? (
                  <div className="py-12 border border-dashed rounded-3xl text-center text-stone-400 italic text-xs font-serif">
                    No administrative audit entries logs found matching index query.
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="border border-[#ECE9E4] rounded-2xl p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs bg-[#FBFBFA]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.8">
                          <span className={`text-[8.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded leading-none ${
                            log.action.includes("block") || log.action.includes("suspend") ? "bg-rose-50 text-rose-800 border border-rose-200" :
                            log.action.includes("verify") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                            "bg-indigo-50 text-indigo-800 border border-indigo-200"
                          }`}>
                            {log.action.toUpperCase()}
                          </span>
                          
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-[11.5px] text-[#222221] font-medium leading-relaxed font-sans">{log.details}</p>
                        
                        {log.targetUserId && (
                          <div className="text-[9.5px] text-[#8A847C]">
                            Target Entity ID: <code className="bg-[#FAF7F2] px-1 py-0.2 rounded font-mono text-slate-800 text-[8.5px] border border-stone-200">{log.targetUserId}</code> ({log.targetUserName || "User Profile"})
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-[#55524E] border border-stone-200 font-bold bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl block shadow-3xs">
                          ✍️ {log.adminEmail}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Terms and Conditions Acceptance Records Section */}
              <div className="border-t border-dashed border-[#ECE9E4] pt-6 space-y-4">
                <div className="space-y-0.5">
                  <h4 className="font-serif font-black text-[#1A2F22] text-sm flex items-center gap-1.5">
                    🛡️ Terms &amp; Conditions Acceptance Records
                  </h4>
                  <p className="text-[10px] text-neutral-500">Legal audit trail tracking real-time user agreements, version hashes, and device fingerprints.</p>
                </div>

                <div className="overflow-x-auto border border-[#ECE9E4] rounded-2xl bg-[#FBFBFA]">
                  {termsAcceptances.length === 0 ? (
                    <div className="py-8 text-center text-[#8A847C] italic text-xs font-serif">
                      No Terms and Conditions acceptance records have been submitted yet.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF7F2] border-b border-[#ECE9E4] text-[10px] font-bold text-[#8A847C] uppercase tracking-wider">
                          <th className="p-3.5 pl-4">User Name / ID</th>
                          <th className="p-3.5">Version Accepted</th>
                          <th className="p-3.5">Accepted Timestamp</th>
                          <th className="p-3.5 pr-4">Device Fingerprint</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECE9E4]">
                        {termsAcceptances.map((record, index) => (
                          <tr key={index} className="hover:bg-[#FAF7F2]/45 font-medium text-[#222221]">
                            <td className="p-3.5 pl-4 space-y-0.5">
                              <span className="font-bold text-[#1A2F22] block">{record.userName || "Unknown User"}</span>
                              <span className="text-[9.5px] font-mono text-neutral-400">ID: {record.userId}</span>
                            </td>
                            <td className="p-3.5">
                              <span className="bg-[#FAF7F2] text-natural-orange border border-natural-border/30 text-[10px] font-bold px-2.5 py-1 rounded-full font-mono">
                                v{record.version || "1.0.0"}
                              </span>
                            </td>
                            <td className="p-3.5 text-neutral-500 font-mono text-[10.5px]">
                              {new Date(record.acceptedAt).toLocaleString()}
                            </td>
                            <td className="p-3.5 pr-4 text-neutral-500 font-sans text-[11px]">
                              {record.deviceInfo || "Web Browser"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PLATFORM SETTINGS */}
          {activeTab === "settings" && (
            <div className="bg-white border border-[#E9E6E2] rounded-3xl p-6 shadow-xs space-y-6 animate-fade">
              <div>
                <h3 className="font-serif font-black text-[#1A2F22] text-base">Ecosystem Platform Configurations</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Control academic categories, courses syllabus lists, and global system switches.</p>
              </div>

              {/* Categories compiler row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Academic Categories */}
                <div className="border border-stone-200 rounded-3xl p-5 space-y-4">
                  <div className="space-y-0.5">
                    <h4 className="font-serif font-black text-xs text-[#1A2F22]">Academic Categories</h4>
                    <p className="text-[10px] text-neutral-400">Class directories mapped across search indices.</p>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {adminSettings.categories.map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#FAF7F2] border border-[#ECE9E4] p-2.5 rounded-xl text-xs font-semibold text-slate-800">
                        <span>{cat}</span>
                        <button
                          onClick={() => handleRemoveCategory(idx)}
                          className="p-1 rounded text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Higher Secondary"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-[#FAF7F2] border border-[#ECE9E4] px-3 py-2 rounded-xl text-xs text-[#222221] outline-none placeholder-stone-400 font-semibold"
                    />
                    <button
                      onClick={handleAddCategory}
                      className="bg-natural-green hover:bg-[#4E5D4F] border border-[#4C5B4E] p-2 rounded-xl text-white cursor-pointer transition flex items-center justify-center font-bold font-serif text-xs px-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Course Subjects compiler */}
                <div className="border border-stone-200 rounded-3xl p-5 space-y-4">
                  <div className="space-y-0.5">
                    <h4 className="font-serif font-black text-xs text-[#1A2F22]">Syllabus Subjects</h4>
                    <p className="text-[10px] text-neutral-450">Active subjects allowed across course selectors.</p>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {adminSettings.subjects.map((sub, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#FAF7F2] border border-[#ECE9E4] p-2.5 rounded-xl text-xs font-semibold text-slate-800">
                        <span>{sub}</span>
                        <button
                          onClick={() => handleRemoveSubject(idx)}
                          className="p-1 rounded text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Political Science"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="flex-1 bg-[#FAF7F2] border border-[#ECE9E4] px-3 py-2 rounded-xl text-xs text-[#222221] outline-none placeholder-stone-400 font-semibold"
                    />
                    <button
                      onClick={handleAddSubject}
                      className="bg-natural-green hover:bg-[#4E5D4F] border border-[#4C5B4E] p-2 rounded-xl text-white cursor-pointer transition flex items-center justify-center font-bold font-serif text-xs px-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "moderation" && (
            <div className="space-y-6 animate-fade">
              <div className="bg-[#FAF7F2] border border-natural-border rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
                      Secure Moderation Desk
                    </span>
                    <h3 className="text-xl font-serif font-extrabold text-[#1A2F22]">
                      Classroom Chat Abuse Logs &amp; Audit
                    </h3>
                    <p className="text-xs text-[#8A847C] max-w-xl">
                      Review chat room snapshot violations and policy reports submitted by students or tutors. Audit the full classroom conversation trace before suspending or blocking users.
                    </p>
                  </div>
                  <button
                    onClick={fetchChatReports}
                    className="bg-white hover:bg-neutral-50 px-4 py-2 border border-stone-200 text-slate-800 text-xs font-serif font-bold rounded-xl transition"
                  >
                    Refresh Incidents
                  </button>
                </div>
              </div>

              {/* TWO PANEL AUDIT INTERFACE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT CONSOLE: INCIDENTS TICKETS */}
                <div className="bg-white border border-natural-border rounded-[24px] p-6 shadow-sm space-y-4">
                  <h4 className="font-serif font-black text-sm text-[#1A2F22] pb-3 border-b border-stone-100 flex items-center gap-2">
                    🚨 Reported Incidents Dossier ({chatReports.filter(r => r.status === "open").length} Unresolved)
                  </h4>

                  {chatReports.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <p className="text-3xl text-emerald-500">🛡️</p>
                      <p className="text-sm font-semibold">All classroom circles clear!</p>
                      <p className="text-xs max-w-xs mx-auto">No abuse complaints or chat incidents have been reported across active student-tutor rooms.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {chatReports.map((report) => (
                        <div 
                          key={report.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            selectedRoomIdDetail === report.roomId 
                              ? "bg-slate-50 border-rose-500/40 shadow-sm"
                              : report.status === "resolved"
                              ? "bg-stone-50 border-stone-250 opacity-60"
                              : "bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] border-natural-border"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md font-mono ${
                                report.status === "open"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {report.status}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono ml-2">
                                {new Date(report.timestamp).toLocaleDateString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">ID: {report.id}</span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <p className="text-[#1A2F22] font-semibold">
                              Reporter: <strong className="text-stone-800">{report.reporterName}</strong> ({report.reporterId})
                            </p>
                            <p className="text-rose-700 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50 italic my-1.5 leading-relaxed font-sans">
                              "{report.reason}"
                            </p>
                            <p className="text-[11px] font-mono text-indigo-600 truncate">
                              Room Code: {report.roomId}
                            </p>
                          </div>

                          <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center justify-between gap-2.5 font-serif">
                            <button
                              onClick={() => fetchRoomMessages(report.roomId)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                            >
                              Inspect Chat log
                            </button>
                            {report.status === "open" && (
                              <button
                                onClick={() => handleResolveReport(report.id)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RIGHT CONSOLE: CHAT CONTENT SNAPSHOT REVIEW */}
                <div className="bg-white border border-natural-border rounded-[24px] p-6 shadow-sm space-y-4">
                  <h4 className="font-serif font-black text-sm text-[#1A2F22] pb-3 border-b border-stone-100 flex items-center gap-2 justify-between">
                    <span>📡 Forensics Inspection Vault</span>
                    {selectedRoomIdDetail && (
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg truncate max-w-[200px]">
                        Room: {selectedRoomIdDetail}
                      </span>
                    )}
                  </h4>

                  {!selectedRoomIdDetail ? (
                    <div className="py-24 text-center text-slate-400 space-y-2">
                      <p className="text-3xl">🔍</p>
                      <p className="text-xs font-serif font-medium">Select an incident chat log trace to audit the classroom snapshot conversation streams securely within our strict GDPR audit-compliance frameworks.</p>
                    </div>
                  ) : loadingMessagesAudit ? (
                    <div className="py-24 text-center space-y-3 flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-500 font-medium">Extracting encrypted snapshot audit tracks...</span>
                    </div>
                  ) : (
                    <div className="space-y-4 font-sans text-xs">
                      <div className="bg-stone-50 border p-3 rounded-2xl text-[11px] font-mono leading-normal text-slate-600">
                        🔒 Displaying secure text logs. Base64 media elements have been truncated for client rendering efficiency.
                      </div>

                      <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 font-mono text-[11px]">
                        {inspectedRoomMessages.length === 0 ? (
                          <p className="text-slate-400 text-center py-10">No logs found or empty stream.</p>
                        ) : (
                          inspectedRoomMessages.map((msg, index) => (
                            <div key={index} className="border-b border-slate-800/80 pb-2.5 last:border-0">
                              <div className="flex justify-between text-[10px] text-indigo-400 mb-1">
                                <span className="font-black">{msg.senderName} ({msg.senderRole})</span>
                                <span className="text-slate-500">{new Date(msg.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap select-text text-slate-100">
                                {msg.text}
                              </p>
                              {msg.fileUrl && (
                                <span className="text-[9px] bg-slate-800 text-cyan-400 rounded px-1.5 py-0.5 mt-1 inline-block">
                                  📎 Attached media files ({msg.fileName || "unnamed"})
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex gap-2 font-serif">
                        <button
                          onClick={() => setSelectedRoomIdDetail(null)}
                          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          Clear Audit Selection
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* DETAIL MODAL DESK DRAWER */}
      {selectedUserDetails && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4 select-text">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-150 animate-scale-up">
            <div className="p-6 bg-neutral-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="text-natural-orange w-5 h-5" />
                <div>
                  <h3 className="font-serif font-black text-[#1A2F22] text-sm leading-tight">Detailed Credentials Dossier</h3>
                  <p className="text-[10px] text-gray-500">Comprehensive profile mapping retrieved securely.</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedUserDetails(null)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans max-h-[60vh] overflow-y-auto">
              <div className="flex gap-4 items-start border-b border-neutral-100 pb-4">
                <img src={selectedUserDetails.avatar} className="w-14 h-14 rounded-2xl object-cover shrink-0 border" alt="" />
                <div className="space-y-1">
                  <h4 className="font-serif font-black text-sm text-[#1A2F22]">{selectedUserDetails.name}</h4>
                  <p className="text-[11px] text-neutral-500 font-mono italic leading-none">{selectedUserDetails.email}</p>
                  <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-block mt-1 ${selectedUserDetails.role === "tutor" ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800"}`}>
                    {selectedUserDetails.role.toUpperCase() === "TUTOR" ? "Teacher Partner" : "Student Learner"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 divide-x divide-stone-100">
                <div className="space-y-2">
                  <span className="text-[9.5px] font-bold text-neural-500 uppercase tracking-widest block text-[#8A847C]">System Indices</span>
                  <div className="space-y-1 bg-stone-50 p-2.5 rounded-xl border leading-relaxed">
                    <div>Status: <strong className="text-natural-green-dark">{selectedUserDetails.status?.toUpperCase() || "ACTIVE"}</strong></div>
                    <div>Rating: <strong>{selectedUserDetails.rating || "4.5"} ⭐</strong></div>
                    <div>Online Status: <strong>{selectedUserDetails.isOnline ? "ONLINE 🟢" : "OFFLINE 🔴"}</strong></div>
                    <div>Reviews: <strong>{selectedUserDetails.reviewsCount || 0} files</strong></div>
                  </div>
                </div>

                <div className="pl-4 space-y-2">
                  <span className="text-[9.5px] font-bold text-neural-500 uppercase tracking-widest block text-[#8A847C]">Dossier Details</span>
                  <div className="space-y-1 bg-stone-50 p-2.5 rounded-xl border leading-relaxed text-gray-600">
                    <div>Age Group: <strong>{selectedUserDetails.age || "Undergrad"}</strong></div>
                    <div>Course Specialties: <strong>{selectedUserDetails.subject || "All Academic Secondary"}</strong></div>
                    <div>Base Rate Fee: <strong>₹{selectedUserDetails.ratePerSession || 500}</strong></div>
                    <div>Address Filed: <strong>{selectedUserDetails.address || "Assam, Guwahati"}</strong></div>
                  </div>
                </div>
              </div>

              {selectedUserDetails.role === "tutor" && (
                <div className="space-y-1 bg-neutral-50 border p-3 rounded-xl">
                  <span className="text-[9px] font-black text-[#1A2F22] block uppercase font-serif tracking-widest text-[#E07A5F] mb-0.5">Educator Bio Overview</span>
                  <p className="text-[11px] leading-relaxed italic text-neutral-600">
                    {selectedUserDetails.bio || "No professional dossier statement has been catalogued for this teacher profile catalog yet."}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-50 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setSelectedUserDetails(null)}
                className="bg-neutral-800 hover:bg-black text-white font-bold px-5 py-2 rounded-xl cursor-not-allowed cursor-pointer transition text-xs shadow-sm"
              >
                Close Records File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURED SUB-BAR STATUS CONTAINER */}
      <footer className="bg-[#FAF7F2] text-[#8A847C] py-5 px-6 border-t border-[#ECE9E4] text-center text-[10px] leading-relaxed">
        <p className="font-semibold text-natural-green-dark uppercase tracking-widest mb-1 font-serif">Sikho Secure Admin Gateway Environment v1.4</p>
        <p>This operational panel is monitored by strict RBAC constraints. Unauthorized actions are immediately stored in the persistent filesystem logs.</p>
      </footer>
    </div>
  );
}
