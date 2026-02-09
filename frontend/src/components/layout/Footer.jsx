import { motion } from "framer-motion";
import { Github, Linkedin,Mail, Heart, Sparkles, Cpu, Zap, BookOpen } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      icon: Linkedin,
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/rudransh-pardeshi-666ba9266",
      hoverColor: "hover:text-blue-500 dark:hover:text-neon-400"
    },
    {
      icon: Github,
      label: "GitHub",
      href: "https://github.com/Rudranshpardeshi09",
      hoverColor: "hover:text-gray-900 dark:hover:text-neon-400"
    },
    {
      icon: Mail,
      label: "E-Mail",
      href: "https://mail.google.com/mail/u/0/#inbox?compose=new",
      hoverColor: "hover:text-gray-900 dark:hover:text-neon-400"
    },
  ];

  const techStack = [
    { icon: Cpu, label: "Gemini AI" },
    { icon: Zap, label: "FastAPI" },
    { icon: BookOpen, label: "RAG" },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-shrink-0 border-t border-gray-200 dark:border-neon-500/30 bg-gradient-to-r from-gray-50 via-white to-gray-100 dark:from-black dark:via-neutral-950 dark:to-black px-3 py-2 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto">
        {/* Single Row - All Content */}
        <div className="flex items-center justify-between gap-2 flex-wrap">

          {/* Left - Brand */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4 text-blue-500 dark:text-neon-400" />
            </motion.div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-gray-900 dark:text-neon-400">
                StudyMind AI
              </span>
              <span className="text-[10px] text-gray-400 dark:text-neutral-500 hidden sm:inline">
                • Your Smart Study Companion
              </span>
            </div>
          </div>

          {/* Center - Tech Stack (hidden on small screens) */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] text-gray-400 dark:text-neutral-500">Powered by</span>
            <div className="flex items-center gap-1.5">
              {techStack.map((tech) => (
                <motion.div
                  key={tech.label}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neon-500/20"
                >
                  <tech.icon className="w-2.5 h-2.5 text-blue-500 dark:text-neon-400" />
                  <span className="text-[10px] font-medium text-gray-600 dark:text-neutral-300">
                    {tech.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right - Social + Copyright */}
          <div className="flex items-center gap-3">
            {/* Social Links */}
            <div className="flex items-center gap-1">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-lg bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neon-500/20 text-gray-500 dark:text-neutral-400 ${social.hoverColor} transition-all duration-200`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title={social.label}
                >
                  <social.icon className="w-3 h-3" />
                </motion.a>
              ))}
            </div>

            {/* Copyright */}
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-neutral-500">
              <span className="hidden sm:inline">© {currentYear}</span>
              <span className="flex items-center gap-0.5">
                Made with
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Heart className="w-2.5 h-2.5 text-red-500 dark:text-neon-400 fill-current" />
                </motion.span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}