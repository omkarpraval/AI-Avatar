import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./ui/glass-card";
import { FileText, Download } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface NotesPanelProps {
  notes: string[];
  isTyping?: boolean;
}

export const NotesPanel = ({ notes, isTyping }: NotesPanelProps) => {
  const exportNotes = () => {
    const blob = new Blob([notes.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avatar-notes-${Date.now()}.txt`;
    a.click();
  };

  return (
    <GlassCard className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Learning Notes</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportNotes}
          disabled={notes.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <AnimatePresence>
          {notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground py-8"
            >
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Notes will appear here as the avatar teaches</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {notes.map((note, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-secondary/50 rounded-lg p-4"
                >
                  <p className="text-sm leading-relaxed">{note}</p>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-muted-foreground text-sm"
                >
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full"
                    />
                  </div>
                  <span>Adding to notes...</span>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </GlassCard>
  );
};