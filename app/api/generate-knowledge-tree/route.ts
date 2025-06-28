import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { syllabusContent } = await req.json();

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not set" }, { status: 500 });
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
                  text: `Parse the following syllabus and generate a JSON knowledge tree. Each node should have a 'name' (the topic/subtopic) and a 'children' array (for subtopics). Do NOT include explanations or descriptions, just the structure. Respond ONLY with the JSON.\n\nSYLLABUS:\n${syllabusContent}`,
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
    const match = text?.match(/\{[\s\S]*\}/);
    const knowledgeTree = match ? match[0] : text;

    return NextResponse.json({ knowledgeTree });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to call Gemini API" }, { status: 500 });
  }
} 