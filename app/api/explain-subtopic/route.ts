import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { subtopicName, syllabusContent } = await req.json();

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
                  text: `Provide a detailed explanation for the following topic or subtopic from the syllabus context below. Respond with a concise, clear explanation suitable for a student.\n\nTOPIC: ${subtopicName}\n\nSYLLABUS CONTEXT:\n${syllabusContent}`,
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
    const explanation = text?.trim();
    return NextResponse.json({ explanation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to call Gemini API" }, { status: 500 });
  }
} 