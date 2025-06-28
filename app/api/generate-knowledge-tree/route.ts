import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { syllabusContent, numQuestions } = await req.json();

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not set" }, { status: 500 });
  }
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ error: "YouTube API key not set" }, { status: 500 });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert teacher in the subject/domain of the provided syllabus. Use your expertise to break down the following syllabus into as many logical chapters as needed, grouping related subtopics together.

For each chapter, provide:
1. Chapter Title (plain text)
2. A detailed, exam-oriented teaching write-up of the chapter (plain text, but you may use double asterisks (**) to mark important points, key terms, definitions, formulas, and crucial concepts for bold emphasis. Do NOT use any other markdown or HTML. Titles should remain plain text.) Write as if you are teaching the chapter to a student, explaining concepts step by step, and naturally integrating relevant examples and explanations into the narrative. Do not just list what to study—actually teach the material in detail, using examples as part of the explanation.
3. At the end of each chapter, add a section called "Most Probable Exam Questions" as an array of 3-5 objects. Each object should have:
   - question: the exam question (plain text)
   - answer: a detailed, exam-oriented answer (plain text, you may use double asterisks (**) for bold, but no other markdown/HTML)
4. Also provide a "Practice Questions" array with ${numQuestions || 5} multiple-choice questions. Each question should have:
   - type: "multiple-choice" (all questions should be multiple choice)
   - question: the question text (plain text)
   - options: array of 4 options
   - correctAnswer: the correct answer (must match one of the options exactly)
   - explanation: brief explanation of why this is correct (plain text, you may use double asterisks (**) for bold)
5. Also provide a youtubeQueries array (2-3 objects). Each object should have:
   - query: a search query for a relevant YouTube video for this chapter
   - timestamp: the timestamp in seconds where the topic starts in the video (e.g., 120 for 2 minutes)

Format the response as a JSON array. Each chapter should have:
{
  "id": "chapter-1",
  "title": "Chapter Title",
  "explanation": "Detailed teaching write-up with integrated examples, in plain text, with **important points** marked for bold.",
  "mostProbableQuestions": [
    { "question": "Question 1", "answer": "Detailed answer in plain text, with **bold** for important points." },
    { "question": "Question 2", "answer": "Detailed answer in plain text." }
  ],
  "practiceQuestions": [
    {
      "type": "multiple-choice",
      "question": "What is the time complexity of accessing an element in an array?",
      "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
      "correctAnswer": "O(1)",
      "explanation": "Arrays provide **direct access** to elements using their index, making it a constant time operation."
    }
  ],
  "youtubeQueries": [
    { "query": "search query 1", "timestamp": 120 },
    { "query": "search query 2", "timestamp": 45 }
  ]
}

Do not use any markdown, HTML, or formatting symbols except for double asterisks (**) to mark important points in the explanation and answers. All other content must be plain text only. Do not use underscores, tags, or double asterisks for titles. Just write the text as it should appear to a student.

SYLLABUS:
${syllabusContent}`,
                },
              ],
            },
          ],
        }),
      }
    );
    const geminiData = await geminiResponse.json();
    const text =
      geminiData &&
      geminiData.candidates &&
      geminiData.candidates[0]?.content?.parts?.[0]?.text;
    
    console.log('Gemini raw response:', text);
    // Try to extract JSON from the response
    const match = text?.match(/\[[\s\S]*\]/);
    const chaptersJson = match ? match[0] : text;
    
    let chapters;
    try {
      chapters = JSON.parse(chaptersJson);
      console.log('Parsed chapters:', chapters);
    } catch (parseError) {
      // If parsing fails, create basic chapters from content
      chapters = createBasicChapters(syllabusContent);
    }

    // Attach YouTube videos for each chapter
    for (const chapter of chapters) {
      chapter.youtubeVideos = [];
      if (chapter.youtubeQueries && Array.isArray(chapter.youtubeQueries)) {
        for (const queryObj of chapter.youtubeQueries) {
          const query = typeof queryObj === "string" ? queryObj : queryObj.query;
          const timestamp = typeof queryObj === "object" && queryObj.timestamp ? queryObj.timestamp : 0;
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&order=relevance&q=${encodeURIComponent(
            query
          )}&key=${YOUTUBE_API_KEY}`;
          try {
            const ytRes = await fetch(searchUrl);
            const ytData = await ytRes.json();
            console.log('YouTube API response for query', query, ytData);
            if (ytData.items && ytData.items.length > 0) {
              const item = ytData.items[0];
              chapter.youtubeVideos.push({
                title: item.snippet.title,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}${timestamp ? `&t=${timestamp}s` : ""}`,
                thumbnail: item.snippet.thumbnails?.default?.url || null,
                timestamp
              });
            }
          } catch (err) {
            console.error('YouTube API error for query', query, err);
            // Ignore YouTube errors for this query
          }
        }
      }
    }

    return NextResponse.json({ chapters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to call Gemini API" }, { status: 500 });
  }
}

function createBasicChapters(content: string) {
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
  const chapters = [];
  
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
      youtubeQueries: [{ query: "example search query", timestamp: 0 }],
      youtubeVideos: []
    });
  });

  return chapters.slice(0, 10);
}

function extractKeyPoints(content: string) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 5).map(s => s.trim());
} 