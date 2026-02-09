import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import UploadPDF from "@/components/upload/UploadPDF";
import ChatWindow from "@/components/chat/ChatWindow";
import StudyPanel from "@/components/study/StudyPanel";
import MobileChatDrawer from "@/components/chat/MobileChatDrawer";
import { MessageCircle } from "lucide-react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <AppLayout>
      {/* Main content container - fills available space */}
      <div className="w-full h-full p-2 sm:p-3 md:p-4 overflow-hidden">
        {/* Content wrapper with max-width constraint */}
        <motion.div
          className="w-full max-w-7xl mx-auto h-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Desktop: 3 columns | Mobile: 2 columns (no chat) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4 h-full">

            {/* LEFT PANEL - PDF Upload */}
            <motion.div
              className="col-span-1 lg:col-span-3 h-full min-h-0 overflow-hidden"
              variants={itemVariants}
            >
              <UploadPDF />
            </motion.div>

            {/* CENTER PANEL - Study Options */}
            <motion.div
              className="col-span-1 lg:col-span-3 h-full min-h-0 overflow-hidden"
              variants={itemVariants}
            >
              <StudyPanel />
            </motion.div>

            {/* RIGHT PANEL - Chat Window (Hidden on mobile/tablet) */}
            <motion.div
              className="hidden lg:block lg:col-span-6 h-full min-h-0 overflow-hidden"
              variants={itemVariants}
            >
              <ChatWindow />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Mobile/Tablet: Floating Chat Button */}
      <motion.button
        className="lg:hidden fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full 
                   bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-neon-500 dark:to-neon-600
                   text-white shadow-lg hover:shadow-xl
                   dark:shadow-neon/30 dark:hover:shadow-neon
                   flex items-center justify-center
                   transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsChatOpen(true)}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
      >
        <MessageCircle className="w-6 h-6" />
        {/* Pulse effect */}
        <span className="absolute inset-0 rounded-full bg-blue-500 dark:bg-neon-500 animate-ping opacity-25" />
      </motion.button>

      {/* Mobile Chat Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <MobileChatDrawer onClose={() => setIsChatOpen(false)} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
