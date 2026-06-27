export interface User {
  id: string;
  name: string;
  avatar: string;
  role: "student" | "tutor";
  title?: string; // e.g. "Class 11 Science" or "Mathematics Head Tutor"
  subject?: string; // primarily for tutors
  rating?: number;
  reviewsCount?: number;
  ratePerSession?: number;
  experience?: string;
  bio?: string;
  skills?: string[];
  isOnline?: boolean;
  email?: string;
  avatarUrl?: string;
  phone?: string;
  age?: string;
  address?: string;
  password?: string;
  verificationStatus?: "submitted" | "pending_docs" | "in_progress" | "verified" | "additional_docs" | "rejected" | "pending";
  driveFolderLink?: string;
  preferredMode?: "online" | "offline" | "both";
  uploadedDocs?: Array<{
    id: string;
    name: string;
    category: "id_proof" | "certificate" | "resume" | "photo" | "video";
    url: string;
    uploadedAt: string;
    size?: string;
  }>;
}

export interface Session {
  id: string;
  subject: string;
  topic: string;
  tutorId: string;
  tutorName: string;
  tutorAvatar: string;
  studentId: string;
  studentName: string;
  timeSlot: string; // e.g. "9:00 - 10:30 AM"
  dateLabel: string; // e.g. "Today", "Tomorrow", "Fri, 13 Jun"
  status: "live" | "upcoming" | "scheduled" | "completed" | "pending" | "rejected";
  roomId: string;
  slideTopic?: string;
  recordingUrl?: string;
}

export interface NoteMaterial {
  id: string;
  subject: string;
  title: string;
  type: "pdf" | "video" | "notes";
  fileSize?: string;
  uploadedDate: string;
  classTag: string;
  content?: string;
  topic?: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: "student" | "tutor" | "assistant";
  text: string;
  timestamp: string;
}

export interface Assignment {
  id: string;
  studentName: string;
  title: string;
  dueDate: string;
  submittedAt?: string;
  status: "pending" | "graded";
  score?: string;
  feedback?: string;
}

export interface WhiteboardStroke {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export function calculatePlatformPricing(tutorPrice: number) {
  const original = Number(tutorPrice || 0);
  const commission = Number((original * 0.1111).toFixed(2));
  const studentPrice = Number((original + commission).toFixed(2));
  return {
    original,
    commission,
    studentPrice
  };
}
