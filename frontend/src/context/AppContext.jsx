import { createContext, useContext, useState, useCallback, useMemo } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [indexed, setIndexed] = useState(false);
  const [messages, setMessages] = useState([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENT UPLOAD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  // const [uploadedFiles, setUploadedFiles] = useState([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDY OPTIONS STATE (Simplified)
  // ═══════════════════════════════════════════════════════════════════════════
  const [syllabusText, setSyllabusText] = useState("");  // User-entered syllabus/topics text
  const [marks, setMarks] = useState(3);                  // Answer length (3/5/12)

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const clearSyllabus = useCallback(() => {
    setSyllabusText("");
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Document state
    indexed,
    setIndexed,
    messages,
    setMessages,
    clearMessages,
    // uploadedFiles,
    // setUploadedFiles,

    // Study options (simplified)
    syllabusText,
    setSyllabusText,
    clearSyllabus,
    marks,
    setMarks,
  }), [indexed, messages, syllabusText, marks, clearMessages, clearSyllabus]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
