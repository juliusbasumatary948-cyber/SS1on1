import { createClient } from "@supabase/supabase-js";
import { User, Session, NoteMaterial, Assignment } from "./types";

// ── ENVIRONMENT SETTINGS ──
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || "";
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === "string" &&
    supabaseUrl.trim() !== "" &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim() !== ""
  );
};

// Lazy initialization of Supabase client to avoid crashes
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ── SCHEMA DESIGN FOR THE USER TO KEY IN SUPABASE SQL EDITOR ──
export const SUPABASE_SCHEMA_SQL = `-- Run this in your Supabase SQL Editor to create all necessary tables:

-- 1. Create Profiles / Users Table
create table if not exists public.profiles (
  id text primary key,
  name text not null,
  avatar text,
  role text not null check (role in ('student', 'tutor')),
  title text,
  subject text,
  rating numeric default 5.0,
  reviews_count integer default 0,
  rate_per_session integer default 500,
  experience text,
  bio text,
  skills text[],
  is_online boolean default false,
  email text unique,
  avatar_url text,
  phone text,
  age text,
  address text,
  password text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.profiles enable row level security;
create policy "Allow public read-write for demo profiles" on public.profiles for all using (true) with check (true);

-- 2. Create Sessions Table
create table if not exists public.sessions (
  id text primary key,
  subject text not null,
  topic text not null,
  tutor_id text not null,
  tutor_name text not null,
  tutor_avatar text,
  student_id text not null,
  student_name text not null,
  time_slot text not null,
  date_label text not null,
  status text not null check (status in ('live', 'upcoming', 'scheduled', 'completed', 'pending', 'rejected')),
  room_id text not null,
  slide_topic text,
  recording_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sessions enable row level security;
create policy "Allow public read-write for demo sessions" on public.sessions for all using (true) with check (true);

-- 3. Create Materials Table
create table if not exists public.materials (
  id text primary key,
  subject text not null,
  title text not null,
  type text not null check (type in ('pdf', 'video', 'notes')),
  file_size text,
  uploaded_date text not null,
  class_tag text not null,
  content text,
  topic text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.materials enable row level security;
create policy "Allow public read-write for demo materials" on public.materials for all using (true) with check (true);

-- 4. Create Assignments Table
create table if not exists public.assignments (
  id text primary key,
  student_name text not null,
  title text not null,
  due_date text not null,
  submitted_at text,
  status text not null check (status in ('pending', 'graded')),
  score text,
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.assignments enable row level security;
create policy "Allow public read-write for demo assignments" on public.assignments for all using (true) with check (true);
`;

// Helper: Map DB snake_case columns back to type-safe camelCase objects
function mapProfile(row: any): User {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    role: row.role,
    title: row.title,
    subject: row.subject,
    rating: row.rating ? parseFloat(row.rating) : 5.0,
    reviewsCount: row.reviews_count,
    ratePerSession: row.rate_per_session,
    experience: row.experience,
    bio: row.bio,
    skills: row.skills || [],
    isOnline: row.is_online,
    email: row.email,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    age: row.age,
    address: row.address,
    password: row.password
  };
}

function mapSession(row: any): Session {
  let status = row.status;
  if (row.slide_topic === "STATUS_OVERRIDE:pending") {
    status = "pending";
  } else if (row.slide_topic === "STATUS_OVERRIDE:rejected") {
    status = "rejected";
  }

  return {
    id: row.id,
    subject: row.subject,
    topic: row.topic,
    tutorId: row.tutor_id,
    tutorName: row.tutor_name,
    tutorAvatar: row.tutor_avatar || "",
    studentId: row.student_id,
    studentName: row.student_name,
    timeSlot: row.time_slot,
    dateLabel: row.date_label,
    status: status,
    roomId: row.room_id,
    slideTopic: row.slide_topic && row.slide_topic.startsWith("STATUS_OVERRIDE:") ? "" : row.slide_topic,
    recordingUrl: row.recording_url
  };
}

// ── CUSTOM PERSISTENCE API GATEWAY ──
export const dbService = {
  // --- USERS / PROFILES ---
  async getProfiles(): Promise<User[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapProfile);
    } catch (err) {
      console.error("Supabase error fetching profiles. Falling back.", err);
      return [];
    }
  },

  async upsertProfile(user: User): Promise<void> {
    if (!supabase) return;
    try {
      const dbRow = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        title: user.title,
        subject: user.subject,
        rating: user.rating,
        reviews_count: user.reviewsCount,
        rate_per_session: user.ratePerSession,
        experience: user.experience,
        bio: user.bio,
        skills: user.skills,
        is_online: user.isOnline,
        email: user.email,
        avatar_url: user.avatarUrl,
        phone: user.phone,
        age: user.age,
        address: user.address,
        password: user.password
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(dbRow, { onConflict: "id" });
      if (error) throw error;
    } catch (err) {
      console.error("Supabase upsertProfile error:", err);
      throw err;
    }
  },

  // --- SESSIONS ---
  async getSessions(): Promise<Session[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(mapSession);
    } catch (err) {
      console.error("Supabase getSessions error", err);
      return [];
    }
  },

  async upsertSession(session: Session): Promise<void> {
    if (!supabase) return;
    try {
      const dbRow = {
        id: session.id,
        subject: session.subject,
        topic: session.topic,
        tutor_id: session.tutorId,
        tutor_name: session.tutorName,
        tutor_avatar: session.tutorAvatar,
        student_id: session.studentId,
        student_name: session.studentName,
        time_slot: session.timeSlot,
        date_label: session.dateLabel,
        status: session.status,
        room_id: session.roomId,
        slide_topic: session.slideTopic,
        recording_url: session.recordingUrl
      };
      const { error } = await supabase
        .from("sessions")
        .upsert(dbRow, { onConflict: "id" });
      
      if (error) {
        console.warn("Direct upsert of session status failed, attempting fallback status mapping...", error);
        
        let fallbackStatus: string = session.status;
        let slideTopicOverride = session.slideTopic;

        if (session.status === "pending") {
          fallbackStatus = "upcoming";
          slideTopicOverride = "STATUS_OVERRIDE:pending";
        } else if (session.status === "rejected") {
          fallbackStatus = "completed";
          slideTopicOverride = "STATUS_OVERRIDE:rejected";
        }

        const fallbackRow = {
          ...dbRow,
          status: fallbackStatus,
          slide_topic: slideTopicOverride
        };

        const { error: fallbackError } = await supabase
          .from("sessions")
          .upsert(fallbackRow, { onConflict: "id" });
        
        if (fallbackError) throw fallbackError;
      }
    } catch (err) {
      console.error("Supabase error upserting session", err);
      throw err;
    }
  },

  // --- MATERIALS / STUDY WORKBOOKS ---
  async getMaterials(): Promise<NoteMaterial[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Supabase getMaterials error", err);
      return [];
    }
  },

  async upsertMaterial(material: NoteMaterial): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("materials")
        .upsert({
          id: material.id,
          subject: material.subject,
          title: material.title,
          type: material.type,
          file_size: material.fileSize,
          uploaded_date: material.uploadedDate,
          class_tag: material.classTag,
          content: material.content,
          topic: material.topic
        }, { onConflict: "id" });
      if (error) throw error;
    } catch (err) {
      console.error("Supabase upsertMaterial error", err);
      throw err;
    }
  },

  // --- ASSIGNMENTS ---
  async getAssignments(): Promise<Assignment[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        studentName: row.student_name,
        title: row.title,
        dueDate: row.due_date,
        submittedAt: row.submitted_at,
        status: row.status,
        score: row.score,
        feedback: row.feedback
      }));
    } catch (err) {
      console.error("Supabase getAssignments error", err);
      return [];
    }
  },

  async upsertAssignment(assignment: Assignment): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("assignments")
        .upsert({
          id: assignment.id,
          student_name: assignment.studentName,
          title: assignment.title,
          due_date: assignment.dueDate,
          submitted_at: assignment.submittedAt,
          status: assignment.status,
          score: assignment.score,
          feedback: assignment.feedback
        }, { onConflict: "id" });
      if (error) throw error;
    } catch (err) {
      console.error("Supabase upsertAssignment error", err);
      throw err;
    }
  },

  // ── FILE UPLOAD TO SUPABASE OBJECT STORAGE BUCKETS ──
  async uploadFileToStorage(
    bucketName: string,
    filePath: string,
    base64Data: string
  ): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");
    try {
      // Decode Base64 representation to raw bytes / Blob array
      const byteCharacters = atob(base64Data.split(",")[1] || base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const fileBlob = new Blob([byteArray]);

      // Upload payload directly to physical bucket
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBlob, {
          upsert: true,
          contentType: base64Data.startsWith("data:")
            ? base64Data.split(";")[0]?.replace("data:", "")
            : "application/octet-stream"
        });

      if (error) throw error;

      // Extract raw public asset share link from Supabase
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Supabase Storage Error: ", err);
      throw err;
    }
  }
};
