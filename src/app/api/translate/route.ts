import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { text, mode } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Input length limits per mode
    const maxLength = mode === 'word' ? 50 : 500;
    if (text.length > maxLength) {
      return NextResponse.json({ error: `Text too long (max ${maxLength} characters)` }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    // Sanitize: strip control characters
    const sanitizedText = text.replace(/[\x00-\x1F\x7F]/g, '').trim();
    if (!sanitizedText) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'word') {
      // Single word translation
      systemPrompt = `Bạn là một từ điển Anh-Việt. Trả về JSON với format:
{
  "word": "từ gốc",
  "pronunciation": "phiên âm IPA",
  "meaning_vi": "nghĩa tiếng Việt",
  "meaning_en": "English definition",
  "part_of_speech": "noun/verb/adj/adv/etc",
  "example": "example sentence",
  "example_vi": "câu ví dụ tiếng Việt"
}
Chỉ trả về JSON, không có text khác.`;
      userPrompt = `Tra từ: [${sanitizedText}]`;
    } else if (mode === 'translate') {
      // Phrase/sentence translation
      systemPrompt = `Bạn là một dịch giả chuyên nghiệp. Dịch đoạn text từ Anh sang Việt. Trả về JSON:
{
  "original": "text gốc",
  "translation": "bản dịch tiếng Việt",
  "notes": "ghi chú ngắn nếu có (idiom, slang, etc)"
}
Chỉ trả về JSON, không có text khác.`;
      userPrompt = `Dịch: [${sanitizedText}]`;
    } else if (mode === 'grammar') {
      // Grammar analysis
      systemPrompt = `Bạn là một giáo viên tiếng Anh. Phân tích ngữ pháp câu/cụm từ và giải thích bằng tiếng Việt đơn giản, dễ hiểu cho trẻ em. Trả về JSON:
{
  "original": "text gốc",
  "structure": "cấu trúc câu (S + V + O, etc)",
  "tense": "thì (Present Simple, Past, etc)",
  "explanation": "giải thích chi tiết bằng tiếng Việt",
  "breakdown": [
    {"part": "từ/cụm", "role": "vai trò (Subject, Verb, etc)", "meaning": "nghĩa"}
  ],
  "tips": "mẹo ghi nhớ"
}
Chỉ trả về JSON, không có text khác.`;
      userPrompt = `Phân tích ngữ pháp: [${sanitizedText}]`;
    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      if (content.includes('```')) {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonStr = match[1];
      }
      const result = JSON.parse(jsonStr.trim());
      return NextResponse.json(result);
    } catch {
      // If not valid JSON, return raw text
      return NextResponse.json({ 
        translation: content,
        raw: true 
      });
    }
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
