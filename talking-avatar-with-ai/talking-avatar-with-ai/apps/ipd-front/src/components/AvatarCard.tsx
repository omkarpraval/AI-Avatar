import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Scenario } from "./Scenario";
import { Badge } from "./ui/badge";
import { GlassCard } from "./ui/glass-card";
import { Info } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";

interface AvatarCardProps {
  name: string;
  avatarType: string;
  description: string;
  expertise: string[];
  chatRoute: string;
  index: number;
}

export const AvatarCard = ({ name, avatarType, description, expertise, chatRoute, index }: AvatarCardProps) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
      >
        <GlassCard hover className="overflow-hidden group">
          <div className="aspect-square bg-gradient-to-br from-primary/5 to-accent/5 relative overflow-hidden">
            <div className="w-full h-full">
              <Canvas shadows camera={{ fov: 20 }}>
                <Scenario avatarType={avatarType} />
              </Canvas>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowModal(true)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Info className="w-5 h-5 text-primary" />
            </motion.button>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-2xl font-bold text-foreground">{name}</h3>
              <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                AI Expert
              </Badge>
            </div>
            
            <p className="text-muted-foreground mb-4 text-sm">{description}</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {expertise.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
            
            <Link to={chatRoute}>
              <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                Start Learning
              </Button>
            </Link>
          </div>
        </GlassCard>
      </motion.div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">About {name}</DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="text-base">{description}</p>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Areas of Expertise:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {expertise.map((skill, i) => (
                    <li key={i} className="text-sm">{skill}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm italic">
                {name} uses advanced AI to provide personalized learning experiences and can explain complex concepts in multiple languages.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};