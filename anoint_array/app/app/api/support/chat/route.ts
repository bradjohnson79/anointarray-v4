import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/api-handler';
import { BadRequestError } from '@/lib/http-errors';
import fs from 'fs/promises';
import path from 'path';

async function loadKBMarkdown(): Promise<string> {
  try {
    const mdDir = path.join(process.cwd(), 'data', 'support-kb', 'md');
    const files = await fs.readdir(mdDir);
    const mdFiles = files.filter(f => f.toLowerCase().endsWith('.md'));
    // Load up to 5 files to keep prompt size reasonable
    const selected = mdFiles.slice(0, 5);
    const contents = await Promise.all(selected.map(f => fs.readFile(path.join(mdDir, f), 'utf-8')));
    return contents.join('\n\n---\n\n');
  } catch {
    return '';
  }
}

async function loadSupportConfig(): Promise<{ enabled: boolean; description: string }> {
  try {
    const cfgPath = path.join(process.cwd(), 'data', 'support-config.json');
    const raw = await fs.readFile(cfgPath, 'utf-8');
    const cfg = JSON.parse(raw);
    return { enabled: !!cfg?.enabled, description: String(cfg?.description || '') };
  } catch {
    return { enabled: false, description: '' };
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(request: NextRequest) {
  const { message } = await request.json();
  if (!message || typeof message !== 'string') {
    throw new BadRequestError('Invalid input');
  }

    const kb = await loadKBMarkdown();
    const sup = await loadSupportConfig();
    const defaultSystem = `You are ANOINT Support, a friendly, concise assistant for ANOINT Array. 
Use the provided knowledgebase to answer questions about the site, navigation, energetic practices, and products. 
Be clear that products are metaphysical energetic tools, not medical devices. Avoid medical claims.
If users ask about broken links or errors, suggest contacting support or running an admin site scan. Provide step-by-step guidance.
If unsure, ask a clarifying question.`;
    const system = (sup.description && sup.description.trim().length > 0) ? sup.description : defaultSystem;

    const prompt = `Knowledgebase:\n\n${kb}\n\nUser question: ${message}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback simple echo if no key is present
      return NextResponse.json({ reply: 'AI service is not configured yet. Please try again later or contact support.' });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 600
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('OpenAI error:', txt);
      return NextResponse.json({ reply: 'I had trouble reaching the AI service. Please try again.' });
    }
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content || 'I had trouble formulating a response.';
  return NextResponse.json({ reply });
}

export const POST = withApiErrorHandling(handler, '/api/support/chat');
