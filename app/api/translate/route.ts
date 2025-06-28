import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, targetLang } = await req.json();
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not set" }, { status: 500 });
  }

  try {
    const prompt = `Translate the following educational content to ${targetLang}. Translate all sentences, headings, and questions. Only return the translated text, no explanation or extra formatting. If the text is already in ${targetLang}, still rewrite it in ${targetLang} using natural, fluent phrasing.\n\n${text}`;
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const geminiData = await geminiResponse.json();
    console.log('Gemini translation response:', JSON.stringify(geminiData));
    const translated =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return NextResponse.json({ translatedText: translated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Translation failed" }, { status: 500 });
  }
} 