import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronRight, BookOpen, FileText, HelpCircle, Eye, EyeOff, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface Chapter {
  id: string;
  title: string;
  explanation: string;
  mostProbableQuestions: { question: string; answer: string }[];
  practiceQuestions?: {
    type: "multiple-choice";
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  youtubeVideos?: { title: string; url: string; thumbnail?: string | null; timestamp?: number }[];
  youtubeQueries?: { query: string; timestamp: number }[];
}

interface ChapterBreakdownProps {
  syllabusContent?: string;
  chapters?: Chapter[];
  chatId?: string;
  chatTitle?: string;
}

// Helper to render **bold** text as <strong>
function renderWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// Helper to format seconds as m:ss
function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  // ...add more as needed
];

const ChapterBreakdown: React.FC<ChapterBreakdownProps> = ({ syllabusContent, chapters: chaptersProp, chatId, chatTitle }) => {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>(chaptersProp || []);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Quiz state
  const [quizMode, setQuizMode] = useState<{ [key: string]: boolean }>({});
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: { [questionIndex: number]: string } }>({});
  const [showQuizResults, setShowQuizResults] = useState<{ [key: string]: boolean }>({});
  const [quizScores, setQuizScores] = useState<{ [key: string]: { correct: number; total: number } }>({});

  const [quizLoading, setQuizLoading] = useState<{ [key: string]: boolean }>({});

  const [selectionInfo, setSelectionInfo] = useState<{ text: string; x: number; y: number; chapterId: string } | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const explanationRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translatedChapters, setTranslatedChapters] = useState<{ [lang: string]: Chapter[] }>({});

  const [isPaused, setIsPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // If chaptersProp changes, update chapters state
  useEffect(() => {
    console.log('ChapterBreakdown received chaptersProp:', chaptersProp)
    if (chaptersProp) {
      setChapters(chaptersProp);
      // Initialize showAnswers state for each chapter
      const initialShowAnswers: { [key: string]: boolean[] } = {};
      chaptersProp.forEach((chapter: Chapter) => {
        initialShowAnswers[chapter.id] = Array(chapter.mostProbableQuestions.length).fill(false);
      });
      setShowAnswers(initialShowAnswers);
      setLoading(false);
      setError("");
    }
  }, [chaptersProp]);

  // If no chaptersProp, generate from syllabusContent
  useEffect(() => {
    if (!chaptersProp && syllabusContent) {
      generateChapters();
    }
    // eslint-disable-next-line
  }, [syllabusContent]);

  const generateChapters = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate-knowledge-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusContent }),
      });
      const data = await response.json();
      if (data.chapters) {
        setChapters(data.chapters);
        // Initialize showAnswers state for each chapter
        const initialShowAnswers: { [key: string]: boolean[] } = {};
        data.chapters.forEach((chapter: Chapter) => {
          initialShowAnswers[chapter.id] = Array(chapter.mostProbableQuestions.length).fill(false);
        });
        setShowAnswers(initialShowAnswers);
      } else {
        const basicChapters = createBasicChapters(syllabusContent || "");
        setChapters(basicChapters);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate chapters.");
      const basicChapters = createBasicChapters(syllabusContent || "");
      setChapters(basicChapters);
    } finally {
      setLoading(false);
    }
  };

  function createBasicChapters(content: string): Chapter[] {
    const paragraphs = content.split('\n\n').filter((p: string) => p.trim().length > 50);
    const chapters: Chapter[] = [];
    
    paragraphs.forEach((paragraph: string, index: number) => {
      const lines = paragraph.split('\n');
      const title = lines[0].replace(/^[0-9]+\.?\s*/, '').trim() || `Chapter ${index + 1}`;
      chapters.push({
        id: `chapter-${index + 1}`,
        title,
        explanation: paragraph,
        mostProbableQuestions: [
          { question: "What is the main concept of this chapter?", answer: "The main concept is ..." },
          { question: "Explain a key example from this chapter.", answer: "A key example is ..." },
          { question: "List important points to remember from this chapter.", answer: "Important points are ..." }
        ],
        practiceQuestions: [
          {
            type: "multiple-choice",
            question: "What is the main topic of this chapter?",
            options: ["Topic A", "Topic B", "Topic C", "Topic D"],
            correctAnswer: "Topic A",
            explanation: "This chapter primarily focuses on **Topic A** as the main concept."
          },
          {
            type: "multiple-choice",
            question: "Which concept is most important in this chapter?",
            options: ["Concept X", "Concept Y", "Concept Z", "Concept W"],
            correctAnswer: "Concept X",
            explanation: "**Concept X** is the foundational concept that this chapter builds upon."
          },
          {
            type: "multiple-choice",
            question: "What is the key takeaway from this chapter?",
            options: ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4"],
            correctAnswer: "Takeaway 1",
            explanation: "**Takeaway 1** represents the most important learning outcome from this chapter."
          }
        ],
        youtubeQueries: [{ query: "example search query", timestamp: 0 }],
        youtubeVideos: []
      });
    });

    return chapters.slice(0, 10);
  }

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleToggleAnswer = (chapterId: string, idx: number) => {
    setShowAnswers((prev) => {
      const updated = { ...prev };
      updated[chapterId] = [...(updated[chapterId] || [])];
      updated[chapterId][idx] = !updated[chapterId][idx];
      return updated;
    });
  };

  // Quiz functions
  const startQuiz = (chapterId: string) => {
    setQuizMode(prev => ({ ...prev, [chapterId]: true }));
    setShowQuizResults(prev => ({ ...prev, [chapterId]: false }));
    setUserAnswers(prev => ({ ...prev, [chapterId]: {} }));
  };

  const submitQuiz = (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter?.practiceQuestions) return;

    const answers = userAnswers[chapterId] || {};
    let correct = 0;
    const total = chapter.practiceQuestions.length;

    chapter.practiceQuestions.forEach((question, index) => {
      const userAnswer = answers[index] || "";
      if (userAnswer === question.correctAnswer) {
        correct++;
      }
    });

    setQuizScores(prev => ({ ...prev, [chapterId]: { correct, total } }));
    setShowQuizResults(prev => ({ ...prev, [chapterId]: true }));
  };

  const resetQuiz = (chapterId: string) => {
    setQuizMode(prev => ({ ...prev, [chapterId]: false }));
    setShowQuizResults(prev => ({ ...prev, [chapterId]: false }));
    setUserAnswers(prev => ({ ...prev, [chapterId]: {} }));
    setQuizScores(prev => ({ ...prev, [chapterId]: { correct: 0, total: 0 } }));
  };

  const handleAnswerChange = (chapterId: string, questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [chapterId]: {
        ...(prev[chapterId] || {}),
        [questionIndex]: answer
      }
    }));
  };

  const regenerateQuiz = useCallback(async (chapter: Chapter) => {
    setQuizLoading((prev) => ({ ...prev, [chapter.id]: true }));
    try {
      const response = await fetch("/api/generate-knowledge-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusContent, numQuestions: 5 }),
      });
      const data = await response.json();
      // Find the updated chapter by id
      const updated = data.chapters?.find((c: Chapter) => c.id === chapter.id || c.title === chapter.title);
      if (updated) {
        setChapters((prev) => prev.map((c) => (c.id === chapter.id || c.title === chapter.title ? { ...c, practiceQuestions: updated.practiceQuestions } : c)));
        // Reset quiz state for this chapter
        setQuizMode((prev) => ({ ...prev, [chapter.id]: false }));
        setShowQuizResults((prev) => ({ ...prev, [chapter.id]: false }));
        setUserAnswers((prev) => ({ ...prev, [chapter.id]: {} }));
        setQuizScores((prev) => ({ ...prev, [chapter.id]: { correct: 0, total: 0 } }));
      }
    } catch (err) {
      alert("Failed to generate quiz questions. Please try again.");
    } finally {
      setQuizLoading((prev) => ({ ...prev, [chapter.id]: false }));
    }
  }, [syllabusContent]);

  // Handler for text selection in explanation
  const handleMouseUp = (chapterId: string) => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const explanationElement = explanationRefs.current[chapterId];
      
      if (explanationElement) {
        const elementRect = explanationElement.getBoundingClientRect();
      setSelectionInfo({
        text: sel.toString(),
          x: rect.right - elementRect.left,
          y: rect.bottom - elementRect.top,
        chapterId,
      });
      setNoteText(sel.toString());
        setNoteTitle(`Note from ${chapters.find(c => c.id === chapterId)?.title || 'Chapter'}`);
      }
    } else {
      setSelectionInfo(null);
    }
  };

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectionInfo) {
        const target = event.target as Element;
        const explanationElement = explanationRefs.current[selectionInfo.chapterId];
        if (explanationElement && !explanationElement.contains(target)) {
          setSelectionInfo(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectionInfo]);

  // Handler for clicking 'Add' button
  const handleAddNoteClick = () => {
    setShowAddNoteModal(true);
    // Don't clear selectionInfo here, we need it for saving the note
  };

  // Handler for closing modal
  const handleCloseModal = () => {
    setShowAddNoteModal(false);
    setNoteText("");
    setNoteTitle("");
    setSelectionInfo(null); // Clear selection info when closing modal
  };

  // Handler for confirming add note
  const handleConfirmAddNote = async () => {
    if (!user || !noteText.trim() || !noteTitle.trim() || !chatId || !selectionInfo) {
      alert("Please provide a title and content for your note.");
      return;
    }

    setSavingNote(true);
    try {
      // Debug Firebase connectivity
      console.log("Firebase config check:", {
        db: !!db,
        user: !!user,
        userUid: user?.uid,
        chatId: chatId,
        selectionInfo: selectionInfo
      });

      const chapter = chapters.find(c => c.id === selectionInfo.chapterId);
      console.log("Saving note with data:", {
        userId: user.uid,
        title: noteTitle.trim(),
        content: noteText.trim(),
        chatId: chatId,
        chatTitle: chatTitle || "Untitled Chat",
        chapterId: selectionInfo.chapterId,
        chapterTitle: chapter?.title || "",
      });
      
      const noteData = {
        userId: user.uid,
        title: noteTitle.trim(),
        content: noteText.trim(),
        chatId: chatId,
        chatTitle: chatTitle || "Untitled Chat",
          chapterId: selectionInfo.chapterId,
        chapterTitle: chapter?.title || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log("Attempting to save note to Firebase...");
      const docRef = await addDoc(collection(db, "notes"), noteData);
      console.log("Note saved successfully with ID:", docRef.id);

    setShowAddNoteModal(false);
    setNoteText("");
      setNoteTitle("");
      setSelectionInfo(null);
      
      // Show success message with link to notes
      if (confirm("Note saved successfully! Would you like to view all your notes?")) {
        window.open('/notes', '_blank');
      }
    } catch (err: any) {
      console.error("Failed to save note:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setSavingNote(false);
    }
  };

  // Translation logic
  const translate = async (text: string, type: string, targetLang: string) => {
    if (!text) return "";
    let prompt = "";
    if (type === "title") prompt = `Translate this heading to ${targetLang}: ${text}`;
    else if (type === "explanation") prompt = `Translate this explanation to ${targetLang}: ${text}`;
    else if (type === "question") prompt = `Translate this question to ${targetLang}: ${text}`;
    else if (type === "answer") prompt = `Translate this answer to ${targetLang}: ${text}`;
    else prompt = `Translate the following text to ${targetLang}: ${text}`;
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang, prompt }),
    });
    const data = await res.json();
    // Take only the first line if Gemini returns extra text
    return (data.translatedText || text).split('\n')[0];
  };

  const translateChapter = async (chapter: Chapter, targetLang: string): Promise<Chapter> => {
    return {
      ...chapter,
      title: await translate(chapter.title, "title", targetLang),
      explanation: await translate(chapter.explanation, "explanation", targetLang),
      mostProbableQuestions: await Promise.all(
        chapter.mostProbableQuestions.map(async (q) => ({
          question: await translate(q.question, "question", targetLang),
          answer: await translate(q.answer, "answer", targetLang),
        }))
      ),
      practiceQuestions: chapter.practiceQuestions
        ? await Promise.all(
            chapter.practiceQuestions.map(async (q) => ({
              ...q,
              question: await translate(q.question, "question", targetLang),
              options: await Promise.all(q.options.map(opt => translate(opt, "question", targetLang))),
              correctAnswer: await translate(q.correctAnswer, "answer", targetLang),
              explanation: await translate(q.explanation, "answer", targetLang),
            }))
          )
        : undefined,
      youtubeVideos: chapter.youtubeVideos,
      youtubeQueries: chapter.youtubeQueries
    };
  };

  const handleLanguageChange = async (lang: string) => {
    setSelectedLanguage(lang);
    if (lang === "en") return;
    if (translatedChapters[lang]) return; // Already translated
    setTranslating(true);
    // Translate all chapters
    const translated = await Promise.all(
      chapters.map((ch) => translateChapter(ch, lang))
    );
    setTranslatedChapters((prev) => ({ ...prev, [lang]: translated }));
    setTranslating(false);
  };

  // Track expanded chapters
  const expandedChapterId = Array.from(expandedChapters)[0];
  const expandedChapter = chapters.find(ch => ch.id === expandedChapterId);

  // Listen for speechSynthesis events to update button state
  useEffect(() => {
    const handlePause = () => setIsPaused(true);
    const handleResume = () => setIsPaused(false);
    const handleStart = () => setIsSpeaking(true);
    const handleEnd = () => { setIsSpeaking(false); setIsPaused(false); };
    window.speechSynthesis.addEventListener('pause', handlePause);
    window.speechSynthesis.addEventListener('resume', handleResume);
    window.speechSynthesis.addEventListener('start', handleStart);
    window.speechSynthesis.addEventListener('end', handleEnd);
    window.speechSynthesis.addEventListener('cancel', handleEnd);
    return () => {
      window.speechSynthesis.removeEventListener('pause', handlePause);
      window.speechSynthesis.removeEventListener('resume', handleResume);
      window.speechSynthesis.removeEventListener('start', handleStart);
      window.speechSynthesis.removeEventListener('end', handleEnd);
      window.speechSynthesis.removeEventListener('cancel', handleEnd);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-lg">
        <p>Error: {error}</p>
        <p className="text-sm mt-2">Using basic chapter breakdown...</p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="text-slate-500 text-center py-8">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p>No chapters available. Please upload a syllabus to get started.</p>
      </div>
    );
  }

  return (
    <div className={selectedLanguage === 'hi' ? 'hindi-font' : selectedLanguage === 'bn' ? 'bengali-font' : ''}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-800">Chapter Breakdown</h3>
          <span className="text-sm text-slate-500">({chapters.length} chapters)</span>
        </div>
        <div className="mb-4 flex items-center space-x-2">
          <label htmlFor="lang-select" className="font-medium text-sm">Language:</label>
          <select
            id="lang-select"
            value={selectedLanguage}
            onChange={e => handleLanguageChange(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
          {translating && <span className="ml-2 text-blue-600 text-xs">Translating...</span>}
          <button
            type="button"
            className="ml-2 px-3 py-1 rounded border border-blue-600 text-blue-600 bg-transparent text-sm font-semibold transition-colors hover:bg-blue-600 hover:text-white"
            onClick={() => {
              if (!expandedChapter) return;
              if (isSpeaking) {
                window.speechSynthesis.cancel();
                return;
              }
              // Gather all English text for the expanded chapter
              const textToRead = [
                expandedChapter.title,
                expandedChapter.explanation,
                ...(expandedChapter.mostProbableQuestions?.map(q => `${q.question} ${q.answer}`) || [])
              ].join(". ");
              const utterance = new window.SpeechSynthesisUtterance(textToRead);
              window.speechSynthesis.speak(utterance);
            }}
          >
            {isSpeaking ? 'Pause' : 'Speak'}
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-white text-sm transition-colors ${isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
            onClick={() => {
              if (isPaused) {
                window.speechSynthesis.resume();
              } else {
                window.speechSynthesis.pause();
              }
              setIsPaused(!isPaused);
            }}
          >
            {isPaused ? '▶️ Resume' : '⏸ Pause'}
          </button>
        </div>
        {((selectedLanguage === 'en' ? chapters : translatedChapters[selectedLanguage]) || []).map((chapter) => (
          <div key={chapter.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleChapter(chapter.id)}
              className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                {expandedChapters.has(chapter.id) ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
                <div>
                  <h4 className="text-2xl font-bold text-slate-800">{chapter.title}</h4>
                </div>
              </div>
            </button>
            {expandedChapters.has(chapter.id) && (
              <div className="border-t border-slate-200 p-6 space-y-6">
                {/* Chapter Explanation */}
                <div>
                  <h5 className="font-medium text-slate-800 mb-3 flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Detailed Explanation</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Select text to create notes
                    </span>
                  </h5>
                  <div
                    className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line relative"
                    ref={el => { explanationRefs.current[chapter.id] = el; }}
                    onMouseUp={() => handleMouseUp(chapter.id)}
                    style={{ userSelect: 'text', cursor: 'text' }}
                  >
                    {renderWithBold(chapter.explanation)}
                    {/* Floating Add button */}
                    {selectionInfo && selectionInfo.chapterId === chapter.id && (
                      <button
                        style={{
                          position: 'absolute',
                          left: selectionInfo.x,
                          top: selectionInfo.y + 8,
                          zIndex: 10,
                          background: '#2563eb',
                          color: 'white',
                          borderRadius: 6,
                          padding: '4px 12px',
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: '500',
                        }}
                        onClick={handleAddNoteClick}
                      >
                        Add Note
                      </button>
                    )}
                  </div>
                </div>
                {/* Add Note Modal */}
                {showAddNoteModal && (
                  <Dialog open={showAddNoteModal} onOpenChange={setShowAddNoteModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add to Notes</DialogTitle>
                        <DialogDescription>
                          You can edit the selected text and add a title before saving it to your notes.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 rounded p-2"
                            value={noteTitle}
                            onChange={e => setNoteTitle(e.target.value)}
                            placeholder="Enter a title for your note..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                      <textarea
                            className="w-full border border-slate-300 rounded p-2"
                            rows={4}
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                            placeholder="Edit the selected text..."
                      />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <button
                            className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                            onClick={handleCloseModal}
                            disabled={savingNote}
                          >
                            Cancel
                          </button>
                        </DialogClose>
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleConfirmAddNote}
                          disabled={savingNote || !noteTitle.trim() || !noteText.trim()}
                        >
                          {savingNote ? "Saving..." : "Save Note"}
                        </button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {/* Most Probable Exam Questions */}
                {chapter.mostProbableQuestions && chapter.mostProbableQuestions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-slate-800 mb-3 flex items-center space-x-2">
                      <HelpCircle className="h-4 w-4 text-orange-600" />
                      <span>Most Probable Exam Questions</span>
                    </h5>
                    <ul className="space-y-4 list-disc ml-6">
                      {chapter.mostProbableQuestions.map((q, idx) => (
                        <li key={idx} className="text-slate-700">
                          <div className="flex items-center justify-between">
                            <span>{q.question}</span>
                            <button
                              className="ml-4 text-blue-600 hover:underline flex items-center"
                              onClick={() => handleToggleAnswer(chapter.id, idx)}
                            >
                              {showAnswers[chapter.id]?.[idx] ? <><EyeOff className="h-4 w-4 mr-1" />Hide Answer</> : <><Eye className="h-4 w-4 mr-1" />Show Answer</>}
                            </button>
                          </div>
                          {showAnswers[chapter.id]?.[idx] && (
                            <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-3">
                              {renderWithBold(q.answer)}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* YouTube Videos */}
                {chapter.youtubeVideos && chapter.youtubeVideos.length > 0 && (
                  <div>
                    <h5 className="font-medium text-slate-800 mb-3 flex items-center space-x-2">
                      <Play className="h-4 w-4 text-red-600" />
                      <span>Suggested YouTube Videos</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {chapter.youtubeVideos.map((video: { title: string; url: string; thumbnail?: string | null; timestamp?: number }, idx: number) => (
                        <a
                          key={idx}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          {video.thumbnail && (
                            <img src={video.thumbnail} alt={video.title} className="w-16 h-10 object-cover rounded" />
                          )}
                          <div>
                            <span className="text-blue-700 font-medium line-clamp-2">{video.title}</span>
                            {video.timestamp && (
                              <div className="text-xs text-slate-500 mt-1">Watch from {formatSeconds(video.timestamp)}</div>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Practice Quiz */}
                {chapter.practiceQuestions && chapter.practiceQuestions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-slate-800 mb-3 flex items-center space-x-2">
                      <HelpCircle className="h-4 w-4 text-green-600" />
                      <span>Interactive Practice Quiz</span>
                      <span className="text-sm text-slate-500">({chapter.practiceQuestions.length} questions)</span>
                    </h5>
                    
                    {!quizMode[chapter.id] && !showQuizResults[chapter.id] && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-800 mb-3">Test your understanding with multiple-choice questions!</p>
                        <button
                          onClick={() => startQuiz(chapter.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Start Quiz
                        </button>
                      </div>
                    )}

                    {(quizMode[chapter.id] || showQuizResults[chapter.id]) && (
                      <div className="space-y-4">
                        {chapter.practiceQuestions.map((question, idx) => (
                          <div key={idx} className={`bg-slate-50 border border-slate-200 rounded-lg p-4 ${showQuizResults[chapter.id] ? ((userAnswers[chapter.id]?.[idx] === question.correctAnswer) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : ''}`}>
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">MCQ</span>
                              <span className="text-sm text-slate-600">Question {idx + 1}</span>
                            </div>
                            <p className="font-medium text-slate-800 mb-3">{question.question}</p>
                            <div className="space-y-2">
                              {Array.isArray(question.options) ? (
                                question.options.map((option, optionIdx) => (
                                  <label key={optionIdx} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`question-${chapter.id}-${idx}`}
                                      value={option}
                                      checked={userAnswers[chapter.id]?.[idx] === option}
                                      onChange={(e) => handleAnswerChange(chapter.id, idx, e.target.value)}
                                      className="text-blue-600"
                                      disabled={showQuizResults[chapter.id]}
                                    />
                                    <span className={showQuizResults[chapter.id] && option === question.correctAnswer ? 'font-bold text-green-700' : 'text-slate-700'}>{option}</span>
                                    {showQuizResults[chapter.id] && option === question.correctAnswer && (
                                      <span className="ml-2 text-green-600 text-xs">(Correct)</span>
                                    )}
                                  </label>
                                ))
                              ) : (
                                <div className="text-red-600 text-xs">Invalid options for this question.</div>
                              )}
                            </div>
                            {showQuizResults[chapter.id] && (
                              <div className="mt-2 text-sm text-slate-600">
                                <span className="font-medium">Explanation:</span> {renderWithBold(question.explanation)}
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="flex space-x-3">
                          {!showQuizResults[chapter.id] && (
                            <button
                              onClick={() => submitQuiz(chapter.id)}
                              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Submit Quiz
                            </button>
                          )}
                          <button
                            onClick={() => resetQuiz(chapter.id)}
                            className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400 transition-colors"
                          >
                            {showQuizResults[chapter.id] ? 'Try Again' : 'Cancel'}
                          </button>
                        </div>
                        {showQuizResults[chapter.id] && (
                          <div className="space-y-4 mt-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h6 className="font-semibold text-blue-800 mb-2">Quiz Results</h6>
                              <p className="text-blue-700">
                                Score: {quizScores[chapter.id]?.correct || 0} out of {quizScores[chapter.id]?.total || 0} correct
                                ({Math.round(((quizScores[chapter.id]?.correct || 0) / (quizScores[chapter.id]?.total || 1)) * 100)}%)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChapterBreakdown; 