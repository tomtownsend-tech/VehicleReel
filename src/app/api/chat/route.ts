import { NextRequest, NextResponse } from 'next/server';
import { searchKB, generateAnswer } from '@/lib/gemini/rag';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!message || message.length > 1000) {
      return NextResponse.json(
        { error: 'Message is required and must be under 1000 characters' },
        { status: 400 },
      );
    }

    const context = await searchKB(message, 5);
    const stream = await generateAnswer(message, context, history);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
