import React, { useState, useRef, useEffect } from "react";
import { Shield, ScrollText, Check, AlertCircle, Clock, Smartphone, Laptop } from "lucide-react";

interface TermsAndConditionsProps {
  userId: string;
  userName: string;
  userRole: "student" | "tutor" | "admin";
  onAccept: (acceptanceRecord: {
    userId: string;
    userName: string;
    acceptedAt: string;
    version: string;
    deviceInfo: string;
  }) => void;
}

export const CURRENT_TERMS_VERSION = "1.0.0";

export default function TermsAndConditions({
  userId,
  userName,
  userRole,
  onAccept
}: TermsAndConditionsProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Detect user device and operating system info
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let os = "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "macOS";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("like Mac") !== -1) os = "iOS";

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return `${os} (${isMobile ? "Mobile" : "Desktop"})`;
  };

  // Track scroll position to ensure user reads the Terms & Conditions and update a visual indicator
  const handleScroll = () => {
    const el = textContainerRef.current;
    if (!el) return;

    const totalHeight = el.scrollHeight - el.clientHeight;
    if (totalHeight <= 0) {
      setScrollProgress(100);
      setHasScrolledToBottom(true);
      return;
    }

    const currentScroll = el.scrollTop;
    const progress = Math.min((currentScroll / totalHeight) * 100, 100);
    setScrollProgress(progress);

    // If they scrolled past 90%, mark it as read
    if (progress >= 90) {
      setHasScrolledToBottom(true);
    }
  };

  // Force scroll check on mount in case text is small or fits entirely
  useEffect(() => {
    const el = textContainerRef.current;
    if (el) {
      if (el.scrollHeight <= el.clientHeight) {
        setHasScrolledToBottom(true);
        setScrollProgress(100);
      }
    }
  }, []);

  const handleContinue = () => {
    if (!isChecked) return;

    const record = {
      userId,
      userName,
      acceptedAt: new Date().toISOString(),
      version: CURRENT_TERMS_VERSION,
      deviceInfo: getDeviceInfo()
    };

    onAccept(record);
  };

  return (
    <div className="fixed inset-0 bg-natural-green-dark/40 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-white border border-natural-border/40 rounded-[32px] max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in relative">
        
        {/* Progress Bar indicator for reading */}
        <div className="absolute top-0 left-0 h-1 bg-natural-orange transition-all duration-200" style={{ width: `${scrollProgress}%` }}></div>

        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-natural-border/20 bg-natural-sand-light/45 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-natural-green rounded-2xl flex items-center justify-center shadow-md">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-black text-natural-green-dark">Terms &amp; Conditions</h2>
              <p className="text-[10px] uppercase font-extrabold tracking-widest text-natural-orange mt-0.5">Sikho Sikhow Portal Agreement</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/80 border border-natural-border/40 px-3.5 py-1.5 rounded-full text-xs">
            <div className="flex items-center gap-1.5 text-[#8A847C]">
              <Clock className="w-3.5 h-3.5 text-natural-orange" />
              <span className="font-mono text-[10px] font-bold">Ver {CURRENT_TERMS_VERSION}</span>
            </div>
            <div className="h-3 w-px bg-natural-border/30"></div>
            <div className="flex items-center gap-1 text-natural-green-dark font-semibold">
              {getDeviceInfo().includes("Mobile") ? (
                <Smartphone className="w-3.5 h-3.5 text-natural-green" />
              ) : (
                <Laptop className="w-3.5 h-3.5 text-natural-green" />
              )}
              <span className="text-[10px]">{getDeviceInfo().split(" ")[0]}</span>
            </div>
          </div>
        </div>

        {/* Scroll Warning */}
        {!hasScrolledToBottom && (
          <div className="bg-amber-50 text-amber-800 border-b border-amber-200/50 px-6 py-2.5 text-[11px] flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Please scroll down and read through the complete terms to enable acceptance.</span>
          </div>
        )}

        {/* Terms Content Body */}
        <div 
          ref={textContainerRef}
          onScroll={handleScroll}
          className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm text-[#4E483F] leading-relaxed max-h-[45vh] scrollbar-thin select-text"
        >
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-base text-natural-green-dark">1. Welcome to Sikho Sikhow</h3>
            <p>
              Sikho Sikhow (hereafter referred to as "the Platform", "We", "Us", or "Our") operates a high-fidelity virtual, interactive classroom system built to connect expert tutors with students seeking premium learning experiences. By logging into or signing up on the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif font-bold text-base text-natural-green-dark">2. Academic Eligibility &amp; User Accounts</h3>
            <p>
              To protect the integrity of lessons, users register as either <strong>Students</strong> or <strong>Tutors</strong>. Students are granted direct access to seek expert tutoring, request custom live classes, read distributed study material notes, and complete whiteboard assessments. Tutors register to offer professional training, set base pricing rates, and provide custom learning modules.
            </p>
            <p>
              You agree to provide true, accurate, current, and complete credentials during registration. Maintaining multiple dummy profile registrations, sharing login credentials, or using third-party email profiles without authority is strictly prohibited and constitutes grounds for immediate account suspension.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif font-bold text-base text-natural-green-dark">3. Educational Materials &amp; Workspace Integration</h3>
            <p>
              Tutors are provided with an integrated private workspace link on Google Drive to organize identity proofs, academic certificates, and a brief 1-2 minute introductory video demo clip. Specifically, tutors can utilize our central secure onboarding folder available at:
            </p>
            <div className="p-3.5 bg-[#FAF7F2] border border-natural-border/60 rounded-xl text-xs font-mono select-all break-all text-[#6D675E] leading-normal text-center">
              https://drive.google.com/drive/folders/1RBCWVt6-FqA6lTTpMzgpqMDLvjjsPU3E
            </div>
            <p>
              Tutors must create a folder named exactly after their registered full name inside this central directory, and upload their relevant documents. Any materials uploaded are audited by our compliance staff before awarding the "Verified Academic Partner" status badge.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif font-bold text-base text-natural-green-dark">4. Fees, Commission, &amp; Payment Architecture</h3>
            <p>
              All payments, hourly fees, and booking transactions are computed using the Platform's proprietary algorithmic pricing model:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 list-inside text-xs">
              <li>Tutors retain full autonomy to set their desired base rate per session.</li>
              <li>A standard commission rate (currently set at 11.11%) is auto-applied to cover secure server maintenance and video infrastructure costs.</li>
              <li>Students pay the all-inclusive final price (Base Tutor Rate + Platform Commission), maintaining complete pricing transparency before checking out.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif font-bold text-base text-natural-green-dark">5. Classroom Code of Conduct &amp; Safety</h3>
            <p>
              Our virtual whiteboard rooms, real-time chats, and audio-video streams are strictly monitored. Users are expected to maintain utmost decorum. Unprofessional behavior, academic plagiarism, harassment, or distribution of unauthorized content on the shared canvas will trigger an automatic security report.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif font-bold text-base text-natural-green-dark">6. Data Preservation &amp; Account Controls</h3>
            <p>
              We respect your privacy. User profiles, scheduling logs, whiteboard states, and uploaded revision study sheets are persisted inside sandbox environments. In case of safety breaches or billing discrepancies, our Super Admin reserves the explicit right to suspend or block users instantly.
            </p>
          </div>

          <div className="space-y-2 border-t border-natural-border/10 pt-4">
            <p className="text-xs text-[#8A847C] italic">
              By checking the box below, you verify that you are of legal age or have parental supervision to enter into this platform agreement, and agree to let us retain a secure digital record of your acceptance of version {CURRENT_TERMS_VERSION} for audit and regulatory purposes.
            </p>
          </div>
        </div>

        {/* Acceptance and Checklist Actions Footer */}
        <div className="p-6 md:p-8 bg-[#FAF7F2] border-t border-natural-border/20 flex flex-col gap-5">
          
          {/* Checkbox Section */}
          <label className="flex items-start gap-3.5 cursor-pointer group select-none">
            <div className="relative mt-0.5">
              <input 
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="sr-only"
                id="terms-checkbox"
              />
              <div className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center transition-all duration-150 ${
                isChecked 
                  ? "bg-natural-green border-natural-green text-white shadow-sm" 
                  : "bg-white border-natural-border/60 group-hover:border-natural-green"
              }`}>
                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <span className="text-xs font-semibold text-natural-green-dark leading-relaxed group-hover:text-black">
              I have read and agree to the Terms and Conditions of Sikho Sikhow.
            </span>
          </label>

          {/* Accept Continue button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="text-[11px] text-[#8A847C]">
              Signed in as: <strong className="text-natural-green-dark">{userName}</strong> ({userRole})
            </div>
            
            <button
              type="button"
              id="continue-terms-button"
              disabled={!isChecked}
              onClick={handleContinue}
              className={`font-serif font-black text-xs px-8 py-3 rounded-xl uppercase tracking-wider transition-all duration-200 shadow-md ${
                isChecked
                  ? "bg-natural-green hover:bg-[#4E5D4F] text-white cursor-pointer active:scale-95"
                  : "bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed shadow-none"
              }`}
            >
              Continue to Portal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
