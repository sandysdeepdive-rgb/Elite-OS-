import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiSecret = req.headers.get("x-api-secret");
    if (apiSecret !== process.env.API_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" }, { status: 401 }
      );
    }

    const { message, context, history } = await req.json();

    const systemPrompt = `You are an intelligent school management
      assistant for EliteSchool's OS, a premium school management
      system used in Uganda. You help school administrators understand
      their school's performance data and make informed decisions.
      Be concise, professional, and helpful. Use Ugandan context
      where relevant (UGX currency, Uganda curriculum S.1-S.6,
      Uganda grading system D1-F9).

      Current school data:
      ${context}`;

    const messages = [
      ...history.map((h: {role:string; content:string}) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "I could not generate a response.";

    return NextResponse.json({ response: text });
  } catch {
    return NextResponse.json(
      { response: "AI service unavailable. Please try again." },
      { status: 500 }
    );
  }
}
