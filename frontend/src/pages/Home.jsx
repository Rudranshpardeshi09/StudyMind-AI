import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import UploadPDF from "@/components/upload/UploadPDF";
import ChatWindow from "@/components/chat/ChatWindow";
import SyllabusUpload from "@/components/syllabus/SyllabusUpload";
import StudyControls from "@/components/study/StudyControls";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Home() {
  return (
    <AppLayout>
      {/* Main content container - centered and responsive */}
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-3 md:p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-950">
        {/* Content wrapper with max-width constraint */}
        <motion.div
          className="w-full max-w-7xl h-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Responsive grid: 1 col on mobile, 2 cols on tablet, 3 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-5 h-full auto-rows-max lg:auto-rows-auto">
            
            {/* LEFT PANEL - PDF Upload */}
            <motion.div 
              className="sm:col-span-2 lg:col-span-3 h-auto lg:h-full min-h-[300px]"
              variants={itemVariants}
            >
              <UploadPDF />
            </motion.div>

            {/* CENTER PANEL - Syllabus & Study Controls */}
            <motion.div 
              className="sm:col-span-2 lg:col-span-3 h-auto lg:h-full space-y-3 sm:space-y-4 flex flex-col min-h-[300px] lg:min-h-0"
              variants={itemVariants}
            >
              <div className="flex-shrink-0">
                <SyllabusUpload />
              </div>
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
                <StudyControls />
              </div>
            </motion.div>

            {/* RIGHT PANEL - Chat Window */}
            <motion.div 
              className="sm:col-span-2 lg:col-span-6 h-auto lg:h-full min-h-[400px] lg:min-h-0"
              variants={itemVariants}
            >
              <ChatWindow />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
