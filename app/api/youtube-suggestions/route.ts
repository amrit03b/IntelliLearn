import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { subtopicName } = await req.json();

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ error: "YouTube API key not set" }, { status: 500 });
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=2&order=viewCount&q=${encodeURIComponent(
      subtopicName
    )}&key=${YOUTUBE_API_KEY}`;
    const ytRes = await fetch(searchUrl);
    const ytData = await ytRes.json();
    if (!ytData.items) {
      return NextResponse.json({ videos: [] });
    }
    const videos = ytData.items.map((item: any) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
    return NextResponse.json({ videos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to call YouTube API" }, { status: 500 });
  }
} 