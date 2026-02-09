import { motion } from "framer-motion";
import { X } from "lucide-react";
import ChatWindow from "./ChatWindow";

export default function MobileChatDrawer({ onClose }) {
    return (
        <motion.div
            className="fixed inset-0 z-[100] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white dark:bg-neutral-950 
                   rounded-t-3xl shadow-2xl dark:shadow-neon/20 overflow-hidden
                   border-t border-gray-200 dark:border-neon-500/30"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
                {/* Drag Handle */}
                <div className="flex justify-center py-2">
                    <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-neutral-600" />
                </div>

                {/* Close Button */}
                <motion.button
                    className="absolute top-3 right-3 p-2 rounded-full 
                     bg-gray-100 dark:bg-neutral-800 
                     text-gray-600 dark:text-neutral-300
                     hover:bg-gray-200 dark:hover:bg-neutral-700
                     transition-colors z-10"
                    onClick={onClose}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <X className="w-5 h-5" />
                </motion.button>

                {/* Chat Content */}
                <div className="h-[calc(100%-40px)] overflow-hidden">
                    <ChatWindow />
                </div>
            </motion.div>
        </motion.div>
    );
}
