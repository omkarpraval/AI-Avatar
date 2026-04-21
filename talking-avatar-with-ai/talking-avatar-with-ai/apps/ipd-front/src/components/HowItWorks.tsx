import { motion } from "framer-motion";
import { GlassCard } from "./ui/glass-card";
import { UserCircle, MessageSquare, BookOpen, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: UserCircle,
    title: "Choose Your Avatar",
    description: "Select an AI avatar expert in your subject of interest",
  },
  {
    icon: MessageSquare,
    title: "Start Conversation",
    description: "Ask questions naturally using text or voice",
  },
  {
    icon: BookOpen,
    title: "Learn & Take Notes",
    description: "Get personalized explanations with auto-generated notes",
  },
  {
    icon: TrendingUp,
    title: "Master Topics",
    description: "Track your progress and deepen understanding",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start your personalized learning journey in four simple steps
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GlassCard className="p-6 h-full relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {index + 1}
                </div>
                <div className="mb-4 mt-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};