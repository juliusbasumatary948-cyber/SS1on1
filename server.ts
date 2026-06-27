import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limits for file upload integration (Base64 videos and documents)
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("Waring: GEMINI_API_KEY not found in environment. AI features will fallback to local generation.");
}

// Ensure the local folder has static content compiled during builds

// ── API ROUTES ──

// Helper: safe mock responses if Gemini API Key is not set or fails
function getMockNotes(topic: string) {
  return `### Study Revision Notes: ${topic}
  
1. **Core Concept Overview**:
   This topic covers the fundamental theorem, critical frameworks, and properties essential to comprehensive understanding.
   
2. **Key Definitions**:
   - **Main Terminology**: The primary actor or mathematical structure utilized in this branch.
   - **Differential Element**: A minor, descriptive rate or ratio indicating dynamic, local changes.
   
3. **Core Equations / Formulas**:
   * $$ f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} $$
   * $$ \\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C $$
   
4. **Key Applications**:
   - Dynamic simulation in physics, optimization across economic fields, rate analysis, and statistical distributions.
   
*Notes generated locally. Add your Gemini API Key in AI Studio secrets to use AI generation.*`;
}

function getMockQuiz(topic: string) {
  return [
    {
      question: `What is the fundamental objective of ${topic}?`,
      options: [
        "To determine the instantaneous rate of change or cumulative accumulation of a quantity.",
        "To simply create charts and diagrams without logic.",
        "To reverse-engineer database architectures.",
        "To establish standard text-styling constraints."
      ],
      answerIndex: 0,
      explanation: "This covers the primary theoretical foundation of the topic."
    },
    {
      question: `Which of the following describes a key element in ${topic}?`,
      options: [
        "A constant with zero variance across all operations",
        "A rate of change or localized derivative factor",
        "An arbitrary web browser protocol",
        "A relational database index"
      ],
      answerIndex: 1,
      explanation: "Rates of change are fundamental to modeling dynamic systems here."
    }
  ];
}

// ── STUDY ASSETS STORAGE FALLBACK API ──
app.get("/api/storage/status", (req, res) => {
  const isSupabase = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
  res.json({
    provider: isSupabase ? "Supabase Cloud Vault" : "Sikho Local Persistence Engine",
    status: "healthy"
  });
});

// 1. Generate Notes Endpoint
app.post("/api/gemini/generate-notes", async (req, res) => {
  const { topic, subject } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  if (!ai) {
    return res.json({ notes: getMockNotes(topic) });
  }

  try {
    const prompt = `You are an expert tutor. Please generate detailed, clean, and professional study revision notes for class 11-12 curriculum on the subject ${subject || "general"} for the topic: "${topic}".
    Format the notes beautifully inside Markdown, using clear bullet points, brief definitions, and 2 key equations/formulas. Keep it compact, scannable, and highly visual.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ notes: response.text || getMockNotes(topic) });
  } catch (err: any) {
    console.error("Gemini Generate Notes Error:", err);
    res.json({ notes: getMockNotes(topic) });
  }
});

// 2. Generate Quiz Endpoint
app.post("/api/gemini/generate-quiz", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  if (!ai) {
    return res.json({ quiz: getMockQuiz(topic) });
  }

  try {
    const prompt = `You are an expert tutor preparing revision quizzes. Generate a 3-question multiple choice quiz about "${topic}".
    Return the response strictly inside JSON array format, conforming to this schema:
    [
      {
        "question": "The question text of question 1?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answerIndex": 0,
        "explanation": "Why Option A is correct."
      }
    ]
    Do not output any markdown formatting wrappers or explanation outside of the valid JSON structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              answerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "answerIndex", "explanation"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "[]");
    res.json({ quiz: parsed.length ? parsed : getMockQuiz(topic) });
  } catch (err: any) {
    console.error("Gemini Generate Quiz Error:", err);
    res.json({ quiz: getMockQuiz(topic) });
  }
});

// ── GOOGLE SIGN-IN / OAUTH ENDPOINTS ──

// Endpoint to retrieve the direct Google OAuth URL to open in a popup (critical for iframes)
app.get("/api/auth/google/url", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const isConfigured = !!(clientId && clientSecret);
  const mode = req.query.mode || "login";

  if (isConfigured) {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/google/callback`;
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
      access_type: "offline",
      prompt: "consent",
      state: mode as string
    }).toString();
    return res.json({ isConfigured: true, url: googleUrl });
  }

  return res.json({ isConfigured: false });
});

// 1. Google OAuth Authorize & Sandbox fallback
app.get("/auth/google/start", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const isConfigured = !!(clientId && clientSecret);
  const mode = req.query.mode || "login";
  
  if (isConfigured) {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/google/callback`;
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
      access_type: "offline",
      prompt: "consent",
      state: mode as string
    }).toString();
    return res.redirect(googleUrl);
  }

  // Serve custom Google Sandboxed account chooser fallback
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in - Google Accounts</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { font-family: 'Roboto', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4 text-[#202124]">
      <div class="bg-white border border-gray-200 rounded-lg max-w-[440px] w-full p-8 md:p-10 shadow-sm relative transition-all duration-300">
        <div class="flex flex-col items-center mb-6">
          <!-- Google Logo -->
          <svg class="h-8 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.1H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.9l3.66-2.78z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.1l3.66 2.84c.87-2.6 3.3-4.56 6.16-4.56z" fill="#EA4335"/>
          </svg>
          <h1 class="text-2xl font-normal tracking-tight">Choose an account</h1>
          <p class="text-sm text-gray-500 mt-1">to continue to <span class="font-medium text-blue-600">Sikho Sikhow</span></p>
          
          <div class="mt-4 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] px-3 py-1.5 rounded-md text-center max-w-sm">
            🔒 <strong>Google Sandbox Secure Flow</strong> is active (${mode === "signup" ? "signup mode" : "login mode"}). You can choose a pre-configured profile or register a custom testing account.
          </div>
        </div>

        <div id="accounts-container" class="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          <!-- Preset Users -->
          <button type="button" onclick="selectUser('Julius Basumatary', 'juliusbasumatary948@gmail.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop')" 
               class="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 border border-slate-100 rounded-lg cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-blue-500">
            <img class="w-8 h-8 rounded-full object-cover shrink-0" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" alt="">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">Julius Basumatary</div>
              <div class="text-xs text-gray-500 truncate">juliusbasumatary948@gmail.com</div>
            </div>
            <span class="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold shrink-0">Student</span>
          </button>
 
          <button type="button" onclick="selectUser('Dr. Alok Verma', 'alok.verma@gmail.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop')" 
               class="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 border border-slate-100 rounded-lg cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-blue-500">
            <img class="w-8 h-8 rounded-full object-cover shrink-0" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" alt="">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">Dr. Alok Verma</div>
              <div class="text-xs text-gray-500 truncate">alok.verma@gmail.com</div>
            </div>
            <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold shrink-0">Teacher</span>
          </button>

          <button type="button" onclick="selectUser('Ananya Patel', 'ananya.p@gmail.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop')" 
               class="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 border border-slate-100 rounded-lg cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-blue-500">
            <img class="w-8 h-8 rounded-full object-cover shrink-0" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" alt="">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">Ananya Patel</div>
              <div class="text-xs text-gray-500 truncate">ananya.p@gmail.com</div>
            </div>
            <span class="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold shrink-0">Student</span>
          </button>

          <button type="button" onclick="toggleCustomForm()" 
               class="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 border border-slate-100 rounded-lg cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-blue-500">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-base shrink-0">
              👤
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-800 truncate">Use custom sandbox email...</div>
              <div class="text-xs text-slate-500 truncate">Log in with your own custom Google credentials</div>
            </div>
          </button>
        </div>

        <!-- Custom Account Selector Form -->
        <div id="custom-form" class="hidden mt-4 border-t border-slate-200 pt-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-700">Enter custom details</h3>
            <span class="text-[10px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 font-bold">Mock Google Session</span>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Google profile Name</label>
            <input id="custom-name" type="text" placeholder="e.g. Rahul Sen" class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mt-1 shadow-sm">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Gmail Address</label>
            <input id="custom-email" type="text" placeholder="e.g. rahul@gmail.com" class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mt-1 shadow-sm">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Role Profile</label>
            <select id="custom-role" class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mt-1 shadow-sm">
              <option value="student">Student User Account</option>
              <option value="tutor">Teacher Instructor Account</option>
            </select>
          </div>
          <div class="flex gap-2 justify-end pt-2">
            <button onclick="toggleCustomForm()" type="button" class="text-xs text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition">Cancel</button>
            <button onclick="submitCustom()" type="button" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition">Continue as Google</button>
          </div>
        </div>

        <div class="mt-8 text-xs text-gray-500 flex justify-between items-center border-t border-gray-100 pt-4">
          <span class="hover:underline cursor-pointer">English (United Kingdom)</span>
          <div class="flex gap-3">
            <span class="hover:underline cursor-pointer">Help</span>
            <span class="hover:underline cursor-pointer">Privacy</span>
            <span class="hover:underline cursor-pointer">Terms</span>
          </div>
        </div>
      </div>

      <script>
        const authMode = ${JSON.stringify(mode)};

        function selectUser(name, email, picture) {
          const role = email.includes('verma') || name.includes('Dr.') || name.includes('Prof.') ? 'tutor' : 'student';
          sendAuthMessage(name, email, picture, role);
        }

        function toggleCustomForm() {
          const form = document.getElementById('custom-form');
          const container = document.getElementById('accounts-container');
          form.classList.toggle('hidden');
          container.classList.toggle('hidden');
        }

        function submitCustom() {
          const nameInput = document.getElementById('custom-name');
          const emailInput = document.getElementById('custom-email');
          const roleSelect = document.getElementById('custom-role');
          
          const name = nameInput.value.trim() || 'Guest Learner';
          let email = emailInput.value.trim() || 'learner@gmail.com';
          const role = roleSelect.value;

          if (!email.includes('@')) {
            email = email + '@gmail.com';
          }

          // Pick avatar corresponding to student/tutor
          const picture = role === 'tutor' 
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
            
          sendAuthMessage(name, email, picture, role);
        }

        function sendAuthMessage(name, email, picture, role) {
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              mode: authMode,
              user: {
                name: name,
                email: email,
                picture: picture,
                role: role
              }
            }, '*');
            window.close();
          } else {
            alert('Sandbox Sign-In Success! Welcome ' + name + ' (' + email + ')');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// 2. Google OAuth Callback
app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).send("Authentication code is missing from callback scope.");
  }

  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const redirectUri = `${appUrl}/auth/google/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;

  const mode = (state as string) || "login";

  try {
    // Exchange authorize code for access and ID tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      throw new Error(`Token exchange error code: ${tokenResponse.status} - message: ${errBody}`);
    }

    const tokenData = await tokenResponse.json() as any;
    const { access_token } = tokenData;

    // Retrieve userinfo endpoints from Google userinfo API
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!userinfoResponse.ok) {
      throw new Error(`User info request returned error status: ${userinfoResponse.status}`);
    }

    const googleUser = await userinfoResponse.json() as any;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Google Redirect Authorisation Completion</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b; }
          .card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); text-align: center; max-width: 380px; border: 1px solid #e2e8f0; }
          h2 { margin-bottom: 6px; font-weight: 700; color: #022c22; font-size: 1.25rem; }
          p { font-size: 13px; color: #64748b; line-height: 1.5; }
          .spinner { border: 3px solid #e2e8f0; border-top: 3px solid #047857; border-radius: 50%; width: 28px; height: 28px; animation: spin 0.8s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>Completing Google Sign-In</h2>
          <p>Please wait. Redirecting your authentication session and closing this popup window...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: "OAUTH_AUTH_SUCCESS",
              mode: ${JSON.stringify(mode)},
              user: {
                name: ${JSON.stringify(googleUser.name)},
                email: ${JSON.stringify(googleUser.email)},
                picture: ${JSON.stringify(googleUser.picture)},
                accessToken: ${JSON.stringify(access_token)}
              }
            }, "*");
            window.close();
          } else {
            window.location.href = "/";
          }
        </script>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error("Google authentication service failed with error details: ", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Access Refused</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center; background-color: #fef2f2; color: #991b1b;">
          <h2>Google Authentication Error</h2>
          <p style="font-weight: 500; font-size: 14px;">The OAuth profile credentials set on this container are invalid or returned an error.</p>
          <div style="background: white; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 11px; max-width: 500px; margin: 20px auto; text-align: left; overflow-x: auto;">
            Error description: ${error.message}
          </div>
          <p style="font-size: 12px; color: #7f1d1d;">Please check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment settings.</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #ea4335; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 10px;">Close Window</button>
        </body>
      </html>
    `);
  }
});

// ── SUPER ADMIN PERSISTENCE & SECURE BACKEND RBAC VALIDATION ──

const STORE_PATH = path.join(process.cwd(), "admin-store.json");

interface AdminStore {
  userStatuses: Record<string, {
    status?: "active" | "blocked" | "suspended";
    verificationStatus?: "pending" | "verified" | "rejected";
    flagged?: boolean;
    flagReason?: string;
    updatedAt?: string;
  }>;
  settings: {
    commissionRate: number;
    categories: string[];
    subjects: string[];
    maintenanceMode: boolean;
  };
  auditLogs: Array<{
    id: string;
    timestamp: string;
    adminEmail: string;
    action: string;
    targetUserId?: string;
    targetUserName?: string;
    details: string;
  }>;
}

function getAdminStore(): AdminStore {
  if (!fs.existsSync(STORE_PATH)) {
    const initialStore: AdminStore = {
      userStatuses: {},
      settings: {
        commissionRate: 11.11,
        categories: ["School Curricula", "Competitive Exams", "Language Learning", "Music & Drawing"],
        subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English Literature", "Computer Science"],
        maintenanceMode: false
      },
      auditLogs: [
        {
          id: "log-init",
          timestamp: new Date().toISOString(),
          adminEmail: "system",
          action: "system_init",
          details: "Platform administrative and auditing rules activated securely."
        }
      ]
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf8");
    return initialStore;
  }
  try {
    const data = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading admin-store.json:", err);
    return {
      userStatuses: {},
      settings: {
        commissionRate: 11.11,
        categories: ["School Curricula", "Competitive Exams", "Language Learning", "Music & Drawing"],
        subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English Literature", "Computer Science"],
        maintenanceMode: false
      },
      auditLogs: []
    };
  }
}

function saveAdminStore(store: AdminStore) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving admin-store.json:", err);
  }
}

// Secure middleware validation
function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminEmail = (req.headers["x-admin-email"] || req.body.adminEmail || req.query.adminEmail || "").toString().trim().toLowerCase();
  const isAdmin = 
    adminEmail === "tutorconnect01@gmail.com" || 
    adminEmail === "tutorconnect1@gmail.com" || 
    adminEmail === "tutorconnect1@gmai.com";

  if (isAdmin) {
    next();
  } else {
    res.status(403).json({ error: "Access Denied: Only authorized Super Admins can perform this action." });
  }
}

// 1. Fetch entire Admin Panel state
app.post("/api/admin/dashboard-data", requireSuperAdmin, (req, res) => {
  const store = getAdminStore();
  res.json({
    userStatuses: store.userStatuses,
    settings: store.settings,
    auditLogs: store.auditLogs
  });
});

// 2. Block, Unblock, Suspend a User Account
app.post("/api/admin/update-user-status", requireSuperAdmin, (req, res) => {
  const { adminEmail, targetUserId, targetUserName, status } = req.body;
  if (!targetUserId || !status) {
    return res.status(400).json({ error: "Missing TargetUserId or Status parameters" });
  }

  const store = getAdminStore();
  if (!store.userStatuses[targetUserId]) {
    store.userStatuses[targetUserId] = {};
  }

  const oldStatus = store.userStatuses[targetUserId].status || "active";
  store.userStatuses[targetUserId].status = status;
  store.userStatuses[targetUserId].updatedAt = new Date().toISOString();

  // Audit Logs
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    adminEmail: adminEmail as string,
    action: status === "active" ? "unblock_user" : status === "blocked" ? "block_user" : "suspend_user",
    targetUserId,
    targetUserName: targetUserName || "Unknown User",
    details: `User status changed from '${oldStatus}' to '${status}'.`
  };
  store.auditLogs.unshift(newLog);

  saveAdminStore(store);
  res.json({ success: true, userStatuses: store.userStatuses, auditLogs: store.auditLogs });
});

// 3. Verify or Reject Tutor applications
app.post("/api/admin/update-tutor-verification", requireSuperAdmin, (req, res) => {
  const { adminEmail, targetUserId, targetUserName, verificationStatus } = req.body;
  if (!targetUserId || !verificationStatus) {
    return res.status(400).json({ error: "Missing target parameter fields" });
  }

  const store = getAdminStore();
  if (!store.userStatuses[targetUserId]) {
    store.userStatuses[targetUserId] = {};
  }

  const oldVer = store.userStatuses[targetUserId].verificationStatus || "pending";
  store.userStatuses[targetUserId].verificationStatus = verificationStatus;
  store.userStatuses[targetUserId].updatedAt = new Date().toISOString();

  // Audit Logs
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    adminEmail: adminEmail as string,
    action: verificationStatus === "verified" ? "verify_tutor" : "reject_tutor",
    targetUserId,
    targetUserName: targetUserName || "Unknown Tutor",
    details: `Tutor applications verification transitioned from '${oldVer}' to '${verificationStatus}'.`
  };
  store.auditLogs.unshift(newLog);

  saveAdminStore(store);
  res.json({ success: true, userStatuses: store.userStatuses, auditLogs: store.auditLogs });
});

// 4. Update administrative system settings (Commission Rate, Categories, Subjects list)
app.post("/api/admin/update-settings", requireSuperAdmin, (req, res) => {
  const { adminEmail, settings, logDetails } = req.body;
  if (!settings) {
    return res.status(400).json({ error: "Missing settings payload" });
  }

  const store = getAdminStore();
  const originalRate = store.settings.commissionRate;
  store.settings = { ...store.settings, ...settings };

  // Audit Logs
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    adminEmail: adminEmail as string,
    action: "update_settings",
    details: logDetails || `Updated system configurations. Commission: ${originalRate}% -> ${(settings.commissionRate !== undefined) ? settings.commissionRate : originalRate}%. Managed Categories count: ${store.settings.categories.length}.`
  };
  store.auditLogs.unshift(newLog);

  saveAdminStore(store);
  res.json({ success: true, settings: store.settings, auditLogs: store.auditLogs });
});

// 5. Lightweight public API to sync settings & account statuses across student & tutor sessions
app.get("/api/public/user-statuses", (req, res) => {
  const store = getAdminStore();
  res.json({
    userStatuses: store.userStatuses,
    settings: store.settings
  });
});

// ── CHAT ROOMS & REAL-TIME MULTI-USER MESSAGING SYSTEM ──

const CHAT_STORE_PATH = path.join(process.cwd(), "chats-store.json");

interface ChatMessagePlus {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "tutor" | "assistant" | "admin";
  text: string;
  timestamp: string;
  status: "sending" | "delivered" | "seen";
  fileUrl?: string;
  fileName?: string;
  fileType?: "image" | "pdf" | "material" | "text";
  materialId?: string;
  reported?: boolean;
}

interface ChatRoom {
  roomId: string; // chat_tutorId_studentId
  tutorId: string;
  studentId: string;
  messages: ChatMessagePlus[];
}

interface AbuseReport {
  id: string;
  roomId: string;
  timestamp: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  messagesSnippet: ChatMessagePlus[];
  resolved: boolean;
}

interface ChatStore {
  rooms: Record<string, ChatRoom>;
  reports: AbuseReport[];
}

function getChatStore(): ChatStore {
  if (!fs.existsSync(CHAT_STORE_PATH)) {
    const initialStore: ChatStore = {
      rooms: {},
      reports: []
    };
    fs.writeFileSync(CHAT_STORE_PATH, JSON.stringify(initialStore, null, 2), "utf8");
    return initialStore;
  }
  try {
    const data = fs.readFileSync(CHAT_STORE_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.warn("Chats store file parsing failed, creating empty store:", err);
    return { rooms: {}, reports: [] };
  }
}

function saveChatStore(store: ChatStore) {
  try {
    fs.writeFileSync(CHAT_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing chats-store.json:", err);
  }
}

// REST Handlers for Chat Configuration, History & Moderation
app.get("/api/chat/history", (req, res) => {
  const { roomId, userId } = req.query as { roomId: string, userId: string };
  if (!roomId || !userId) {
    return res.status(400).json({ error: "Missing roomId or userId query parameters." });
  }

  // Security gate: User must be part of that room OR a Super Admin
  const parsedIds = roomId.replace("chat_", "").split("_");
  const tutorId = parsedIds[0];
  const studentId = parsedIds[1];

  const isSuperAdmin = userId === "tutorconnect01@gmail.com" || 
                       userId === "tutorconnect1@gmail.com" || 
                       userId === "tutorconnect1@gmai.com";

  if (userId !== tutorId && userId !== studentId && !isSuperAdmin) {
    return res.status(403).json({ error: "Access Denied: You are not authorized to view this private chat history." });
  }

  const store = getChatStore();
  if (!store.rooms[roomId]) {
    store.rooms[roomId] = {
      roomId,
      tutorId,
      studentId,
      messages: []
    };
    saveChatStore(store);
  }

  res.json({ success: true, messages: store.rooms[roomId].messages });
});

// Create report endpoint
app.post("/api/chat/report", (req, res) => {
  const { roomId, reporterId, reporterName, reason } = req.body;
  if (!roomId || !reporterId || !reason) {
    return res.status(400).json({ error: "Missing report payload (roomId, reporterId, reason)." });
  }

  const chatStore = getChatStore();
  const roomMessages = chatStore.rooms[roomId]?.messages || [];
  const snapshot = roomMessages.slice(-15); // capture last 15 messages for context

  const newReport: AbuseReport = {
    id: `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    roomId,
    timestamp: new Date().toISOString(),
    reporterId,
    reporterName: reporterName || "Anonymous Reporter",
    reason,
    messagesSnippet: snapshot,
    resolved: false
  };

  chatStore.reports.unshift(newReport);

  // Mark room messages as reported
  if (chatStore.rooms[roomId]) {
    chatStore.rooms[roomId].messages = chatStore.rooms[roomId].messages.map(m => ({ ...m, reported: true }));
  }

  saveChatStore(chatStore);
  res.json({ success: true, message: "Abuse report sent successfully to Super Admins." });
});

// Super Admin Moderation Endpoints
app.get("/api/chat/admin/reports", requireSuperAdmin, (req, res) => {
  const store = getChatStore();
  res.json({ success: true, reports: store.reports || [] });
});

app.get("/api/chat/admin/room-messages", requireSuperAdmin, (req, res) => {
  const { roomId } = req.query as { roomId: string };
  if (!roomId) {
    return res.status(400).json({ error: "Missing roomId" });
  }
  const store = getChatStore();
  const room = store.rooms[roomId];
  res.json({ success: true, messages: room ? room.messages : [] });
});

app.post("/api/chat/admin/resolve-report", requireSuperAdmin, (req, res) => {
  const { reportId } = req.body;
  if (!reportId) {
    return res.status(400).json({ error: "Missing reportId" });
  }
  const store = getChatStore();
  const index = store.reports.findIndex(r => r.id === reportId);
  if (index !== -1) {
    store.reports[index].resolved = true;
    saveChatStore(store);
  }
  res.json({ success: true, reports: store.reports });
});

// ── VITE MIDDLEWARE SETUP ──
async function initializeVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // ── INTEGRATE WEBSOCKET SERVER ──
  const wss = new WebSocketServer({ server });

  interface ActiveClient {
    ws: WebSocket;
    userId: string;
    role: string;
    roomId?: string;
  }

  const clients = new Set<ActiveClient>();

  wss.on("connection", (ws) => {
    let clientRef: ActiveClient | null = null;

    ws.on("message", (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString());
        
        if (payload.type === "join") {
          const { userId, role, roomId } = payload;
          if (!userId) return;

          // Remove existing client with same userId to prevent leaks
          for (const c of clients) {
            if (c.userId === userId) {
              clients.delete(c);
            }
          }

          clientRef = { ws, userId, role, roomId };
          clients.add(clientRef);

          // If room joined, look for other user's messages and mark as delivered or seen
          if (roomId) {
            const chatStore = getChatStore();
            let changed = false;
            
            if (chatStore.rooms[roomId]) {
              chatStore.rooms[roomId].messages = chatStore.rooms[roomId].messages.map(m => {
                if (m.senderId !== userId && m.status !== "seen") {
                  m.status = "seen";
                  changed = true;
                }
                return m;
              });
              if (changed) {
                saveChatStore(chatStore);
                // Broadcast to anyone in this room that statuses got read
                for (const client of clients) {
                  if (client.roomId === roomId && client.userId !== userId) {
                    client.ws.send(JSON.stringify({
                      type: "message_status_updated",
                      roomId,
                      status: "seen"
                    }));
                  }
                }
              }
            }
          }
        }

        else if (payload.type === "message") {
          const { senderId, senderName, senderRole, roomId, text, fileUrl, fileName, fileType, materialId } = payload;
          if (!senderId || !roomId) return;

          const parsedIds = roomId.replace("chat_", "").split("_");
          const tutorId = parsedIds[0];
          const studentId = parsedIds[1];
          const receiverId = senderId === tutorId ? studentId : tutorId;

          // Determine if receiver is currently viewing the room or online
          let receiverActiveHere = false;
          let receiverOnlineAtAll = false;

          for (const client of clients) {
            if (client.userId === receiverId) {
              receiverOnlineAtAll = true;
              if (client.roomId === roomId) {
                receiverActiveHere = true;
              }
            }
          }

          const status: "delivered" | "seen" = receiverActiveHere ? "seen" : "delivered";

          const newMessage: ChatMessagePlus = {
            id: `msg-${Date.now()}-${Math.floor(Math.random() * 1005)}`,
            senderId,
            senderName,
            senderRole,
            text: text || "",
            timestamp: new Date().toISOString(),
            status,
            fileUrl,
            fileName,
            fileType,
            materialId
          };

          // Store message
          const chatStore = getChatStore();
          if (!chatStore.rooms[roomId]) {
            chatStore.rooms[roomId] = {
              roomId,
              tutorId,
              studentId,
              messages: []
            };
          }
          chatStore.rooms[roomId].messages.push(newMessage);
          saveChatStore(chatStore);

          // Broadcast to sender & receiver (and anyone in the room)
          const broadcastPayload = JSON.stringify({
            type: "message",
            roomId,
            message: newMessage
          });

          ws.send(broadcastPayload); // Echo back to sender to confirm

          for (const client of clients) {
            if (client.roomId === roomId && client.userId !== senderId) {
              client.ws.send(broadcastPayload);
            } else if (client.userId === receiverId && client.roomId !== roomId) {
              // Send off-room real-time unread notification event
              client.ws.send(JSON.stringify({
                type: "notification",
                roomId,
                message: newMessage
              }));
            }
          }
        }

        else if (payload.type === "typing") {
          const { senderId, isTyping, roomId } = payload;
          if (!senderId || !roomId) return;

          // Broadcast typing status to room mates
          for (const client of clients) {
            if (client.roomId === roomId && client.userId !== senderId) {
              client.ws.send(JSON.stringify({
                type: "typing",
                roomId,
                senderId,
                isTyping
              }));
            }
          }
        }

        else if (payload.type === "mark_seen") {
          const { roomId, userId } = payload;
          if (!roomId || !userId) return;

          const chatStore = getChatStore();
          let altered = false;

          if (chatStore.rooms[roomId]) {
            chatStore.rooms[roomId].messages = chatStore.rooms[roomId].messages.map(m => {
              if (m.senderId !== userId && m.status !== "seen") {
                m.status = "seen";
                altered = true;
              }
              return m;
            });

            if (altered) {
              saveChatStore(chatStore);
              // Broadcast status update
              for (const client of clients) {
                if (client.roomId === roomId && client.userId !== userId) {
                  client.ws.send(JSON.stringify({
                    type: "message_status_updated",
                    roomId,
                    status: "seen"
                  }));
                }
              }
            }
          }
        }

      } catch (err) {
        console.warn("WebSocket raw packet parse fail:", err);
      }
    });

    ws.on("close", () => {
      if (clientRef) {
        clients.delete(clientRef);
      }
    });
  });
}

initializeVite().catch(err => {
  console.error("Failed to start server:", err);
});
