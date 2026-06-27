import React, { useState, useEffect } from "react";
import { User } from "../types";
import { 
  X, Check, Upload, Camera, User as UserIcon, Mail, Phone, 
  MapPin, Calendar, ArrowRight, ArrowLeft, ShieldCheck, AlertCircle
} from "lucide-react";

interface StudentSignUpProps {
  onClose: () => void;
  onSuccess: (newStudent: User & { age: string; address: string; phone: string; email: string; avatarUrl?: string }) => void;
}

export default function StudentSignUp({ onClose, onSuccess }: StudentSignUpProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoName, setProfilePhotoName] = useState("");
  const [age, setAge] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [password, setPassword] = useState("");

  const validate = () => {
    const stepErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      stepErrors.fullName = "Full Name is required";
    }
    
    if (!phoneNumber.trim()) {
      stepErrors.phoneNumber = "Phone Number is required";
    } else if (!/^\+?[0-9\- \(\)]{8,15}$/.test(phoneNumber)) {
      stepErrors.phoneNumber = "Please enter a valid phone number format";
    }

    if (!emailAddress.trim()) {
      stepErrors.emailAddress = "Email Address is required";
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      stepErrors.emailAddress = "Please enter a valid email address";
    }

    if (!password) {
      stepErrors.password = "Password is required";
    }

    if (!age.trim()) {
      stepErrors.age = "Age is required";
    } else {
      const numAge = parseInt(age, 10);
      if (isNaN(numAge) || numAge < 4 || numAge > 100) {
        stepErrors.age = "Please provide a valid student age (4 - 100)";
      }
    }

    if (!addressCity.trim()) {
      stepErrors.addressCity = "Address / City is required";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // Profile picker handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfilePhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // High quality professional illustration / headshot presets for students
  const selectPresetAvatar = (url: string, name: string) => {
    setProfilePhoto(url);
    setProfilePhotoName(name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Get initials for profile default avatar
    const initials = fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S";

    // Build Student Model object
    const newStudent = {
      id: `student-${Date.now()}`,
      name: fullName,
      avatar: initials,
      role: "student" as const,
      title: `Student · Class ${age ? (parseInt(age) <= 12 ? parseInt(age) : "College") : "11"}`,
      isOnline: true,
      age: age,
      address: addressCity,
      phone: phoneNumber,
      email: emailAddress,
      password: password,
      avatarUrl: profilePhoto || ""
    };

    onSuccess(newStudent);
  };

  const presetImages = [
    { name: "Learner Blue", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop" },
    { name: "Learner Teal", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop" },
    { name: "Learner Coral", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop" }
  ];

  return (
    <div className="fixed inset-0 bg-natural-green-dark/75 backdrop-blur-md flex items-start justify-center z-50 p-4 md:p-8 overflow-y-auto">
      <div className="bg-white border border-natural-border/30 rounded-[32px] max-w-3xl w-full shadow-2xl relative my-auto overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        
        {/* Left Aspect Info Backdrop */}
        <div className="bg-natural-green-dark p-8 md:w-80 text-[#FAF7F2] flex flex-col justify-between relative shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-natural-green/10 rounded-full blur-2xl"></div>
          
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-natural-orange/20 border border-natural-orange/30 rounded-full text-natural-orange text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-natural-orange" /> Sikho Student Enrollment
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-bold text-white tracking-tight">Begin Your Path</h3>
              <p className="text-xs text-natural-sand-mid/90 leading-relaxed">
                Connect and set up live video learning classrooms with India's best instructors. Access dynamic interactive whiteboards, personalized question feedback, and instant peer matchmaking tutors.
              </p>
            </div>
          </div>

          <div className="pt-8 text-[10px] text-white/40 border-t border-white/10 mt-12 md:mt-0">
            Secure sandbox portal. All privacy compliance constraints strictly managed locally.
          </div>
        </div>

        {/* Right Side Sign Up form details */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-between bg-white text-natural-green-dark relative">
          
          {/* Close trigger button */}
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-natural-sand-light text-natural-grey hover:text-natural-green-dark cursor-pointer transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-5">
              <div>
                <h4 className="text-xl font-serif font-black text-natural-green-dark">Student Sign-Up</h4>
                <p className="text-xs text-natural-grey mt-0.5">Please fill out your verified contact details and address to continue.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-natural-orange" /> Email Address
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. student@example.com"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                    <UserIcon className="w-3.5 h-3.5 text-natural-orange" /> Full Name
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Julius Basumatary"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full bg-natural-sand-light/50 border ${errors.fullName ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                  />
                  {errors.fullName && <p className="text-[10px] text-red-500 font-semibold">{errors.fullName}</p>}
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-natural-orange" /> Age (Years)
                  </label>
                  <input 
                    type="number"
                    min="4"
                    max="100"
                    placeholder="e.g. 16"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className={`w-full bg-natural-sand-light/50 border ${errors.age ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                  />
                  {errors.age && <p className="text-[10px] text-red-500 font-semibold">{errors.age}</p>}
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                  <Phone className="w-3.5 h-3.5 text-natural-orange" /> Phone Number
                </label>
                <input 
                  type="tel"
                  placeholder="e.g. 0987654321"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-full bg-natural-sand-light/50 border ${errors.phoneNumber ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-2.5 text-xs text-natural-green-dark outline-none transition-colors`}
                />
                {errors.phoneNumber && <p className="text-[10px] text-red-500 font-semibold">{errors.phoneNumber}</p>}
              </div>

              {/* Address / City */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-natural-green-dark flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-natural-orange" /> Address / City
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Dwarka Sector-9, New Delhi"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className={`w-full bg-natural-sand-light/50 border ${errors.addressCity ? "border-red-400 focus:border-red-500" : "border-natural-border focus:border-natural-green"} rounded-xl px-4 py-3 text-xs text-natural-green-dark outline-none transition-colors`}
                />
                {errors.addressCity && <p className="text-[10px] text-red-500 font-semibold">{errors.addressCity}</p>}
              </div>

              {/* Profile Photo (Optional) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-natural-green-dark flex items-center justify-between uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-natural-orange" /> Profile Photo (Optional)
                  </span>
                  <span className="text-[9px] text-[#854E0B] font-extrabold bg-[#FCEFDC] px-2 py-0.5 rounded border border-natural-orange/10">Optional Accent</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-natural-sand-light/30 border border-dashed border-natural-border rounded-2xl">
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt="Student avatar preview" 
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover border-2 border-natural-green shadow-sm shrink-0" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-natural-sand-light text-natural-green border border-natural-border flex items-center justify-center text-lg font-bold shrink-0">
                      🎓
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="bg-natural-green hover:bg-[#4E5D4F] text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition shadow-sm cursor-pointer inline-flex items-center gap-1 shrink-0">
                        <Upload className="w-3 h-3" /> Select File
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileUpload} 
                        />
                      </label>
                      <span className="text-[10px] text-natural-grey">or use preset:</span>
                      <div className="flex items-center gap-1.5">
                        {presetImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectPresetAvatar(img.url, img.name)}
                            className="w-7 h-7 rounded-full overflow-hidden border border-natural-border hover:border-natural-orange transition cursor-pointer"
                            title={img.name}
                          >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[9px] text-natural-grey leading-tight truncate max-w-xs sm:max-w-md">
                      {profilePhotoName ? `Selected: ${profilePhotoName}` : "JPEG, PNG form. Leave blank to generate initials."}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Action Buttons footer */}
            <div className="flex items-center justify-between border-t border-natural-border/20 pt-5 mt-6 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="bg-natural-sand-light hover:bg-[#D9D1C5] text-natural-green-dark font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-natural-green hover:bg-[#4E5D4F] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5 hover:scale-[1.01]"
              >
                Register Student <Check className="w-4 h-4" />
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
