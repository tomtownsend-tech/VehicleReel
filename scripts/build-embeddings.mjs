/**
 * Build script: Chunks the chatbot knowledge base by ## headings,
 * embeds each chunk via Gemini text-embedding-004, and writes the
 * result to src/data/kb-embeddings.json.
 *
 * Usage: node scripts/build-embeddings.mjs
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load env vars from .env and .env.local (no dotenv dependency)
for (const envFile of ['.env.local', '.env']) {
  const envPath = join(ROOT, envFile);
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    }
  } catch {
    // file doesn't exist, skip
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY not found in environment or .env files');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

// Read and chunk the knowledge base
const kbPath = join(ROOT, 'docs/chatbot-knowledge-base.md');
if (!existsSync(kbPath)) {
  console.error('Error: docs/chatbot-knowledge-base.md not found');
  process.exit(1);
}

const kb = readFileSync(kbPath, 'utf-8');

function chunkByHeadings(markdown) {
  const lines = markdown.split('\n');
  const chunks = [];
  let heading = '';
  let content = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (heading && content.length > 0) {
        const text = content.join('\n').trim();
        if (text.length > 0) chunks.push({ heading, content: text });
      }
      heading = line.replace('## ', '').trim();
      content = [];
    } else if (line.startsWith('# ') && !line.startsWith('## ')) {
      continue; // skip title
    } else {
      content.push(line);
    }
  }

  if (heading && content.length > 0) {
    const text = content.join('\n').trim();
    if (text.length > 0) chunks.push({ heading, content: text });
  }

  return chunks;
}

const chunks = chunkByHeadings(kb);
console.log(`Found ${chunks.length} chunks\n`);

const embeddings = [];

for (let i = 0; i < chunks.length; i++) {
  const chunk = chunks[i];
  const text = `${chunk.heading}\n\n${chunk.content}`;

  console.log(`[${i + 1}/${chunks.length}] ${chunk.heading}`);

  const result = await model.embedContent(text);
  embeddings.push({
    heading: chunk.heading,
    content: chunk.content,
    embedding: result.embedding.values,
  });

  // small delay to stay within rate limits
  await new Promise((r) => setTimeout(r, 100));
}

const outDir = join(ROOT, 'src/data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'kb-embeddings.json');
writeFileSync(outPath, JSON.stringify(embeddings, null, 2));

console.log(`\nWrote ${embeddings.length} embeddings to src/data/kb-embeddings.json`);
