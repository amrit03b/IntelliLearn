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
    // Add a regeneration token to force unique output
    const regenerateToken = Math.random().toString(36).substring(2);
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
                  text: `You are an expert teacher in the subject/domain of the provided syllabus. Use your expertise to break down the following syllabus into as many logical chapters as needed, grouping related subtopics together.\n\nRegeneration token: ${regenerateToken}\n\nFor each chapter, provide:\n1. Chapter Title (plain text)\n2. A detailed, exam-oriented teaching write-up of the chapter (plain text, but you may use double asterisks (**) to mark important points, key terms, definitions, formulas, and crucial concepts for bold emphasis. Do NOT use any other markdown or HTML. Titles should remain plain text.) Write as if you are teaching the chapter to a student, explaining concepts step by step, and naturally integrating relevant examples and explanations into the narrative. Do not just list what to study—actually teach the material in detail, using examples as part of the explanation.\n3. At the end of each chapter, add a section called \"Most Probable Exam Questions\" as an array of 3-5 objects. Each object should have:\n   - question: the exam question (plain text)\n   - answer: a detailed, exam-oriented answer (plain text, you may use double asterisks (**) for bold, but no other markdown/HTML)\n4. Also provide a \"Practice Questions\" array with ${numQuestions || 5} multiple-choice questions. Each question should have:\n   - type: \"multiple-choice\" (all questions should be multiple choice)\n   - question: the question text (plain text)\n   - options: array of 4 options\n   - correctAnswer: the correct answer (must match one of the options exactly)\n   - explanation: brief explanation of why this is correct (plain text, you may use double asterisks (**) for bold)\n5. Also provide a youtubeQueries array (2-3 objects). Each object should have:\n   - query: a search query for a relevant YouTube video for this chapter\n   - timestamp: the timestamp in seconds where the topic starts in the video (e.g., 120 for 2 minutes)\n\nFormat the response as a JSON array. Each chapter should have:\n{\n  \"id\": \"chapter-1\",\n  \"title\": \"Chapter Title\",\n  \"explanation\": \"Detailed teaching write-up with integrated examples, in plain text, with **important points** marked for bold.\",\n  \"mostProbableQuestions\": [\n    { \"question\": \"Question 1\", \"answer\": \"Detailed answer in plain text, with **bold** for important points.\" },\n    { \"question\": \"Question 2\", \"answer\": \"Detailed answer in plain text.\" }\n  ],\n  \"practiceQuestions\": [\n    {\n      \"type\": \"multiple-choice\",\n      \"question\": \"What is the time complexity of accessing an element in an array?\",\n      \"options\": [\"O(1)\", \"O(n)\", \"O(log n)\", \"O(n²)\"],\n      \"correctAnswer\": \"O(1)\",\n      \"explanation\": \"Arrays provide **direct access** to elements using their index, making it a constant time operation.\"\n    }\n  ],\n  \"youtubeQueries\": [\n    { \"query\": \"search query 1\", \"timestamp\": 120 },\n    { \"query\": \"search query 2\", \"timestamp\": 45 }\n  ]\n}\n\nDo not use any markdown, HTML, or formatting symbols except for double asterisks (**) to mark important points in the explanation and answers. All other content must be plain text only. Do not use underscores, tags, or double asterisks for titles. Just write the text as it should appear to a student.\n\nSYLLABUS:\n${syllabusContent}`,
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

    // Ensure each chapter has exactly numQuestions practice questions
    if (Array.isArray(chapters)) {
      chapters.forEach((chapter, chapterIdx) => {
        if (!Array.isArray(chapter.practiceQuestions) || chapter.practiceQuestions.length === 0) {
          // Generate dummy questions if missing or empty
          chapter.practiceQuestions = [];
        }
        let pq = chapter.practiceQuestions;
        const n = numQuestions || 5;
        // Pad with dummy questions if needed
        while (pq.length < n) {
          pq.push({
            type: "multiple-choice",
            question: `Dummy question ${pq.length + 1} for chapter ${chapter.title || chapterIdx + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option A",
            explanation: "This is a placeholder question added to meet the requested count."
          });
        }
        if (pq.length > n) {
          chapter.practiceQuestions = pq.slice(0, n);
        }
      });
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
      id: `