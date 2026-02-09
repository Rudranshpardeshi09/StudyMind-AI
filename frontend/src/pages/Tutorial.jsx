import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown, FileUp, Brain, MessageSquare, BookOpen,
  Moon, Sun, Sparkles, Zap, FileText, Search, History,
  CheckCircle, ArrowRight, Layers, Target, Clock, Shield
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// Feature cards data
const features = [
  {
    icon: FileUp,
    title: "Multi-PDF Upload",
    description: "Upload multiple PDF documents up to 50MB each. The system processes and indexes them for intelligent search.",
    color: "from-blue-500 to-blue-600",
    darkColor: "dark:from-neon-500 dark:to-neon-600"
  },
  {
    icon: Brain,
    title: "AI-Powered RAG",
    description: "Uses Retrieval-Augmented Generation with Google Gemini to provide accurate, context-aware answers from your documents.",
    color: "from-purple-500 to-purple-600",
    darkColor: "dark:from-neon-400 dark:to-neon-500"
  },
  {
    icon: History,
    title: "Chat Memory",
    description: "Remembers conversation context for follow-up questions. Ask 'explain more' or 'give examples' naturally.",
    color: "from-green-500 to-green-600",
    darkColor: "dark:from-neon-500 dark:to-neon-600"
  },
  {
    icon: BookOpen,
    title: "Syllabus Context",
    description: "Upload or paste your syllabus for focused answers aligned with your course structure and topics.",
    color: "from-orange-500 to-orange-600",
    darkColor: "dark:from-neon-400 dark:to-neon-500"
  },
  {
    icon: Target,
    title: "Answer Length",
    description: "Choose between 3, 5, or 12 marks mode. Get short summaries or detailed explanations as needed.",
    color: "from-pink-500 to-pink-600",
    darkColor: "dark:from-neon-500 dark:to-neon-600"
  },
  {
    icon: Search,
    title: "Source Attribution",
    description: "Every answer includes clickable sources showing exactly where the information came from in your PDFs.",
    color: "from-cyan-500 to-cyan-600",
    darkColor: "dark:from-neon-400 dark:to-neon-500"
  },
  {
    icon: Moon,
    title: "Dark/Light Mode",
    description: "Beautiful theme switching with neon green accents in dark mode. Easy on the eyes for late-night studying.",
    color: "from-slate-500 to-slate-600",
    darkColor: "dark:from-neon-500 dark:to-neon-600"
  },
  {
    icon: Layers,
    title: "Multi-Document Search",
    description: "Search across all uploaded PDFs simultaneously. Great for combining notes from multiple sources.",
    color: "from-indigo-500 to-indigo-600",
    darkColor: "dark:from-neon-400 dark:to-neon-500"
  },
];

// How-to steps
const howToSteps = [
  {
    step: 1,
    title: "Upload Your Study Materials",
    description: "Click 'Upload PDF' and select your study documents. You can upload lecture notes, textbooks, or any PDF up to 50MB.",
    icon: FileUp,
    tips: ["Wait for processing to complete (green checkmark)", "Upload multiple PDFs for comprehensive coverage"]
  },
  {
    step: 2,
    title: "Configure Study Settings",
    description: "Enable context mode in the Study Panel to add your syllabus. Select answer length based on exam format.",
    icon: Target,
    tips: ["3 Marks = ~100 words (quick facts)", "5 Marks = ~250 words (explained)", "12 Marks = ~500 words (detailed)"]
  },
  {
    step: 3,
    title: "Ask Questions",
    description: "Type any question about your study material. The AI searches your documents and generates a comprehensive answer.",
    icon: MessageSquare,
    tips: ["Be specific for better answers", "Try 'explain', 'compare', 'list', or 'summarize'"]
  },
  {
    step: 4,
    title: "Follow Up Naturally",
    description: "Ask follow-up questions like 'explain more', 'give an example', or 'what about...' - the AI remembers context!",
    icon: History,
    tips: ["Last 15 messages are remembered", "Start fresh by clearing chat if needed"]
  },
];

// FAQ data
const faqs = [
  {
    question: "What file types are supported?",
    answer: "Currently PDF files up to 50MB. We extract text using OCR for scanned documents too."
  },
  {
    question: "How accurate are the answers?",
    answer: "Answers are generated from YOUR documents using RAG technology. The AI cites sources so you can verify information."
  },
  {
    question: "Does it work offline?",
    answer: "No, an internet connection is required to use the Gemini AI backend for answer generation."
  },
  {
    question: "Can I use it for exams?",
    answer: "It's designed for study and practice. Use the marks system to practice exam-length answers!"
  },
];

// Feature Card component
function FeatureCard({ feature, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card className="h-full border-0 bg-white dark:bg-neutral-900 shadow-lg dark:shadow-neon/10 hover:shadow-xl dark:hover:shadow-neon/20 transition-all duration-300 overflow-hidden group">
        <CardContent className="p-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} ${feature.darkColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
            <feature.icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1.5">
            {feature.title}
          </h3>
          <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
            {feature.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Step Card component
function StepCard({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative"
    >
      <Card className="border-0 bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-950 shadow-lg dark:shadow-neon/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Step number */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-neon-500 dark:to-neon-600 flex items-center justify-center text-white font-bold text-sm shadow-lg dark:shadow-neon/30">
              {step.step}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <step.icon className="w-4 h-4 text-blue-600 dark:text-neon-400" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  {step.title}
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-neutral-400 mb-2">
                {step.description}
              </p>
              <div className="space-y-1">
                {step.tips.map((tip, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-neutral-500">
                    <CheckCircle className="w-3 h-3 text-green-500 dark:text-neon-400 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection line */}
      {index < howToSteps.length - 1 && (
        <div className="hidden sm:flex justify-center my-2">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: 24 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="w-0.5 bg-gradient-to-b from-blue-400 to-indigo-400 dark:from-neon-500 dark:to-neon-600 rounded-full"
          />
        </div>
      )}
    </motion.div>
  );
}

// FAQ Item component
function FAQItem({ faq, index }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neon-500/20 overflow-hidden cursor-pointer hover:border-blue-400 dark:hover:border-neon-500/50 transition-colors duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between p-3">
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {faq.question}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-neon-400" />
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200 dark:border-neon-500/20"
            >
              <p className="p-3 text-[11px] text-gray-600 dark:text-neutral-400">
                {faq.answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function Tutorial() {
  return (
    <div className="w-full h-full overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 
                        dark:from-black dark:via-neutral-950 dark:to-black min-h-full">
          <motion.div
            className="max-w-5xl mx-auto w-full space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Hero Section */}
            <motion.div
              className="text-center py-6"
              variants={itemVariants}
            >
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-neon-500 dark:to-neon-600 mb-4 shadow-lg dark:shadow-neon/30"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-400 dark:to-neon-500">StudyMind AI</span>
              </h1>
              <p className="text-sm text-gray-600 dark:text-neutral-400 max-w-xl mx-auto">
                Your AI-powered study companion. Upload PDFs, ask questions, and get intelligent answers with source citations.
              </p>
            </motion.div>

            {/* Features Grid */}
            <motion.section variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600 dark:text-neon-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Features</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {features.map((feature, index) => (
                  <FeatureCard key={index} feature={feature} index={index} />
                ))}
              </div>
            </motion.section>

            {/* How to Use */}
            <motion.section variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-neon-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">How to Use</h2>
              </div>
              <div className="space-y-2">
                {howToSteps.map((step, index) => (
                  <StepCard key={index} step={step} index={index} />
                ))}
              </div>
            </motion.section>

            {/* FAQ Section */}
            <motion.section variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-neon-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">FAQ</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {faqs.map((faq, index) => (
                  <FAQItem key={index} faq={faq} index={index} />
                ))}
              </div>
            </motion.section>

            {/* CTA */}
            <motion.div
              className="text-center py-6"
              variants={itemVariants}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-500 dark:to-neon-600 text-white font-semibold text-sm shadow-lg dark:shadow-neon/30 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Studying Now
                <ArrowRight className="w-4 h-4" />
              </motion.div>
              <p className="text-[10px] text-gray-500 dark:text-neutral-500 mt-2">
                Go back to Study Tool to begin
              </p>
            </motion.div>

          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
