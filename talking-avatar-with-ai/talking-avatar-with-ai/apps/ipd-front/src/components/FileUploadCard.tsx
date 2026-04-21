import { motion } from "framer-motion";
import { FileText, X, File } from "lucide-react";
import { Button } from "./ui/button";

interface FileUploadCardProps {
  file: { name: string; size: number; type: string };
  onRemove: () => void;
}

export const FileUploadCard = ({ file, onRemove }: FileUploadCardProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = () => {
    if (file.type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
    if (file.type.includes("image")) return <File className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-border shadow-sm"
    >
      <div className="flex-shrink-0">{getFileIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="flex-shrink-0 h-8 w-8 p-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};