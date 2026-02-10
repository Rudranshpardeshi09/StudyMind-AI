// this file manages the global state of the app using React Context
// any component in the app can access and update these shared values
import { createContext, useContext, useState, useCallback, useMemo } from "react";

// creating the context object that will hold our shared state
const AppContext = createContext();

// this provider wraps the entire app and makes state available everywhere
export const AppProvider = ({ children }) => {
  // tracks whether PDFs have been uploaded and are ready for questions
  const [indexed, setIndexed] = useState(false);
  // stores all chat messages between the user and AI
  const [messages, setMessages] = useState([]);

  // the syllabus text that the user typed or uploaded
  const [syllabusText, setSyllabusText] = useState("");
  // the current answer length setting (3=short, 5=medium, 12=long marks)
  const [marks, setMarks] = useState(3);

  // clears the syllabus text
  const clearSyllabus = useCallback(() => {
    setSyllabusText("");
  }, []);

  // clears all chat messages to start a fresh conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // memoize the context value so components dont re-render unnecessarily
  const contextValue = useMemo(() => ({
    // whether PDFs are indexed and ready
    indexed,
    setIndexed,
    // chat messages
    messages,
    setMessages,
    clearMessages,
    // syllabus and study settings
    syllabusText,
    setSyllabusText,
    clearSyllabus,
    marks,
    setMarks,
  }), [indexed, messages, syllabusText, marks, clearMessages, clearSyllabus]);

  // wrap all children with the context provider
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// shortcut hook so components can easily access the app state
export const useApp = () => useContext(AppContext);
