import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navigation from "./components/layout/Navigation";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Tutorial from "./pages/Tutorial";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");

  return (
    <ThemeProvider>
      <AppProvider>
        <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-neutral-950 dark:to-black transition-colors duration-300">
          {/* Navigation - fixed height */}
          <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />

          {/* Main content - takes remaining space */}
          <main className="flex-1 min-h-0 overflow-hidden">
            {currentPage === "home" && <Home />}
            {currentPage === "tutorial" && <Tutorial />}
          </main>

          {/* Footer - fixed height */}
          <Footer />
        </div>
      </AppProvider>
    </ThemeProvider>
  );
}
