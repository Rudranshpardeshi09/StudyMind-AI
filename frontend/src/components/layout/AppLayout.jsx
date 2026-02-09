import { motion } from "framer-motion";

export default function AppLayout({ children }) {
  return (
    <div className="w-full h-full overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 
                    dark:from-black dark:via-neutral-950 dark:to-black transition-colors duration-300">
      <main className="w-full h-full">{children}</main>
    </div>
  );
}
