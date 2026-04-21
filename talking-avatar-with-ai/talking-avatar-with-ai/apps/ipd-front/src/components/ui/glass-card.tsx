import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const GlassCard = ({ className, hover = false, children, ...props }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "backdrop-blur-xl bg-white/90 rounded-2xl border border-white/20",
        "shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]",
        hover && "transition-all duration-300 hover:shadow-[0_8px_32px_0_rgba(99,102,241,0.2)] hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};