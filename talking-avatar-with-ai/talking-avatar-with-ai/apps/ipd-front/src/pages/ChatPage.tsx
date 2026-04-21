import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { Scenario } from "../components/Scenario";
import { useSpeech } from "../hooks/useSpeech";
import { FileUploadCard } from "../components/FileUploadCard";
import { LanguageSelector } from "../components/LanguageSelector";
import { GlassCard } from "../components/ui/glass-card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { PDFViewer } from "../components/PDFViewer";
import { ChatHistorySidebar, ChatSession } from "../components/ChatHistorySidebar";
import { applyHighlights, clearAllHighlights } from "../lib/highlightEngine";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { v4 as uuidv4 } from "uuid";
import { 
  Mic, 
  MicOff, 
  Send, 
  Upload, 
  Volume2, 
  VolumeX,
  Loader2,
  Timer,
  ShieldAlert,
  Play,
  OctagonX,
  ShieldCheck,
  ShieldX
} from "lucide-react";

const NOTES_API_BASE_URL = import.meta.env.VITE_NOTES_API_BASE_URL || "http://localhost:3001/api";
const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

type UploadedFileMeta = { name: string; size: number; type: string };
type ChatMessage = {
  isUser: boolean;
  text: string;
  highlights?: any[];
  citations?: any[];
  referencePages?: number[];
};
type ParsedPage = { pageNumber: number; logicalLabel?: string; text?: string };
type QuizQuestion = {
  question: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  page?: number;
  confidence?: string;
  difficulty?: string;
  topic?: string;
};
type QuizEvaluation = {
  result: "correct" | "partially_correct" | "incorrect";
  score: number;
  reason: string;
  missing_points?: string[];
  accepted_perspective?: string;
};
type ParsedDocument = {
  id: string;
  name: string;
  type: string;
  sizeBytes?: number;
  pages: ParsedPage[];
  fileUrl: string | null;
};

const SESSION_KEY = "avatarask_sessions";
const MAX_SESSIONS = 50;
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const focusStorageKey = (sessionId: string) => `avatarask_focus_state_${sessionId}`;

const firstWords = (value: string) => value.trim().split(/\s+/).slice(0, 6).join(" ");
const stripPdfExt = (name: string) => name.replace(/\.pdf$/i, "");
const formatPomodoroClock = (sec: number) => {
  const safe = Math.max(0, sec);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

type FocusPhase = "idle" | "focus" | "break" | "pausedByTabSwitch";
type ExtensionResponse = {
  source: "avatarask-extension";
  type: "AVATARASK_EXTENSION_RESPONSE";
  action: string;
  payload?: { ok?: boolean; available?: boolean };
};

const avatarInfo = {
  maitri: {
    name: "Maitri",
    title: "Science Advisor",
    skills: ["Physics", "Chemistry", "Biology", "Technology"],
  },
  harsh: {
    name: "Harsh",
    title: "Mathematics Expert",
    skills: ["Mathematics", "Programming", "Algorithms", "Data Science"],
  },
  omkar: {
    name: "Omkar",
    title: "Humanities Specialist",
    skills: ["History", "Literature", "Philosophy", "Arts"],
  },
};

export default function ChatPage() {
  const { chatId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const avatarId = searchParams.get("avatar") || "maitri";
  const avatar = avatarInfo[avatarId as keyof typeof avatarInfo] || avatarInfo.maitri;

  const abortControllerRef = useRef<AbortController | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState(chatId || uuidv4());
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 1024 : true);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [language, setLanguage] = useState("en");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [uploading, setUploading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState("");
  const [quizError, setQuizError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [quizType, setQuizType] = useState("mixed");
  const [quizCount, setQuizCount] = useState(10);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizEvaluations, setQuizEvaluations] = useState<Record<number, QuizEvaluation>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [focusPhase, setFocusPhase] = useState<FocusPhase>("idle");
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(FOCUS_SECONDS);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(BREAK_SECONDS);
  const [focusWarnings, setFocusWarnings] = useState(0);
  const [focusNeedsManualRestart, setFocusNeedsManualRestart] = useState(false);
  const [strictLockEnabled, setStrictLockEnabled] = useState(true);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [focusExtensionError, setFocusExtensionError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatSession[]) : [];
    const bounded = parsed.slice(0, MAX_SESSIONS);
    setSessions(bounded);
  }, []);

  useEffect(() => {
    if (!sessions.length) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  }, [sessions]);

  useEffect(() => {
    if (sessions.length) return;
    const id = chatId || uuidv4();
    const bootstrap: ChatSession = {
      id,
      name: "New Chat",
      createdAt: new Date().toISOString(),
      avatarUsed: avatar.name,
      pdfFiles: [],
      messages: [],
    };
    setSessions([bootstrap]);
    setActiveSessionId(id);
    navigate(`/chat/${id}?avatar=${avatarId}`, { replace: true });
  }, [avatar.name, avatarId, chatId, navigate, sessions.length]);
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousSessionRef = useRef<string>("");
  const hydratingSessionRef = useRef(false);
  const focusHydratingRef = useRef(false);
  
  const {
    loading,
    startRecording,
    stopRecording,
    recording,
    enqueueAvatarMessage,
    micReady,
    micError,
    muted,
    setMuted,
  } = useSpeech();
  const currentDoc = documents[0] || null;
  const isPdf = currentDoc?.type === "pdf" && !!currentDoc?.fileUrl;

  useEffect(() => {
    if (!chatId) return;
    setActiveSessionId(chatId);
  }, [chatId]);

  useEffect(() => {
    if (!sessions.length) return;
    if (previousSessionRef.current === activeSessionId) return;
    const current = sessions.find((s) => s.id === activeSessionId);
    if (!current) return;

    hydratingSessionRef.current = true;
    setSwitching(true);
    setTimeout(() => {
      setMessages(
        current.messages.map((m) => ({
          isUser: m.role === "user",
          text: m.content,
        }))
      );
      setUploadedFiles(
        current.pdfFiles.map((f) => ({
          name: f.name,
          size: Number.parseInt(f.size, 10) || 0,
          type: "application/pdf",
        }))
      );
      setDocuments(
        current.pdfFiles.map((f) => ({
          id: uuidv4(),
          name: f.name,
          type: "pdf",
          pages: [],
          fileUrl: f.data || null,
        }))
      );
      clearAllHighlights();
      previousSessionRef.current = activeSessionId;
      hydratingSessionRef.current = false;
      setSwitching(false);
    }, 150);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (hydratingSessionRef.current) return;
    const serializedMessages = messages.map((m) => ({
      role: m.isUser ? "user" : ("assistant" as const),
      content: m.text,
      timestamp: new Date().toISOString(),
      highlightedPages: (m.citations || []).map((c: any) => c.page).filter(Boolean),
    }));
    const serializedPdf = uploadedFiles.map((f) => ({
      name: f.name,
      size: String(f.size),
      data: documents.find((d) => d.name === f.name)?.fileUrl || undefined,
    }));

    setSessions((prev) => {
      const existing = prev.find((s) => s.id === activeSessionId);
      const nextSession: ChatSession = {
        id: activeSessionId,
        name: existing?.name || "New Chat",
        createdAt: existing?.createdAt || new Date().toISOString(),
        avatarUsed: avatar.name,
        pdfFiles: serializedPdf,
        messages: serializedMessages,
      };
      const merged = [nextSession, ...prev.filter((s) => s.id !== activeSessionId)].slice(0, MAX_SESSIONS);
      return merged;
    });
  }, [activeSessionId, avatar.name, documents, messages, uploadedFiles]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (muted) setIsSpeaking(false);
  }, [muted]);

  const toKeywordSet = (value: string) =>
    new Set(
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const highlightRelevance = (questionText: string, snippet: string) => {
    const qSet = toKeywordSet(questionText);
    const sTokens = Array.from(toKeywordSet(snippet));
    if (!sTokens.length) return 0;
    let hits = 0;
    for (const t of sTokens) {
      if (qSet.has(t)) hits += 1;
    }
    return hits / sTokens.length;
  };

  const deriveReferencePages = (highlights: any[], citations: any[]) => {
    const pages = new Set<number>();
    (highlights || []).forEach((h: any) => {
      const p = Number(h?.page);
      if (p && !Number.isNaN(p)) pages.add(p);
    });
    (citations || []).forEach((c: any) => {
      const p = Number(c?.page);
      if (p && !Number.isNaN(p)) pages.add(p);
    });
    return Array.from(pages).sort((a, b) => a - b).slice(0, 8);
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const postToExtension = (action: string, payload: Record<string, unknown> = {}) => {
    window.postMessage(
      {
        source: "avatarask-web",
        type: "AVATARASK_EXTENSION",
        action,
        payload,
      },
      "*"
    );
  };

  const pingExtension = () =>
    new Promise<boolean>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve(false);
      }, 800);

      const onMessage = (event: MessageEvent) => {
        const data = event.data as ExtensionResponse | undefined;
        if (data?.source !== "avatarask-extension") return;
        if (data?.type !== "AVATARASK_EXTENSION_RESPONSE") return;
        if (data.action !== "PING") return;
        window.clearTimeout(timeoutId);
        window.removeEventListener("message", onMessage);
        resolve(Boolean(data.payload?.available));
      };

      window.addEventListener("message", onMessage);
      postToExtension("PING", {});
    });

  useEffect(() => {
    return () => {
      documents.forEach((doc) => {
        if (doc.fileUrl) URL.revokeObjectURL(doc.fileUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    pingExtension().then((ok) => {
      if (!mounted) return;
      setExtensionConnected(ok);
      if (!ok) {
        setStrictLockEnabled(false);
      }
    });

    const interval = window.setInterval(async () => {
      const ok = await pingExtension();
      if (!mounted) return;
      setExtensionConnected(ok);
      if (!ok) {
        setStrictLockEnabled(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    focusHydratingRef.current = true;
    const raw = localStorage.getItem(focusStorageKey(activeSessionId));
    if (!raw) {
      setFocusModeEnabled(false);
      setFocusPhase("idle");
      setFocusSecondsLeft(FOCUS_SECONDS);
      setBreakSecondsLeft(BREAK_SECONDS);
      setFocusWarnings(0);
      setFocusNeedsManualRestart(false);
      focusHydratingRef.current = false;
      return;
    }

    try {
      const saved = JSON.parse(raw) as {
        enabled: boolean;
        phase: FocusPhase;
        focusLeft: number;
        breakLeft: number;
        warnings: number;
        needsManualRestart: boolean;
        lastUpdated: number;
      };

      const now = Date.now();
      let nextPhase: FocusPhase = saved.phase || "idle";
      let nextFocus = Math.max(0, saved.focusLeft ?? FOCUS_SECONDS);
      let nextBreak = Math.max(0, saved.breakLeft ?? BREAK_SECONDS);
      let nextNeedsManualRestart = Boolean(saved.needsManualRestart);
      const elapsed = Math.max(0, Math.floor((now - (saved.lastUpdated || now)) / 1000));

      if (saved.enabled && elapsed > 0) {
        if (nextPhase === "focus") {
          if (elapsed >= nextFocus) {
            const remaining = elapsed - nextFocus;
            nextPhase = "break";
            nextFocus = FOCUS_SECONDS;
            nextBreak = Math.max(0, BREAK_SECONDS - remaining);
            if (nextBreak === 0) {
              nextPhase = "idle";
              nextNeedsManualRestart = true;
              nextBreak = BREAK_SECONDS;
            }
          } else {
            nextFocus -= elapsed;
          }
        } else if (nextPhase === "break") {
          if (elapsed >= nextBreak) {
            nextPhase = "idle";
            nextBreak = BREAK_SECONDS;
            nextNeedsManualRestart = true;
          } else {
            nextBreak -= elapsed;
          }
        }
      }

      setFocusModeEnabled(Boolean(saved.enabled));
      setFocusPhase(nextPhase);
      setFocusSecondsLeft(nextFocus);
      setBreakSecondsLeft(nextBreak);
      setFocusWarnings(saved.warnings || 0);
      setFocusNeedsManualRestart(nextNeedsManualRestart);
    } catch {
      setFocusModeEnabled(false);
      setFocusPhase("idle");
      setFocusSecondsLeft(FOCUS_SECONDS);
      setBreakSecondsLeft(BREAK_SECONDS);
      setFocusWarnings(0);
      setFocusNeedsManualRestart(false);
    } finally {
      focusHydratingRef.current = false;
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId || focusHydratingRef.current) return;
    localStorage.setItem(
      focusStorageKey(activeSessionId),
      JSON.stringify({
        enabled: focusModeEnabled,
        phase: focusPhase,
        focusLeft: focusSecondsLeft,
        breakLeft: breakSecondsLeft,
        warnings: focusWarnings,
        needsManualRestart: focusNeedsManualRestart,
        lastUpdated: Date.now(),
      })
    );
  }, [
    activeSessionId,
    breakSecondsLeft,
    focusModeEnabled,
    focusNeedsManualRestart,
    focusPhase,
    focusSecondsLeft,
    focusWarnings,
  ]);

  useEffect(() => {
    if (!focusModeEnabled) return;
    if (focusPhase !== "focus" && focusPhase !== "break") return;

    const tick = window.setInterval(() => {
      if (focusPhase === "focus") {
        setFocusSecondsLeft((prev) => {
          if (prev <= 1) {
            setFocusPhase("break");
            setBreakSecondsLeft(BREAK_SECONDS);
            return FOCUS_SECONDS;
          }
          return prev - 1;
        });
      } else {
        setBreakSecondsLeft((prev) => {
          if (prev <= 1) {
            setFocusPhase("idle");
            setFocusNeedsManualRestart(true);
            return BREAK_SECONDS;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [focusModeEnabled, focusPhase]);

  useEffect(() => {
    if (!extensionConnected) return;
    const shouldLock = focusModeEnabled && strictLockEnabled && focusPhase !== "idle";

    if (shouldLock) {
      postToExtension("LOCK", {
        allowedOrigin: window.location.origin,
        lockedPath: `/chat/${activeSessionId}`,
      });
      return;
    }

    postToExtension("UNLOCK", {});
  }, [activeSessionId, extensionConnected, focusModeEnabled, focusPhase, strictLockEnabled]);

  useEffect(() => {
    return () => {
      if (extensionConnected) {
        postToExtension("UNLOCK", {});
      }
    };
  }, [extensionConnected]);

  useEffect(() => {
    if (!focusModeEnabled) return;
    const handleVisibilitySwitch = () => {
      if (document.hidden && focusPhase === "focus") {
        setFocusPhase("pausedByTabSwitch");
        setFocusWarnings((prev) => prev + 1);
      }
    };

    const handleWindowBlur = () => {
      if (focusPhase === "focus") {
        setFocusPhase("pausedByTabSwitch");
        setFocusWarnings((prev) => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilitySwitch);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilitySwitch);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [focusModeEnabled, focusPhase]);

  const startFocusMode = () => {
    if (strictLockEnabled && !extensionConnected) {
      setFocusExtensionError("Strict lock needs the AvatarAsk Focus Extension loaded in Chrome.");
      return;
    }
    setFocusExtensionError("");
    setFocusModeEnabled(true);
    setFocusPhase("focus");
    setFocusSecondsLeft(FOCUS_SECONDS);
    setBreakSecondsLeft(BREAK_SECONDS);
    setFocusNeedsManualRestart(false);
  };

  const emergencyStopFocusMode = () => {
    setFocusExtensionError("");
    setFocusModeEnabled(false);
    setFocusPhase("idle");
    setFocusSecondsLeft(FOCUS_SECONDS);
    setBreakSecondsLeft(BREAK_SECONDS);
    setFocusNeedsManualRestart(false);
  };

  const resumeFocusAfterTabSwitch = () => {
    setFocusPhase("focus");
  };

  const sendMessage = async () => {
    const text = inputRef.current?.value.trim();
    if (!text || loading || notesLoading) return;

    setError("");
    setMessages((prev) => [...prev, { isUser: true, text }]);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId && s.name === "New Chat"
          ? { ...s, name: firstWords(text) || "New Chat" }
          : s
      )
    );
    if (inputRef.current) inputRef.current.value = "";

    const pageMap = documents.map((doc) => ({
      documentName: doc.name,
      pages: (doc.pages || []).map((p) => ({
        pageNumber: p.pageNumber,
        logicalLabel: p.logicalLabel || `Page ${p.pageNumber}`,
        text: (p.text || "").slice(0, 4000),
      })),
    }));

    setNotesLoading(true);
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await fetch(`${NOTES_API_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: text,
          documentTexts: [],
          pageMap,
          mode: "chat",
          language,
          conversationHistory: [],
          avatarName: avatar.name,
          avatarTitle: avatar.title,
          avatarSkills: avatar.skills,
          speakEnabled: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "AI request failed");
      }

      const response = await res.json();
      const normalizedHighlights =
        Array.isArray(response.highlights) && response.highlights.length
          ? response.highlights
          : Array.isArray(response.citations)
            ? response.citations
                .map((c: any) => ({
                  page: Number(c?.page) || null,
                  text_snippet: c?.text || c?.snippet || c?.quote || c?.excerpt || "",
                  color: "yellow",
                }))
                .filter((c: any) => c.page)
            : [];
      const scoredHighlights = normalizedHighlights
        .map((h: any) => {
          const snippet = h?.text_snippet || h?.snippet || h?.text || "";
          return {
            ...h,
            _rel: highlightRelevance(text, snippet),
          };
        })
        .sort((a: any, b: any) => b._rel - a._rel);
      const filteredHighlights = scoredHighlights
        .filter((h: any) => {
          const snippet = String(h?.text_snippet || h?.snippet || h?.text || "").toLowerCase();
          const heading = String(h?.section_heading || "").toLowerCase();
          return h._rel >= 0.14 || /definition|defined as|what is|means|properties|types|cap|consistency|availability|partition/.test(snippet) || /definition|overview|architecture|theorem/.test(heading);
        })
        .slice(0, 8);
      const finalHighlights =
        filteredHighlights.length > 0
          ? filteredHighlights
          : scoredHighlights.filter((h: any) => h._rel >= 0.05).slice(0, 6);
      const referencePages = deriveReferencePages(finalHighlights, response.citations || []);
      setMessages((prev) => [
        ...prev,
        {
          isUser: false,
          text: response.answer || "No answer generated.",
          highlights: finalHighlights,
          citations: response.citations || [],
          referencePages,
        },
      ]);
      enqueueAvatarMessage({
        text: response.answer || "",
        facialExpression: "default",
        animation: "TalkingOne",
        audio: response.audioBase64 || "",
        muted,
        lipsync: null,
      });
      if (!muted) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 5000);
      }

      if (documents.length > 0 && finalHighlights.length) {
        setActiveTab("notes");
        setTimeout(() => applyHighlights(finalHighlights, true), 200);
      } else if (documents.length > 0) {
        clearAllHighlights();
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Failed to ask Notes backend.");
      setMessages((prev) => [
        ...prev,
        { isUser: false, text: "I could not process this request right now. Please try again." },
      ]);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => ACCEPTED.includes(f.type));
    if (!files.length) return;

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch(`${NOTES_API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Upload failed");
      }

      const json = await res.json();
      const mappedDocs: ParsedDocument[] = await Promise.all((json.documents || []).map(async (doc: any) => {
        const matchingFile = files.find((f) => f.name === doc.name);
        let fileData: string | null = null;
        if (matchingFile?.type === "application/pdf") {
          try {
            fileData = await fileToDataUrl(matchingFile);
          } catch {
            fileData = null;
          }
        }
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: doc.name,
          type: doc.type,
          sizeBytes: doc.sizeBytes,
          pages: doc.pages || [],
          fileUrl: fileData,
        };
      }));

      setDocuments((prev) => [...prev, ...mappedDocs]);
      setUploadedFiles((prev) => [
        ...prev,
        ...files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      ]);
      setActiveTab("notes");
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId && s.name === "New Chat" && files[0]
            ? { ...s, name: stripPdfExt(files[0].name) || "New Chat" }
            : s
        )
      );
      clearAllHighlights();
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.message || "Failed to upload files to Notes backend.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setDocuments((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
  };

  const generateQuiz = async () => {
    if (!documents.length) {
      setQuizError("Upload a PDF first to generate quiz from document content.");
      return;
    }

    const current = documents[0];
    const documentText = (current.pages || []).map((p) => p.text || "").join("\n\n");
    if (!documentText.trim()) {
      setQuizError("No extractable text found in this document.");
      return;
    }

    setQuizError("");
    setQuizLoading(true);
    setRevealedAnswers({});
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setTimerRunning(false);
    setTimeLeftSec(0);
    try {
      const res = await fetch(`${NOTES_API_BASE_URL}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: documentText.slice(0, 20000),
          type: quizType,
          count: quizCount,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const rawError =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || "Quiz generation failed";
        if (/too large|tokens per minute|TPM|rate_limit_exceeded/i.test(rawError)) {
          throw new Error(
            "Quiz request is too large for current AI limits. Try fewer questions or a shorter document section."
          );
        }
        throw new Error(rawError);
      }
      const json = await res.json();
      setQuizQuestions(Array.isArray(json.questions) ? json.questions : []);
      setQuizEvaluations({});
      if (timerEnabled) {
        const seconds = Math.max(60, timerMinutes * 60);
        setTimeLeftSec(seconds);
        setTimerRunning(true);
      }
      setActiveTab("quiz");
    } catch (err: any) {
      setQuizError(err?.message || "Unable to generate quiz.");
    } finally {
      setQuizLoading(false);
    }
  };

  const toggleAnswer = (idx: number) => {
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const normalize = (value: string) => String(value || "").trim().toLowerCase();

  const questionKind = (question: QuizQuestion) => {
    if (Array.isArray(question.options) && question.options.length > 0) return "mcq";
    const expected = normalize(question.answer || "");
    if (expected === "true" || expected === "false") return "truefalse";
    return "qa";
  };

  const formatCorrectAnswer = (question: QuizQuestion) => {
    const raw = String(question.answer || "").trim();
    if (!raw) return "N/A";
    const options = Array.isArray(question.options) ? question.options : [];
    if (!options.length) return raw;

    const normalizedRaw = normalize(raw);
    const matchedOptionIndex = options.findIndex((opt) => normalize(opt) === normalizedRaw);
    if (matchedOptionIndex >= 0) {
      return `${String.fromCharCode(65 + matchedOptionIndex)}. ${options[matchedOptionIndex]}`;
    }

    if (/^[a-z]$/i.test(raw)) {
      const letterIndex = raw.toUpperCase().charCodeAt(0) - 65;
      if (letterIndex >= 0 && letterIndex < options.length) {
        return `${String.fromCharCode(65 + letterIndex)}. ${options[letterIndex]}`;
      }
    }

    if (/^\d+$/.test(raw)) {
      // Quiz generator commonly returns 1-based option numbers for MCQ answers.
      const numericIndex = Number(raw) - 1;
      if (numericIndex >= 0 && numericIndex < options.length) {
        return `${String.fromCharCode(65 + numericIndex)}. ${options[numericIndex]}`;
      }
    }

    return raw;
  };

  const getEvaluationLabel = (evaluation?: QuizEvaluation) => {
    if (!evaluation) return "Not graded";
    if (evaluation.result === "correct") return "Correct";
    if (evaluation.result === "partially_correct") return "Partially Correct";
    return "Incorrect";
  };

  const isCorrectAnswer = (idx: number) => quizEvaluations[idx]?.result === "correct";

  const submitQuiz = async () => {
    if (!quizQuestions.length) return;

    setQuizLoading(true);
    try {
      const evaluations = await Promise.all(
        quizQuestions.map(async (question, idx) => {
          const res = await fetch(`${NOTES_API_BASE_URL}/quiz/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question,
              userAnswer: selectedAnswers[idx] || "",
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || "Failed to evaluate quiz answers.");
          }
          return res.json();
        })
      );

      const evaluationMap = evaluations.reduce<Record<number, QuizEvaluation>>((acc, evaluation, idx) => {
        acc[idx] = evaluation;
        return acc;
      }, {});
      const scoreUnits = evaluations.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
      const correct = evaluations.filter((item) => item?.result === "correct").length;

      setQuizEvaluations(evaluationMap);
      setQuizScore({
        correct: Number(scoreUnits.toFixed(1)),
        total: quizQuestions.length,
      });
      setQuizSubmitted(true);
      setTimerRunning(false);
      const revealAll: Record<number, boolean> = {};
      quizQuestions.forEach((_, idx) => {
        revealAll[idx] = true;
      });
      setRevealedAnswers(revealAll);
      setQuizError("");
      if (!correct && scoreUnits === 0) {
        setQuizError("No fully correct answers yet, but review the feedback for partial understanding.");
      }
    } catch (err: any) {
      setQuizError(err?.message || "Failed to evaluate quiz answers.");
    } finally {
      setQuizLoading(false);
    }
  };

  const resetQuizSession = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizEvaluations({});
    setRevealedAnswers({});
    setTimerRunning(false);
    setTimeLeftSec(timerEnabled ? Math.max(60, timerMinutes * 60) : 0);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const exportQuizReport = () => {
    if (!quizQuestions.length) return;
    const scoreLine = quizScore
      ? `Score: ${quizScore.correct}/${quizScore.total} (${Math.round(
          (quizScore.correct / Math.max(1, quizScore.total)) * 100
        )}%)`
      : "Score: Not submitted";

    const lines: string[] = [
      "Quiz Report",
      `Generated: ${new Date().toLocaleString()}`,
      scoreLine,
      "",
    ];

    quizQuestions.forEach((q, idx) => {
      const selected = selectedAnswers[idx] || "";
      const correct = formatCorrectAnswer(q);
      const evaluation = quizEvaluations[idx];
      const status = quizSubmitted ? getEvaluationLabel(evaluation) : "Not graded";
      lines.push(`Q${idx + 1}: ${q.question}`);
      if (Array.isArray(q.options) && q.options.length) {
        lines.push(`Options: ${q.options.join(" | ")}`);
      }
      lines.push(`Your answer: ${selected || "-"}`);
      lines.push(`Correct answer: ${correct || "-"}`);
      lines.push(`Result: ${status}`);
      if (evaluation?.score !== undefined) lines.push(`Score: ${Math.round(evaluation.score * 100)}%`);
      if (evaluation?.reason) lines.push(`Feedback: ${evaluation.reason}`);
      if (evaluation?.accepted_perspective) lines.push(`Accepted perspective: ${evaluation.accepted_perspective}`);
      if (evaluation?.missing_points?.length) {
        lines.push(`Missing points: ${evaluation.missing_points.join(" | ")}`);
      }
      if (q.explanation) lines.push(`Explanation: ${q.explanation}`);
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!timerRunning || quizSubmitted || !quizQuestions.length) return;
    const id = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, quizSubmitted, quizQuestions.length]);

  const switchSession = (nextId: string) => {
    abortControllerRef.current?.abort();
    hydratingSessionRef.current = true;
    previousSessionRef.current = "";
    navigate(`/chat/${nextId}?avatar=${avatarId}`);
    setActiveSessionId(nextId);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const createNewChat = () => {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const nextSession: ChatSession = {
      id,
      name: "New Chat",
      createdAt,
      avatarUsed: avatar.name,
      pdfFiles: [],
      messages: [],
    };
    setSessions((prev) => [nextSession, ...prev].slice(0, MAX_SESSIONS));
    setMessages([]);
    setDocuments([]);
    setUploadedFiles([]);
    switchSession(id);
  };

  const renameSession = (id: string, name: string) =>
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name: name.trim() || "New Chat" } : s)));

  const duplicateSession = (id: string) =>
    setSessions((prev) => {
      const source = prev.find((s) => s.id === id);
      if (!source) return prev;
      const clone = { ...source, id: uuidv4(), name: `${source.name} Copy`, createdAt: new Date().toISOString() };
      return [clone, ...prev].slice(0, MAX_SESSIONS);
    });

  const deleteSession = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (!next.length) {
      createNewChat();
      return;
    }
    if (id === activeSessionId) {
      switchSession(next[0].id);
    }
  };

  return (
    <div className="flex h-screen">
      <ChatHistorySidebar
        open={sidebarOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onSelectSession={switchSession}
        onNewChat={createNewChat}
        onRenameSession={renameSession}
        onDuplicateSession={duplicateSession}
        onDeleteSession={deleteSession}
        onClearAll={() => setClearModalOpen(true)}
      />
      <div className={`flex flex-col h-screen flex-1 transition-opacity duration-150 ${switching ? "opacity-0" : "opacity-100"}`}>
      <header className="flex-shrink-0">
        <Navbar />
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Avatar & Controls */}
        <div className="lg:w-1/2 h-1/2 lg:h-full bg-gradient-to-br from-primary/5 via-background to-accent/5 relative flex flex-col">
          {/* 3D Avatar */}
          <div className="flex-grow relative">
            <Canvas shadows camera={{ position: [0, 0, 0], fov: 25 }}>
              <Scenario avatarType={avatarId} />
            </Canvas>
            <Loader />
            
            {/* Speaking indicator */}
            <AnimatePresence>
              {isSpeaking && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2"
                >
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <Volume2 className="w-4 h-4 text-primary" />
                    </motion.div>
                    <span className="text-sm font-medium">Avatar is speaking...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar Info & Controls */}
          <div className="p-6 space-y-4">
            <GlassCard className="p-4">
              <h2 className="text-2xl font-bold text-foreground mb-1">{avatar.name}</h2>
              <p className="text-sm text-muted-foreground mb-3">{avatar.title}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {avatar.skills.map((skill, i) => (
                  <Badge key={i} variant="secondary">{skill}</Badge>
                ))}
              </div>
              
              {/* Controls */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={loading || notesLoading || (!recording && !micReady && Boolean(micError))}
                  variant={recording ? "destructive" : "default"}
                  className="w-full"
                >
                  {recording ? (
                    <><MicOff className="w-4 h-4 mr-2" /> Stop</>
                  ) : (
                    <><Mic className="w-4 h-4 mr-2" /> Speak</>
                  )}
                </Button>
                
                <Button
                  onClick={() => setMuted((prev: boolean) => !prev)}
                  variant="outline"
                  className="w-full"
                >
                  {muted ? (
                    <><Volume2 className="w-4 h-4 mr-2" /> Unmute</>
                  ) : (
                    <><VolumeX className="w-4 h-4 mr-2" /> Mute</>
                  )}
                </Button>
              </div>
              {micError ? (
                <div className="mt-2 text-xs text-rose-600">
                  {micError}
                </div>
              ) : null}
              
              <div className="mt-3">
                <LanguageSelector value={language} onChange={setLanguage} />
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Right Side - Chat & Notes */}
        <div className="lg:w-1/2 h-1/2 lg:h-full flex flex-col bg-muted/30">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow min-h-0 flex flex-col">
            <div className="border-b bg-background/50 backdrop-blur-sm px-6 py-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={focusModeEnabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          startFocusMode();
                        } else {
                          emergencyStopFocusMode();
                        }
                      }}
                    />
                    <span className="font-medium">Focus Mode</span>
                  </label>
                  <span className={`rounded-full bg-primary/10 px-2 py-0.5 text-primary ${focusPhase === "focus" ? "focus-mode-pulse" : ""}`}>
                    {focusPhase === "focus"
                      ? `Focus ${formatPomodoroClock(focusSecondsLeft)}`
                      : focusPhase === "break"
                        ? `Break ${formatPomodoroClock(breakSecondsLeft)}`
                        : focusPhase === "pausedByTabSwitch"
                          ? "Paused"
                          : "Idle"}
                  </span>
                  {focusWarnings > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                      Switches: {focusWarnings}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 ${extensionConnected ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {extensionConnected ? "Extension Connected" : "Extension Missing"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs bg-white/70">
                    {strictLockEnabled ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldX className="h-3.5 w-3.5 text-slate-500" />}
                    <input
                      type="checkbox"
                      checked={strictLockEnabled}
                      disabled={!extensionConnected}
                      onChange={(e) => setStrictLockEnabled(e.target.checked)}
                    />
                    Strict Lock
                  </label>
                  {focusNeedsManualRestart && focusModeEnabled && focusPhase === "idle" && (
                    <Button size="sm" variant="outline" onClick={startFocusMode}>
                      <Play className="mr-1 h-3.5 w-3.5" />
                      Start Next Focus Session
                    </Button>
                  )}
                  {focusModeEnabled && (
                    <Button size="sm" variant="destructive" onClick={emergencyStopFocusMode}>
                      <OctagonX className="mr-1 h-3.5 w-3.5" />
                      Emergency Stop
                    </Button>
                  )}
                </div>
              </div>
              {focusExtensionError && (
                <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {focusExtensionError}
                </div>
              )}
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="quiz">Quiz</TabsTrigger>
              </TabsList>
            </div>

            <div className="relative flex-1 min-h-0">
              <div
                className={`absolute inset-0 min-h-0 flex flex-col p-6 overflow-hidden ${
                  activeTab === "chat" ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
              {/* Uploaded Files */}
              <AnimatePresence>
                {uploadedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 space-y-2"
                  >
                    {uploadedFiles.map((file, i) => (
                      <FileUploadCard key={i} file={file} onRemove={() => removeFile(i)} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-grow mb-4">
                <div className="space-y-4 pr-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <p className="text-lg">Start a conversation with {avatar.name}</p>
                      <p className="text-sm mt-2">Ask any question to begin learning!</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.isUser
                              ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                              : "bg-white/90 backdrop-blur-sm text-foreground shadow-md"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          {!msg.isUser && Array.isArray(msg.referencePages) && msg.referencePages.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Reference pages: {msg.referencePages.join(", ")}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                  {(loading || notesLoading) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {uploading ? "Uploading and processing..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messageEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || notesLoading || uploading}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Input
                  ref={inputRef}
                  placeholder="Type your question..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={loading || notesLoading}
                  className="flex-grow"
                />
                <Button onClick={sendMessage} disabled={loading || notesLoading} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              </div>

              <div
                className={`absolute inset-0 min-h-0 p-6 overflow-hidden ${
                  activeTab === "notes" ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <GlassCard className="h-full min-h-0 flex flex-col p-4">
                {!currentDoc && (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Upload a PDF in chat to open it here with AI highlights.
                  </div>
                )}
                {currentDoc && !isPdf && (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    This document is parsed, but PDF preview is available only for PDF files.
                  </div>
                )}
                {isPdf && (
                  <>
                    <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{currentDoc.name}</span>
                      <span>
                        Page {currentPage} / {totalPages}
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <PDFViewer
                        fileUrl={currentDoc.fileUrl as string}
                        onDocumentLoaded={(numPages) => setTotalPages(numPages || 1)}
                        onPageChange={(page) => setCurrentPage(page)}
                      />
                    </div>
                  </>
                )}
                </GlassCard>
              </div>

              <div
                className={`absolute inset-0 min-h-0 p-6 overflow-hidden ${
                  activeTab === "quiz" ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <GlassCard className="h-full min-h-0 flex flex-col p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Quiz Type</span>
                    <select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                      disabled={quizLoading}
                    >
                      <option value="mcq">MCQ</option>
                      <option value="qa">Q&A</option>
                      <option value="truefalse">True/False</option>
                      <option value="mixed">Mixed</option>
                    </select>

                    <span className="text-sm font-medium">Count</span>
                    <input
                      type="number"
                      min={3}
                      max={25}
                      value={quizCount}
                      onChange={(e) => setQuizCount(Math.max(3, Math.min(25, Number(e.target.value) || 10)))}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
                      disabled={quizLoading}
                    />

                    <Button onClick={generateQuiz} disabled={quizLoading || !documents.length}>
                      {quizLoading ? "Generating..." : "Generate Quiz"}
                    </Button>
                    <label className="ml-2 flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={timerEnabled}
                        onChange={(e) => setTimerEnabled(e.target.checked)}
                        disabled={quizLoading}
                      />
                      Timer
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={timerMinutes}
                      onChange={(e) =>
                        setTimerMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 10)))
                      }
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
                      disabled={quizLoading || !timerEnabled}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                    {quizQuestions.length > 0 && (
                      <>
                        <Button variant="outline" onClick={submitQuiz} disabled={quizLoading}>
                          Submit Quiz
                        </Button>
                        <Button variant="outline" onClick={resetQuizSession} disabled={quizLoading}>
                          Reset Answers
                        </Button>
                        <Button variant="outline" onClick={exportQuizReport} disabled={quizLoading}>
                          Export Report
                        </Button>
                      </>
                    )}
                  </div>

                  {timerEnabled && quizQuestions.length > 0 && (
                    <div
                      className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                        timeLeftSec <= 60
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                      }`}
                    >
                      Time Left: {formatTime(timeLeftSec)}
                    </div>
                  )}

                  {quizScore && (
                    <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      Score: {quizScore.correct} / {quizScore.total} (
                      {Math.round((quizScore.correct / Math.max(1, quizScore.total)) * 100)}%)
                    </div>
                  )}

                  {quizError && (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {quizError}
                    </div>
                  )}

                  {!documents.length && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Upload a PDF first. Quiz questions are generated only from uploaded document content.
                    </div>
                  )}

                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-3 pr-3">
                      {!quizQuestions.length && !quizLoading && (
                        <div className="text-sm text-muted-foreground">
                          No quiz generated yet.
                        </div>
                      )}
                      {quizQuestions.map((q, idx) => (
                        <div key={`${q.question}-${idx}`} className="rounded-lg border border-border bg-background p-3">
                          <div className="mb-2 text-sm font-medium">
                            Q{idx + 1}. {q.question}
                          </div>
                          <div className="mb-2 flex flex-wrap gap-1">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                              {questionKind(q).toUpperCase()}
                            </span>
                            {q.page ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                Page {q.page}
                              </span>
                            ) : null}
                            {q.confidence ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                Confidence: {q.confidence}
                              </span>
                            ) : null}
                            {q.difficulty ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                Difficulty: {q.difficulty}
                              </span>
                            ) : null}
                            {q.topic ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                Topic: {q.topic}
                              </span>
                            ) : null}
                          </div>

                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {q.options.map((opt, optIdx) => (
                                <label key={`${idx}-${optIdx}`} className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-sm cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`quiz-${idx}`}
                                    value={opt}
                                    checked={selectedAnswers[idx] === opt}
                                    onChange={() =>
                                      setSelectedAnswers((prev) => ({ ...prev, [idx]: opt }))
                                    }
                                    disabled={quizSubmitted}
                                  />
                                  <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {(!Array.isArray(q.options) || q.options.length === 0) && (
                            <div className="mb-2">
                              <input
                                type="text"
                                value={selectedAnswers[idx] || ""}
                                onChange={(e) =>
                                  setSelectedAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                                }
                                disabled={quizSubmitted}
                                placeholder="Type your answer..."
                                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleAnswer(idx)}>
                              {revealedAnswers[idx] ? "Hide Answer" : "Show Answer"}
                            </Button>
                          </div>

                          {revealedAnswers[idx] && (
                            <div className="mt-2 space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Answer:</span> {formatCorrectAnswer(q)}
                              </div>
                              {quizSubmitted && (
                                <div
                                  className={`text-xs font-medium ${
                                    quizEvaluations[idx]?.result === "correct"
                                      ? "text-emerald-600"
                                      : quizEvaluations[idx]?.result === "partially_correct"
                                        ? "text-amber-600"
                                        : "text-rose-600"
                                  }`}
                                >
                                  {getEvaluationLabel(quizEvaluations[idx])}
                                </div>
                              )}
                              {quizSubmitted && quizEvaluations[idx]?.score !== undefined && (
                                <div className="text-xs text-muted-foreground">
                                  Match score: {Math.round(quizEvaluations[idx].score * 100)}%
                                </div>
                              )}
                              {quizSubmitted && quizEvaluations[idx]?.reason && (
                                <div className="text-xs text-muted-foreground">
                                  {quizEvaluations[idx].reason}
                                </div>
                              )}
                              {quizSubmitted && quizEvaluations[idx]?.accepted_perspective && (
                                <div className="text-xs text-muted-foreground">
                                  Understood: {quizEvaluations[idx].accepted_perspective}
                                </div>
                              )}
                              {quizSubmitted && quizEvaluations[idx]?.missing_points?.length ? (
                                <div className="text-xs text-muted-foreground">
                                  Missing: {quizEvaluations[idx].missing_points?.join(", ")}
                                </div>
                              ) : null}
                              {q.explanation && (
                                <div className="text-xs text-muted-foreground">
                                  {q.explanation}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </GlassCard>
              </div>
            </div>
          </Tabs>
        </div>
      </main>
      </div>
      {focusModeEnabled && focusPhase === "pausedByTabSwitch" && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="focus-blocker max-w-md rounded-xl border border-amber-300/40 bg-slate-950/95 p-5 text-slate-100 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Focus Mode Interrupted</h3>
            </div>
            <p className="mb-4 text-sm text-slate-300">
              You switched away from this tab during an active focus session. Resume to continue your Pomodoro cycle or use Emergency Stop.
            </p>
            <div className="mb-4 rounded-md bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
              Warnings in this session: <span className="font-semibold text-amber-300">{focusWarnings}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={emergencyStopFocusMode}>
                <OctagonX className="mr-1 h-4 w-4" />
                Emergency Stop
              </Button>
              <Button onClick={resumeFocusAfterTabSwitch}>
                <Play className="mr-1 h-4 w-4" />
                Resume Focus
              </Button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all saved sessions from local storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSessions([]);
                localStorage.removeItem(SESSION_KEY);
                setClearModalOpen(false);
                createNewChat();
              }}
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}