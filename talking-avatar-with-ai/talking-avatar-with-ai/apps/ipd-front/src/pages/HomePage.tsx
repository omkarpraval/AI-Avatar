import Navbar from "../components/Navbar";
import { Footer } from "../components/Footer";
import { HeroSection } from "../components/HeroSection";
import { HowItWorks } from "../components/HowItWorks";
import { AvatarCard } from "../components/AvatarCard";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

const avatars = [
  {
    name: "Maitri",
    avatarType: "maitri",
    description: "Science advisor with expertise in emerging technologies and research",
    expertise: ["Physics", "Chemistry", "Biology", "Technology"],
    chatRoute: "/chat/maitri",
  },
  {
    name: "Harsh",
    avatarType: "harsh",
    description: "Mathematics and computer science expert for technical learning",
    expertise: ["Mathematics", "Programming", "Algorithms", "Data Science"],
    chatRoute: "/chat/harsh",
  },
  {
    name: "Omkar",
    avatarType: "omkar",
    description: "History and humanities specialist with cultural insights",
    expertise: ["History", "Literature", "Philosophy", "Arts"],
    chatRoute: "/chat/omkar",
  },
];

export default function HomePage() {
  const chatRouteFor = (avatarType: string) => `/chat/${uuidv4()}?avatar=${avatarType}`;
  const avatarsWithRoute = avatars.map((avatar) => ({
    ...avatar,
    chatRoute: chatRouteFor(avatar.avatarType),
  }));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header>
        <Navbar />
      </header>

      <main className="flex-grow">
        <HeroSection />
        <HowItWorks />

        {/* Avatar Selection Section */}
        <section id="avatars" className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto max-w-[70rem]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Meet Your AI Teachers
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose from our specialized avatars, each expert in their field
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {avatarsWithRoute.map((avatar, index) => (
                <AvatarCard key={avatar.name} {...avatar} index={index} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}