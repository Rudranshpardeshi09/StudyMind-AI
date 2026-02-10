// this is the main study tool page with 3 panels: upload, study settings, and chat
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import UploadPDF from "@/components/upload/UploadPDF";
import ChatWindow from "@/components/chat/ChatWindow";
import StudyPanel from "@/components/study/StudyPanel";
import MobileChatDrawer from "@/components/chat/MobileChatDrawer";
import { MessageCircle } from "lucide-react";

// animation settings for the container - children appear one by one
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // each child appears 0.1s after the previous one
      delayChildren: 0.1,
    },
  },
};

// animation settings for each panel - slides up and fades in
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function Home() {
  // tracks whether the mobile chat drawer is open or closed
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <AppLayout>
      {/* main container fills all available space */}
      <div className="w-full h-full p-2 sm:p-3 md:p-4 overflow-hidden">
        {/* center content with max width */}
        <motion.div
          className="w-full max-w-7xl mx-auto h-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* responsive grid: 1 col on phone, 2 on tablet, 3 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4 h-full">

            {/* left panel - where users upload their PDF files */}
            <motion.div
              className="col-span-1 lg:col-span-3 h-full min-h-0 overflow-hidden"
              variants={itemVariants}
            >
              <UploadPDF />
            </motion.div>

            {/* center panel - study settings like marks and syllabus */}
            <motion.div
              className="col-span-1 lg:col-span-3 h-full min-h-0 overflow-hidden"
              variants={itemVariants}
            >
              <StudyPanel />
            </motion.div>

            {/* right panel - chat window (only visible on desktop, hidden on mobile) */}
            <motion.div
              className="hidden lg:block lg:col-span-6 h-full min-h-0 overflow-hidden"
              variants={itemVariants}
            >
              <ChatWindow />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* floating chat button that appears on mobile and tablet */}
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
        {/* pulsing ring effect to draw attention */}
        <span className="absolute inset-0 rounded-full bg-blue-500 dark:bg-neon-500 animate-ping opacity-25" />
      </motion.button>

      {/* slide-up chat drawer for mobile users */}
      <AnimatePresence>
        {isChatOpen && (
          <MobileChatDrawer onClose={() => setIsChatOpen(false)} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
