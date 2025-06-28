import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, BookOpen, FileText, HelpCircle, Eye, EyeOff, Play } from "lucide-react";

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
  youtubeVideos?: { title: string; url: string; thumbnail?: string | null; timestamp?: number };
}

interface ChapterBreakdownProps {
  syllabusContent?: string;
  chapters?: Chapter[];
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

const ChapterBreakdown: React.FC<ChapterBreakdownProps> = ({ syllabusContent, chapters: chaptersProp }) => {
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

  const createBasicChapters = (content: string): Chapter[] => {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
    const chapters: Chapter[] = [];
    paragraphs.forEach((paragraph, index) => {
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
        youtubeVideos: []
      });
    });
    return chapters.slice(0, 10);
  };

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
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800">Chapter Breakdown</h3>
        <span className="text-sm text-slate-500">({chapters.length} chapters)</span>
      </div>
      {chapters.map((chapter) => (
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
                </h5>
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                  {renderWithBold(chapter.explanation)}
                </div>
              </div>
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
                    {chapter.youtubeVideos.map((video, idx) => (
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
  );
};

export default ChapterBreakdown; 