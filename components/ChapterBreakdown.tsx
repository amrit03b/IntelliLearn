import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, BookOpen, FileText, HelpCircle, Eye, EyeOff, Play } from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  explanation: string;
  mostProbableQuestions: { question: string; answer: string }[];
  youtubeVideos?: { title: string; url: string; thumbnail?: string | null }[];
}

interface ChapterBreakdownProps {
  syllabusContent: string;
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

const ChapterBreakdown: React.FC<ChapterBreakdownProps> = ({ syllabusContent }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (syllabusContent) {
      generateChapters();
    }
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
        const basicChapters = createBasicChapters(syllabusContent);
        setChapters(basicChapters);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate chapters.");
      const basicChapters = createBasicChapters(syllabusContent);
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
                        <span className="text-blue-700 font-medium line-clamp-2">{video.title}</span>
                      </a>
                    ))}
                  </div>
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