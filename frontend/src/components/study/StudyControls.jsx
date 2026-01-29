// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useApp } from "@/context/AppContext";

// export default function StudyControls({ syllabus }) {
//     const {
//         unit,
//         setUnit,
//         topic,
//         setTopic,
//         marks,
//         setMarks,
//     } = useApp();

//     if (!Object.keys(syllabus).length) {
//     return (
//       <p className="text-sm text-muted-foreground">
//         Upload syllabus to enable unit & topic selection
//       </p>
//     );
//   }
//     return (
//         <div className="grid grid-cols-3 gap-4">
//             <select value={unit} onChange={(e) => setUnit(e.target.value)}>
//                 <option value="">Select Unit</option>
//                 {Object.keys(syllabus).map((u) => (
//                     <option key={u} value={u}>{u}</option>
//                 ))}
//             </select>

//             <select value={topic} onChange={(e) => setTopic(e.target.value)}>
//                 <option value="">Select Topic</option>
//                 {syllabus[unit]?.map((t) => (
//                     <option key={t} value={t}>{t}</option>
//                 ))}
//             </select>

//             <select value={marks} onChange={(e) => setMarks(Number(e.target.value))}>
//                 <option value={3}>3 Marks</option>
//                 <option value={5}>5 Marks</option>
//                 <option value={12}>12 Marks</option>
//             </select>
//         </div>
//     );
// }

import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.2 } },
};

const infoVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export default function StudyControls() {
  const {
    subject,
    syllabusData,
    unit,
    setUnit,
    topic,
    setTopic,
    marks,
    setMarks,
  } = useApp();

  const units = syllabusData?.units || [];
  const selectedUnitData = units.find((u) => u.name === unit);
  const topics = selectedUnitData?.topics || [];

  // Reset topic when unit changes
  const handleUnitChange = (newUnit) => {
    setUnit(newUnit);
    setTopic("");
  };

  if (!syllabusData || units.length === 0) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              📚 Upload syllabus to enable unit & topic selection
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const marksConfig = {
    3: { label: "3 Marks (Short)", color: "from-blue-600 to-blue-700", icon: "📝" },
    5: { label: "5 Marks (Medium)", color: "from-indigo-600 to-indigo-700", icon: "📄" },
    12: { label: "12 Marks (Long)", color: "from-purple-600 to-purple-700", icon: "📚" },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full flex flex-col"
    >
      {/* <Card className="flex-1 shadow-lg border-0 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 hover:shadow-xl transition-shadow flex flex-col"> */}
      <Card className="flex-1 shadow-lg border-0 bg-gradient-to-br from-white to-orange-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-950 dark:to-black dark:border dark:border-emerald-500/30 dark:shadow-2xl dark:shadow-emerald-500/10 hover:shadow-xl transition-all duration-300 dark:hover:border-emerald-500/50 dark:hover:shadow-emerald-500/20 flex flex-col overflow-hidden">

        <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 dark:from-emerald-600 dark:to-emerald-700 text-white rounded-t-lg p-3 sm:p-4 flex-shrink-0">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2">
            <span className="text-xl sm:text-2xl">🎯</span>
            <span>Study Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-5 flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="h-full w-full scrollbar-thin pr-2">  
          {/* SUBJECT DISPLAY */}
          {subject && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="space-y-2"
              >
                <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                  📌 Subject
                </label>
                <div className="px-3 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 border-2 border-orange-400 dark:border-orange-600 text-orange-900 dark:text-orange-300 font-semibold text-xs break-words">
                  {subject}
                </div>
              </motion.div>
            )}

            {/* UNIT SELECTION */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                📖 Select Unit
              </label>
              <Select value={unit} onValueChange={handleUnitChange}>
                <SelectTrigger className="text-xs sm:text-sm border-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
                  <SelectValue placeholder="Choose a unit..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-white">
                  {units.map((u) => (
                    <SelectItem key={u.name} value={u.name} className="text-xs sm:text-sm">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* TOPIC SELECTION */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                🔖 Select Topic
              </label>
              <Select
                value={topic}
                onValueChange={setTopic}
                disabled={!unit || topics.length === 0}
              >
                <SelectTrigger className={`text-xs sm:text-sm border-2 focus:ring-2 ${!unit || topics.length === 0
                    ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 opacity-50"
                    : "border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-slate-700 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:text-white"
                  }`}>
                  <SelectValue placeholder="Select a topic..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-white">
                  {topics.map((t, i) => (
                    <SelectItem key={i} value={t} className="text-xs sm:text-sm">
                      {t.substring(0, 40)}
                      {t.length > 40 ? "..." : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* MARKS SELECTION */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                ⏱️ Answer Length
              </label>
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {[3, 5, 12].map((m) => (
                  <motion.button
                    key={m}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMarks(m)}
                    className={`py-2 px-1 sm:px-2 rounded-lg font-semibold text-xs transition-all ${marks === m
                        ? `bg-gradient-to-r ${marksConfig[m].color} text-white shadow-lg dark:shadow-lg`
                        : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                  >
                    <span className="hidden sm:inline">{marksConfig[m].icon} </span>{m}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* INFO BOX */}
            <AnimatePresence>
              {selectedUnitData && (
                <motion.div
                  variants={infoVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex-1 flex items-end"
                >
                  <div className="w-full bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-amber-950 dark:to-yellow-900 border-2 border-yellow-300 dark:border-yellow-600 p-2 sm:p-3 rounded-lg space-y-1">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      📊 Unit Information
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <strong>{unit}</strong> • {topics.length} topics
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Format: <strong className="capitalize">{selectedUnitData.format}</strong>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </ScrollArea>
          </CardContent>
      </Card>
    </motion.div>
  );
}
