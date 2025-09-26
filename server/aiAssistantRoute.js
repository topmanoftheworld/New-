import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const ACTION_PROMPTS = {
  draft_quote_cover_letter: 'Draft a compelling cover letter to introduce a quote to a client.',
  write_thank_you_note: 'Write a warm thank-you note to the client.',
  improve_writing: 'Improve the quality, clarity, and flow of the provided text.',
  check_spelling_grammar: 'Check the text for spelling and grammar mistakes and fix them.',
  simplify_language: 'Rewrite the text using simpler, more accessible language.',
  make_formal: 'Rewrite the text to sound more formal and professional.',
  make_friendly: 'Rewrite the text to sound more friendly and conversational.',
  custom_prompt: null,
};

function pickProvider(req) {
  const providerHeader = req.header('x-ai-provider');
  if (providerHeader === 'openai' || providerHeader === 'gemini') return providerHeader;

  const bearer = req.header('authorization');
  if (bearer?.includes('sk-')) return 'openai';
  if (bearer?.includes('AIza')) return 'gemini';

  return process.env.DEFAULT_AI_PROVIDER || 'openai';
}

async function callOpenAI({ key, systemPrompt, userPrompt }) {
  if (!key) throw new Error('Missing OpenAI API key.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned an empty response.');
  return text;
}

async function callGemini({ key, systemPrompt, userPrompt }) {
  if (!key) throw new Error('Missing Gemini API key.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-pro'}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: userPrompt },
            ],
          },
        ],
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUAL', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await response.json();
  const candidates = data.candidates ?? [];
  const text = candidates[0]?.content?.parts?.map((part) => part.text).join(' ').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

router.post('/ai-assistant', async (req, res) => {
  try {
    const { action, prompt = '', context = '' } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: 'Missing "action" in request body.' });
    }

    const actionPrompt = ACTION_PROMPTS[action] ?? null;

    const systemPrompt =
      actionPrompt && action !== 'custom_prompt'
        ? actionPrompt
        : 'You are a helpful assistant for a quoting and invoicing tool. Produce polished, business-appropriate prose.';

    const userPrompt = [
      action === 'custom_prompt' ? prompt : '',
      context ? `Context:\n${context}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const bearer = req.header('authorization');
    const clientKey = bearer?.startsWith('Bearer ') ? bearer.slice(7).trim() : '';
    const provider = pickProvider(req);

    let generatedText;
    if (provider === 'openai') {
      generatedText = await callOpenAI({
        key: clientKey || process.env.OPENAI_API_KEY,
        systemPrompt,
        userPrompt,
      });
    } else {
      generatedText = await callGemini({
        key: clientKey || process.env.GEMINI_API_KEY,
        systemPrompt,
        userPrompt,
      });
    }

    res.json({ generatedText });
  } catch (error) {
    console.error('[AI assistant] request failed', error);
    res.status(500).json({ error: error.message || 'Unknown AI error.' });
  }
});

export default router;
