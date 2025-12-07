import React, { useState } from 'react';
import { LiveVoiceLesson } from './components/LiveVoiceLesson';
import { ChatLesson } from './components/ChatLesson';
import { TranscriptionLesson } from './components/TranscriptionLesson';
import { VeoLesson } from './components/VeoLesson';
import { getQuickDefinition } from './services/gemini';

enum LessonIndex {
  VOICE = 0,
  CHAT = 1,
  VEO = 2,
  TRANSCRIPTION = 3
}

export default function App() {
  const [currentLesson, setCurrentLesson] = useState<LessonIndex>(LessonIndex.VOICE);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickResult, setQuickResult] = useState('');
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  const lessons = [
    { title: "Voice", component: <LiveVoiceLesson /> },
    { title: "Chat", component: <ChatLesson /> },
    { title: "Video", component: <VeoLesson /> },
    { title: "Read", component: <TranscriptionLesson /> },
  ];

  const handleNext = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentLesson > 0) {
      setCurrentLesson(prev => prev - 1);
    }
  };

  const handleQuickLookup = async () => {
    if (!quickSearch.trim()) return;
    setQuickResult("Checking dictionary...");
    try {
        const def = await getQuickDefinition(quickSearch);
        setQuickResult(def || "Not found.");
    } catch {
        setQuickResult("Could not find definition.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Header */}
      <header className="w-full bg-white p-4 shadow-sm flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
            <span className="material-icons">elderly</span> ElderAI
        </h1>
        <div className="text-lg font-medium text-slate-500">
            Step {currentLesson + 1} of {lessons.length}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-3xl p-4 flex flex-col">
        {lessons[currentLesson].component}
      </main>

      {/* Bottom Navigation */}
      <footer className="w-full max-w-3xl p-4 flex gap-4">
        <button 
            onClick={handlePrev}
            disabled={currentLesson === 0}
            className={`flex-1 py-6 rounded-2xl text-xl font-bold transition-all ${
                currentLesson === 0 ? 'bg-slate-200 text-slate-400' : 'bg-white border-2 border-slate-300 text-slate-700 shadow-md hover:bg-slate-50'
            }`}
        >
            Back
        </button>
        <button 
            onClick={handleNext}
            disabled={currentLesson === lessons.length - 1}
            className={`flex-1 py-6 rounded-2xl text-xl font-bold transition-all ${
                currentLesson === lessons.length - 1 ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 transform active:scale-95'
            }`}
        >
            Next Lesson
        </button>
      </footer>

      {/* Quick Help Toggle */}
      <div className="fixed bottom-32 right-4">
          <button 
            onClick={() => setShowQuickHelp(!showQuickHelp)}
            className="w-16 h-16 bg-yellow-400 rounded-full shadow-xl flex items-center justify-center text-3xl font-bold text-yellow-900 border-4 border-white"
            aria-label="Quick Dictionary"
          >
            ?
          </button>
      </div>

      {/* Quick Help Modal (using gemini-2.5-flash-lite) */}
      {showQuickHelp && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-bounce-up">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800">Quick Dictionary</h3>
                      <button onClick={() => setShowQuickHelp(false)} className="text-slate-400 text-2xl">&times;</button>
                  </div>
                  <p className="text-slate-600 mb-4 text-lg">Confused by a word? Type it here for a simple explanation.</p>
                  <div className="flex gap-2 mb-4">
                      <input 
                        className="flex-1 border-2 border-slate-300 rounded-xl p-3 text-lg bg-slate-800 text-white font-semibold placeholder-slate-400" 
                        placeholder="e.g. Browser, Wifi..."
                        value={quickSearch}
                        onChange={e => setQuickSearch(e.target.value)}
                      />
                      <button 
                        onClick={handleQuickLookup}
                        className="bg-yellow-400 text-yellow-900 font-bold px-4 rounded-xl"
                      >
                        Ask
                      </button>
                  </div>
                  {quickResult && (
                      <div className="bg-yellow-50 p-4 rounded-xl text-lg font-medium text-slate-800 leading-relaxed border border-yellow-200">
                          {quickResult}
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}