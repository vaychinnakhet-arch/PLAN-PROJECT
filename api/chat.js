export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, tasks } = req.body;
    if (!prompt || !tasks) return res.status(400).json({ error: 'Missing prompt or tasks' });

    const systemPrompt = `You are an AI assistant for a project management app. 
The user wants to modify the project plan. The current tasks are provided as JSON.
You must return the updated tasks array in a strict JSON format within a markdown code block (\`\`\`json ... \`\`\`).
Do NOT provide explanations outside the JSON block. ONLY return valid JSON that can be parsed by JSON.parse().
Each task object has properties: id(string), name(string), type('manual'|'auto'), start(string YYYY-MM-DD), end(string YYYY-MM-DD), duration(number), progress(number 0-100), dependencies(string e.g. "1FS"), resource(string).
Parent tasks (type='auto') summarize their children. Child tasks have IDs starting with parent ID + "." (e.g., parent "1", children "1.1", "1.2").
If user asks to add tasks, make sure IDs follow this convention. Keep the language in Thai.`;

    const userContent = `Current Tasks:\n${JSON.stringify(tasks, null, 2)}\n\nUser Request: ${prompt}`;

    try {
        if (process.env.OPENAI_API_KEY) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(`OpenAI Error: ${err.error?.message || response.status}`);
            }

            const data = await response.json();
            return res.status(200).json({ text: data.choices[0].message.content });

        } else if (process.env.GEMINI_API_KEY) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt + "\n\n" + userContent }] }],
                    generationConfig: { temperature: 0.2 }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(`Gemini Error: ${err.error?.message || response.status}`);
            }

            const data = await response.json();
            return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        } else {
            return res.status(500).json({ error: 'No API Key found. Set OPENAI_API_KEY or GEMINI_API_KEY in Vercel Environment Variables.' });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message });
    }
}
