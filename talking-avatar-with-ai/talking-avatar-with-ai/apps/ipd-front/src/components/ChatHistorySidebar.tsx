import { useMemo, useState } from "react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Search, Plus, MoreHorizontal, MessageSquare } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";

export type SessionPdfFile = {
  name: string;
  size: string;
  data?: string;
};

export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  highlightedPages: number[];
};

export type ChatSession = {
  id: string;
  name: string;
  createdAt: string;
  avatarUsed: string;
  pdfFiles: SessionPdfFile[];
  messages: SessionMessage[];
};

type Props = {
  open: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, name: string) => void;
  onDuplicateSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
};

const truncate = (value: string, max = 28) => (value.length > max ? `${value.slice(0, max)}...` : value);

const dateLabel = (value: string) => {
  const d = new Date(value);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return formatDistanceToNow(d, { addSuffix: true });
};

export function ChatHistorySidebar({
  open,
  sessions,
  activeSessionId,
  onToggle,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDuplicateSession,
  onDeleteSession,
  onClearAll,
}: Props) {
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const inName = session.name.toLowerCase().includes(q);
      const inPdf = session.pdfFiles.some((pdf) => pdf.name.toLowerCase().includes(q));
      return inName || inPdf;
    });
  }, [search, sessions]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 rounded-lg bg-[#1a1a2e] px-3 py-2 text-sm text-white md:top-20"
      >
        ☰
      </button>

      <div className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-250 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onToggle} />

      <aside
        className={`z-40 flex h-full w-[260px] flex-col border-r border-white/10 bg-[#0f0f1a] text-slate-100 transition-all duration-250 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0"
        } fixed left-0 top-0 lg:static`}
      >
        <div className="border-b border-white/10 p-4">
          <div className="mb-3 text-sm font-semibold">
            Avatar<span className="text-[#6366f1]">Ask</span>
          </div>
          <Button onClick={onNewChat} className="w-full bg-[#6366f1] hover:bg-[#5658dd]">
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 avatarask-scrollbar">
          {filtered.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <ContextMenu key={session.id}>
                <ContextMenuTrigger>
                  <div
                    onClick={() => onSelectSession(session.id)}
                    className={`group mb-1 rounded-md px-3 py-2 transition-colors ${
                      active ? "border-l-[3px] border-[#6366f1] bg-[rgba(99,102,241,0.2)]" : "hover:bg-[rgba(99,102,241,0.1)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {renamingId === session.id ? (
                        <input
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onRenameSession(session.id, draftName || "New Chat");
                              setRenamingId(null);
                            }
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() => {
                            onRenameSession(session.id, draftName || "New Chat");
                            setRenamingId(null);
                          }}
                          className="w-full rounded bg-black/20 px-1 text-sm outline-none"
                        />
                      ) : (
                        <div className="text-sm font-medium">{truncate(session.name)}</div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="opacity-0 transition-opacity group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => { setRenamingId(session.id); setDraftName(session.name); }}>Rename</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteSession(session.id)} className="text-red-500">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                      <span className="rounded bg-white/10 px-1.5 py-0.5">{session.avatarUsed}</span>
                      <span>{dateLabel(session.createdAt)}</span>
                      {session.pdfFiles.length > 1 && <span>{session.pdfFiles.length} PDFs</span>}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => { setRenamingId(session.id); setDraftName(session.name); }}>Rename</ContextMenuItem>
                  <ContextMenuItem onClick={() => onDuplicateSession(session.id)}>Duplicate</ContextMenuItem>
                  <ContextMenuItem onClick={() => onDeleteSession(session.id)} className="text-red-500">Delete</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          {!filtered.length && (
            <div className="px-3 py-10 text-center text-xs text-slate-400">
              <MessageSquare className="mx-auto mb-2 h-4 w-4" />
              No chats found.
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="border-white/10 bg-white/5 pl-8 text-slate-100 placeholder:text-slate-400"
            />
          </div>
          <Button variant="outline" onClick={onClearAll} className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10">
            Clear All History
          </Button>
        </div>
      </aside>
    </>
  );
}
