import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, Sparkles, Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Navigation({ currentPage, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Study Tool", icon: BookOpen },
    { id: "tutorial", label: "Tutorial", icon: GraduationCap },
  ];

  const handleNavClick = (pageId) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 border-b border-blue-200/50 dark:border-neon-500/30 
                 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/50 dark:from-black dark:via-neutral-950 dark:to-black 
                 shadow-lg dark:shadow-2xl dark:shadow-neon/20 backdrop-blur-xl transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-18">
          {/* Logo/Title */}
          <motion.div
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-neon-500 dark:to-neon-600"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="font-bold text-base sm:text-lg md:text-xl text-gray-900 dark:text-neon-400 
                           leading-tight tracking-tight">
                StudyMind AI
              </h1>
              <p className="text-xs text-gray-500 dark:text-neon-300/70 leading-tight hidden sm:block">
                Smart Study Assistant
              </p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 flex-1 justify-center mx-8">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2
                  ${currentPage === item.id
                    ? "text-blue-600 dark:text-neon-400 bg-blue-500/10 dark:bg-neon-500/20"
                    : "text-gray-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-neon-400 hover:bg-blue-50 dark:hover:bg-neutral-800"
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {currentPage === item.id && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-neon-400 dark:to-neon-500 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 40 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>

          {/* Right Side - Theme Toggle & Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 dark:text-neutral-300 
                       hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 dark:border-neon-500/20 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-lg"
            >
              <nav className="flex flex-col py-2 gap-1 px-2">
                {navItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-3
                      ${currentPage === item.id
                        ? "text-blue-600 dark:text-neon-400 bg-blue-500/10 dark:bg-neon-500/20"
                        : "text-gray-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-neon-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
                      }`}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </motion.button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
