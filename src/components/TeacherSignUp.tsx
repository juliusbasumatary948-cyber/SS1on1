import React, { useState, useRef, useEffect } from "react";
import { User } from "../types";
import { 
  X, Check, ShieldCheck, Upload, Video, Camera, FileText, 
  User as UserIcon, Mail, Phone, MapPin, GraduationCap, 
  Calendar, Briefcase, Award, ArrowRight, ArrowLeft, Play, Square, AlertCircle,
  FolderOpen
} from "lucide-react";

interface TeacherSignUpProps {
  onClose: () => void;
  onSuccess: (newTutor: User) => void;
}

export default function TeacherSignUp({ onClose, onSuccess }: TeacherSignUpProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [address, setAddress] = useState(""); // Location
  const [password, setPassword] = useState("");
  const [preferredMode, setPreferredMode] = useState<"online" | "offline" | "both">("online");
  const [shortBio, setShortBio] = useState("");

  // Education Details
  const [qualification, setQualification] = useState("Diploma");
  const [collegeName, setCollegeName] = useState("");
  const [graduationYear, setGraduationYear] = useState("2022");

  // Teaching Details
  const [subjects, setSubjects] = useState<string[]>(["Mathematics"]);
  const [experience, setExperience] = useState("2 years");

  // List of qualifications
  const qualificationsList = [
    { value: "Diploma", label: "Diploma (Minimum base requirement)" },
    { value: "BA", label: "Bachelor of Arts (BA)" },
    { value: "BCom", label: "Bachelor of Commerce (BCom)" },
    { value: "BBA", label: "Bachelor of Business Administration (BBA)" },
    { value: "BSc", label: "Bachelor of Science (BSc)" },
    { value: "BTech", label: "Bachelor of Technology (BTech)" },
    { value: "MBA", label: "Master of Business Administration (MBA)" },
    { value: "MSc", label: "Master of Science (MSc)" },
    { value: "MTech", label: "Master of Technology (MTech)" },
    { value: "PhD", label: "Doctor of Philosophy (PhD)" },
    { value: "HighSchool", label: "High School / Under 12th Standard" } // Will show validation blocker
  ];

  const categorizedSubjects = {
    "School Academics": [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "History & Civics",
      "Geography",
      "Economics",
      "Accountancy & Commerce",
      "Environmental Science (EVS)"
    ],
    "Coding & Tech": [
      "Computer Science (K-12)",
      "Coding & Programming (Python, C++, Java)",
      "Full Stack Web Development",
      "App Development"
    ],
    "Design & Creative Media": [
      "UI/UX Design",
      "VFX & 3D Animation",
      "UFX (Special Effects & Shaders)",
      "Graphic Design",
      "Digital Art & Illustration"
    ],
    "Performing Arts": [
      "Indian Classical Dance & Folk",
      "Western & Modern Dance Styles",
      "Vocal Music (Classical & Light)",
      "Instrumental Music (Guitar, Keyboard, Tabla)",
      "Drama, Acting & Theatre"
    ],
    "Languages & Linguistics": [
      "English Literature & Grammar",
      "Spoken English & Communication",
      "Hindi & Regional Languages",
      "Sanskrit & Vedic Studies",
      "Foreign Languages (French, German, Spanish)"
    ],
    "Vocational & Co-curricular": [
      "Yoga, Fitness & Wellness",
      "Physical Education",
      "Creative Writing & Journalism",
      "Public Speaking & Debating",
      "Financial Literacy & Stock Market"
    ]
  };

  // Steps handling & specific requirements checks
  const validateStep = (step: number) => {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!fullName.trim()) stepErrors.fullName = "Full Name is required";
      if (!phoneNumber.trim()) {
        stepErrors.phoneNumber = "Phone Number is required";
      } else if (!/^\+?[0-9\- \(\)]{8,15}$/.test(phoneNumber)) {
        stepErrors.phoneNumber = "Please enter a valid phone number";
      }
      if (!emailAddress.trim()) {
        stepErrors.emailAddress = "Email Address is required";
      } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
        stepErrors.emailAddress = "Please enter a valid email address";
      }
      if (!password) {
        stepErrors.password = "Password is required";
      }
      if (!address.trim()) stepErrors.address = "Address / Hometown / Location is required";
    }

    if (step === 2) {
      // Minimum Qualification: Diploma or higher
      if (qualification === "HighSchool") {
        stepErrors.qualification = "Minimum Qualification requirement is a Diploma or higher. High School is not accepted.";
      }
      if (!collegeName.trim()) stepErrors.collegeName = "College / University Name is required";
      if (!graduationYear.trim()) stepErrors.graduationYear = "Graduation Year is required";
      if (!shortBio.trim()) {
        stepErrors.shortBio = "Short Profile Description is required";
      } else if (shortBio.trim().length < 20) {
        stepErrors.shortBio = "Please add a bit more details about yourself (min 20 characters)";
      }
    }

    if (step === 3) {
      if (subjects.length === 0) stepErrors.subjects = "Please select at least one subject to teach";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!validateStep(3)) return;

    // Use a unique suffix for the Google Drive folder name
    const folderNameSuffix = fullName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.floor(1000 + Math.random() * 9000);

    // Build the User model
    const newTutor: User = {
      id: `tutor-${Date.now()}`,
      name: fullName,
      avatar: fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "T",
      role: "tutor",
      title: `${qualification} in ${subjects[0]} Educator`,
      subject: subjects[0],
      rating: 5.0,
      reviewsCount: 0,
      ratePerSession: 500,
      experience: experience || "Fresh Graduate",
      bio: shortBio || `Hello! I am ${fullName}, graduated from ${collegeName}. Ready to teach ${subjects.join(", ")} dynamically!`,
      skills: subjects,
      isOnline: true,
      email: emailAddress,
      password: password,
      phone: phoneNumber,
      address: address,
      avatarUrl: "", // Document upload profile photo is uploaded later via Drive
      verificationStatus: "submitted", // Initial status "Registration Submitted"
      driveFolderLink: "https://drive.google.com/drive/folders/1RBCWVt6-FqA6lTTpMzgpqMDLvjjsPU3E",
      preferredMode: preferredMode,
      uploadedDocs: []
    };

    onSuccess(newTutor);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  return (
    <div className="fixed inset-0 bg-natural-green-dark/75 backdrop-blur-md flex items-start justify-center z-50 p-4 md:p-8 overflow-y-auto">
      <div className="bg-white border border-natural-border/30 rounded-[32px] max-w-3xl w-full shadow-2xl relative my-auto overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side Info Panel */}
        <div className="bg-natural-green-dark p-8 md:w-80 text-[#FAF7F2] flex flex-col justify-between relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-natural-green/10 rounded-full blur-2xl"></div>
          
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-natural-orange/20 border border-natural-orange/30 rounded-full text-natural-orange text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-natural-orange" /> Verified Educator
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-bold text-white tracking-tight">Sikho Partner Program</h3>
              <p className="text-xs text-natural-sand-mid/90 leading-relaxed">
                Join our elite panel of verified school teachers, university mentors, and Subject Matter Experts. We offer weekly payouts, modern digital whiteboard classrooms, and seamless calendar bookings.
              </p>
            </div>
          </div>

          {/* Stepper Guide */}
          <div className="space-y-4 pt-10 relative z-10">
            <span className="text-[10px] uppercase font-bold tracking-widest text-natural-orange">Enrollment Stepper</span>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? "bg-natural-orange text-white" : "bg-white/10 text-white/50"}`}>
                  1
                </div>
                <span className={`text-xs font-semibold ${currentStep === 1 ? "text-white" : "text-white/60"}`}>Personal Credentials</span>
              </div>
              <div className="w-0.5 h-3 bg-white/10 ml-3"></div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? "bg-natural-orange text-white" : "bg-white/10 text-white/50"}`}>
                  2
                </div>
                <span className={`text-xs font-semibold ${currentStep === 2 ? "text-white" : "text-white/60"}`}>Academia &amp; Profile</span>
              </div>
              <div className="w-0.5 h-3 bg-white/10 ml-3"></div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 3 ? "bg-natural-orange text-white" : "bg-white/10 text-white/50"}`}>
                  3
                </div>
                <span className={`text-xs font-semibold ${currentStep === 3 ? "text-white" : "text-white/60"}`}>Subjects Offered</span>
              </div>
              <div className="w-0.5 h-3 bg-white/10 ml-3"></div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 4 ? "bg-natural-orange text-white" : "bg-white/10 text-white/50"}`}>
                  4
                </div>
                <span className={`text-xs font-semibold ${currentStep === 4 ? "text-white" : "text-white/60"}`}>Secure Submission</span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[10px] text-white/40 border-t border-white/10 mt-6 md:mt-0">
            Sikho Educator Verification Policy 2026. Data protected via industry-standard isolation.
          </div>
        </div>

        {/* Right Side Form Content */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-between bg-white text-natural-green-dark">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-natural-sand-light text-natural-grey hover:text-natural-green-dark cursor-pointer transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1">
            {/* Step 1: Personal Details */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h4 className="text-xl font-serif font-black text-natural-green-dark">Required Personal Details</h4>
                  <p className="text-xs text-natural-grey mt-0.5">Please provide accurate verification details matching legal certificates.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email Address */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                        <Mail className="w-3.5 h-3.5 text-natural-orange" /> Email Address
                      </label>
                      <input 
                        type="email"
                        placeholder="e.g. teacher@example.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className={`w-full bg-natural-sand-light/50 border ${errors.emailAddress ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                      />
                      {errors.emailAddress && <p className="text-[10px] text-red-500 font-semibold">{errors.emailAddress}</p>}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-natural-orange" /> Password (Create your password)
                      </label>
                      <input 
                        type="password"
                        placeholder="Any password of your choice is accepted"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full bg-natural-sand-light/50 border ${errors.password ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                      />
                      {errors.password && <p className="text-[10px] text-red-500 font-semibold">{errors.password}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                      <UserIcon className="w-3.5 h-3.5 text-natural-orange" /> Full Name
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Dr. Alok Verma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full bg-natural-sand-light/50 border ${errors.fullName ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                    />
                    {errors.fullName && <p className="text-[10px] text-red-500 font-semibold">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                      <Phone className="w-3.5 h-3.5 text-natural-orange" /> Phone Number
                    </label>
                    <input 
                      type="tel"
                      placeholder="e.g. 0999999999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`w-full bg-natural-sand-light/50 border ${errors.phoneNumber ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                    />
                    {errors.phoneNumber && <p className="text-[10px] text-red-500 font-semibold">{errors.phoneNumber}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-natural-orange" /> Address / Hometown
                    </label>
                    <textarea 
                      placeholder="e.g. Sector-4, Dwarka, New Delhi - 110075"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      className={`w-full bg-natural-sand-light/50 border ${errors.address ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none leading-relaxed transition-colors`}
                    />
                    {errors.address && <p className="text-[10px] text-red-500 font-semibold">{errors.address}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Educational Details & Profile Description */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h4 className="text-xl font-serif font-black text-natural-green-dark">Education &amp; Professional Profile</h4>
                  <p className="text-xs text-natural-grey mt-0.5">Tell us about your qualification, experience, and provide a short profile bio.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5 text-natural-orange" /> Academic Qualification
                    </label>
                    <div className="relative">
                      <select
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className={`w-full bg-natural-sand-light/50 border ${errors.qualification ? "border-red-400" : "border-natural-border"} px-4 py-2.5 text-xs text-natural-green-dark rounded-xl outline-none focus:border-natural-green cursor-pointer`}
                      >
                        {qualificationsList.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    {errors.qualification ? (
                      <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.qualification}
                      </p>
                    ) : (
                      <p className="text-[10px] text-natural-green font-bold flex items-center gap-1.5 mt-1">
                        ✓ Quality compliance pass: Minimum Diploma or higher met.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                        <GraduationCap className="w-3.5 h-3.5 text-natural-orange" /> College/University Name
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Banaras Hindu University"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className={`w-full bg-natural-sand-light/50 border ${errors.collegeName ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                      />
                      {errors.collegeName && <p className="text-[10px] text-red-500 font-semibold">{errors.collegeName}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 text-natural-orange" /> Graduation Year
                      </label>
                      <input 
                        type="number"
                        min="1960"
                        max="2026"
                        placeholder="e.g. 2021"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className={`w-full bg-natural-sand-light/50 border ${errors.graduationYear ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                      />
                      {errors.graduationYear && <p className="text-[10px] text-red-500 font-semibold">{errors.graduationYear}</p>}
                    </div>
                  </div>

                  {/* Teaching Experience & Preferred Mode Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                        <Briefcase className="w-3.5 h-3.5 text-natural-orange" /> Teaching Experience (if any)
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. 5+ years teaching high schools"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full bg-natural-sand-light/50 border border-natural-border focus:border-natural-green rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                        <UserIcon className="w-3.5 h-3.5 text-natural-orange" /> Preferred Teaching Mode
                      </label>
                      <select
                        value={preferredMode}
                        onChange={(e) => setPreferredMode(e.target.value as any)}
                        className="w-full bg-natural-sand-light/50 border border-natural-border focus:border-natural-green rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none cursor-pointer"
                      >
                        <option value="online">Online Only</option>
                        <option value="offline">Offline Only</option>
                        <option value="both">Both (Online &amp; Offline)</option>
                      </select>
                    </div>
                  </div>

                  {/* Short Profile Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-natural-orange" /> Short Profile Description
                    </label>
                    <textarea 
                      placeholder="Write a clear short bio introducing yourself, your pedagogical style, and what students should expect from your sessions (min 20 characters)..."
                      value={shortBio}
                      onChange={(e) => setShortBio(e.target.value)}
                      rows={3}
                      className={`w-full bg-natural-sand-light/50 border ${errors.shortBio ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2 text-xs text-natural-green-dark outline-none leading-relaxed transition-colors`}
                    />
                    {errors.shortBio && <p className="text-[10px] text-red-500 font-semibold">{errors.shortBio}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Teaching Credentials */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-xl font-serif font-black text-natural-green-dark">Subjects To Teach</h4>
                  <p className="text-xs text-natural-grey mt-0.5">Select the subjects you would like to offer to students on our platform.</p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="space-y-3" id="teaching-subjects-selection-container">
                    <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider" id="teaching-subjects-label">
                      <Briefcase className="w-3.5 h-3.5 text-natural-orange" /> Subjects Offered (Select all that apply)
                    </label>
                    <div className="max-h-96 overflow-y-auto pr-2 space-y-4 border border-natural-border/40 rounded-2xl p-4 bg-natural-sand-light/10" id="teaching-subjects-scroller">
                      {Object.entries(categorizedSubjects).map(([category, list]) => (
                        <div key={category} className="space-y-2">
                          <span className="text-[10px] font-extrabold text-natural-orange uppercase tracking-wider block bg-natural-sand-light/40 px-2.5 py-1 rounded-lg">
                            {category}
                          </span>
                          <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
                            {list.map(subject => {
                              const isChecked = subjects.includes(subject);
                              return (
                                <button
                                  key={subject}
                                  type="button"
                                  id={`btn-subject-${subject.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`}
                                  onClick={() => {
                                    if (isChecked) {
                                      setSubjects(subjects.filter(s => s !== subject));
                                    } else {
                                      setSubjects([...subjects, subject]);
                                    }
                                  }}
                                  className={`px-3 py-2 text-left rounded-xl border text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${isChecked ? "bg-natural-green text-white border-natural-green shadow-sm" : "bg-white text-natural-text hover:bg-natural-sand-light border-natural-border"}`}
                                >
                                  <span className="truncate">{subject}</span>
                                  {isChecked ? (
                                    <Check className="w-3 h-3 text-natural-orange shrink-0 ml-1" />
                                  ) : (
                                    <span className="text-natural-grey text-[9px] font-bold shrink-0 ml-1">+ Add</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.subjects && <p className="text-[10px] text-red-500 font-semibold" id="error-subjects-selection">{errors.subjects}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Secure Submission Space */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-fade-in text-natural-green-dark">
                <div>
                  <h4 className="text-xl font-serif font-black text-natural-green-dark">Secure Onboarding Drive</h4>
                  <p className="text-xs text-natural-grey mt-0.5">
                    Submit your academic files and active introductory bio clip directly via our secure Google Drive hub.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="bg-[#FAF7F2] border border-natural-border/60 rounded-2xl p-5 text-center space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-natural-orange"></div>
                    
                    <div className="w-14 h-14 bg-natural-orange/10 text-natural-orange rounded-full flex items-center justify-center text-xl font-serif font-black mx-auto">
                      📂
                    </div>

                    <div className="space-y-1 max-w-lg mx-auto">
                      <h5 className="font-serif font-bold text-sm text-natural-green-dark">Sikho Verification Directory</h5>
                      <p className="text-[11px] text-[#6D675E] leading-relaxed">
                        We leverage Google Drive's isolated workspace to protect your private credentials. Tap the link below to load our main folder:
                      </p>
                    </div>

                    {/* Highly clear custom folder box */}
                    <div className="p-3 bg-white/90 border border-natural-border/40 hover:bg-white rounded-xl text-[11px] text-[#867F74] font-mono break-all leading-normal max-w-md mx-auto select-all shadow-xs">
                      https://drive.google.com/drive/folders/1RBCWVt6-FqA6lTTpMzgpqMDLvjjsPU3E
                    </div>

                    <div className="space-y-3.5 pt-1.5">
                      <a
                        href="https://drive.google.com/drive/folders/1RBCWVt6-FqA6lTTpMzgpqMDLvjjsPU3E"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex bg-natural-green hover:bg-[#4E5D4F] text-white font-bold text-xs px-6 py-3 rounded-xl transition duration-200 shadow-md items-center gap-2 uppercase tracking-wide cursor-pointer hover:scale-[1.01]"
                      >
                        <FolderOpen className="w-4 h-4" /> Tap To Open Drive Link
                      </a>

                      <p className="text-[11px] text-natural-grey leading-relaxed max-w-md mx-auto">
                        <strong>Action Checklist:</strong> Once you tap the link, please <strong>create a folder named with your own name</strong> inside it (e.g. <em>"{fullName || "Your Full Name"}"</em>). Inside that folder, submit your ID proof, qualification certificates, resumés, and a short video introduction/demo of <strong>1-2 minutes</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1.5 shadow-2xs">
                    <h6 className="font-extrabold flex items-center gap-1.5 text-xs text-emerald-900">
                      💡 User-Friendly Quick Signup Information
                    </h6>
                    <p className="leading-relaxed">
                      Verification uploads are <strong>completely optional</strong> right now to keep onboarding frictionless. You can conclude registration immediately and add/edit reviews or document folders later from your active Tutor Dashboard at any time.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between border-t border-natural-border/20 pt-6 mt-8">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="bg-natural-sand-light hover:bg-[#D9D1C5] text-natural-green-dark font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous Step
                </button>
              ) : (
                <div />
              )}
            </div>

            <div>
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-natural-green hover:bg-[#4E5D4F] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="bg-natural-orange hover:bg-[#854E0B] text-white font-bold text-xs px-7 py-3 rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2 hover:scale-[1.01]"
                >
                  Complete Partner Registration <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
