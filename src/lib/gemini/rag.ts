import { GoogleGenerativeAI } from '@google/generative-ai';
import kbData from '@/data/kb-embeddings.json';

interface KBChunk {
  heading: string;
  content: string;
  embedding: number[];
}

const chunks = kbData as unknown as KBChunk[];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function searchKB(query: string, topK = 5): Promise<KBChunk[]> {
  if (chunks.length === 0) return [];

  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(query);
  const queryEmbedding = result.embedding.values;

  const scored = chunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

const SYSTEM_PROMPT = `You are VehicleReel's helpful assistant. You answer questions about the VehicleReel platform — a South African vehicle marketplace for film and TV production.

Rules:
- ONLY answer based on the provided context. Do not make up information.
- If the answer is not in the context, say "I don't have information about that. Please contact vehiclereel@gmail.com for help."
- Be concise and friendly. Use short paragraphs.
- If the user asks how to do something, give step-by-step instructions.
- Do not use markdown headings or code blocks. Use plain text with numbered lists where helpful.
- If relevant, mention which page or section of the site the user should navigate to.
- Keep responses under 200 words unless the question requires a detailed walkthrough.`;

export async function generateAnswer(
  query: string,
  context: KBChunk[],
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<ReadableStream<Uint8Array>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const contextText = context
    .map((c) => `--- ${c.heading} ---\n${c.content}`)
    .join('\n\n');

  const contents = [
    ...history.slice(-10).map((msg) => ({
      role: (msg.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: `Context:\n${contextText}\n\nQuestion: ${query}` }],
    },
  ];

  const result = await model.generateContentStream({
    contents,
    systemInstruction: SYSTEM_PROMPT,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch {
        controller.enqueue(encoder.encode('\n\nSorry, something went wrong. Please try again.'));
      } finally {
        controller.close();
      }
    },
  });
}
