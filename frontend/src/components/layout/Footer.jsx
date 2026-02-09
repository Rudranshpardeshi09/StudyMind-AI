import { motion } from "framer-motion";
import { Github, Linkedin, Heart, Sparkles, BookOpen, Cpu, Zap } from "lucide-react";

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
  ];

  const techStack = [
    { icon: Cpu, label: "Gemini AI" },
    { icon: Zap, label: "FastAPI" },
    { icon: BookOpen, label: "RAG" },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-t border-gray-200 dark:border-neon-500/30 bg-gradient-to-r from-gray-50 via-white to-gray-100 dark:from-black dark:via-neutral-950 dark:to-black py-4 sm:py-5 px-4 sm:px-6 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Left - Brand */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-2xl"
            >
              <Sparkles className="w-6 h-6 text-blue-500 dark:text-neon-400" />
            </motion.div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-neon-400 tracking-tight">
                StudyMind AI
              </h3>
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                Your Smart Study Companion
              </p>
            </div>
          </motion.div>

          {/* Center - Tech Stack */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs text-gray-400 dark:text-neutral-500">Powered by</span>
            <div className="flex items-center gap-3">
              {techStack.map((tech, index) => (
                <motion.div
                  key={tech.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neon-500/20 cursor-default"
                >
                  <tech.icon className="w-3 h-3 text-blue-500 dark:text-neon-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-neutral-300">
                    {tech.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right - Social Links */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 dark:text-neutral-500 hidden sm:inline">
              Connect
            </span>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neon-500/20 text-gray-500 dark:text-neutral-400 ${social.hoverColor} transition-all duration-200`}
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  title={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-neon-500/10 my-3" />

        {/* Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <motion.p
            className="text-xs text-gray-500 dark:text-neutral-500"
            animate={{ opacity: [0.7, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            © {currentYear} StudyMind AI. All rights reserved.
          </motion.p>

          <motion.p
            className="text-xs text-gray-500 dark:text-neutral-500 flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
          >
            Made with
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Heart className="w-3 h-3 text-red-500 dark:text-neon-400 fill-current" />
            </motion.span>
            for students worldwide
          </motion.p>
        </div>
      </div>
    </motion.footer>
  );
}