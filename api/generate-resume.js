export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workHistory, jobDesc } = req.body;

  // Validate inputs
  if (!workHistory?.trim() || !jobDesc?.trim()) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const systemPrompt = `You are an elite resume writer and career coach. Your job is to take a user's raw work history and a target job description, then produce:
1. A polished, ATS-optimized resume in clean text format
2. A tailored cover letter

Format your response EXACTLY as valid JSON like this:
{
  "resume": "Full resume text here with sections: Summary, Experience, Skills, Education",
  "coverLetter": "Full cover letter text here",
  "atsScore": 87,
  "topKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Rules:
- Make the resume punchy, achievement-focused, with strong action verbs
- Use numbers/metrics wherever possible (even if estimated)
- Include relevant keywords from the job description
- Keep resume under 600 words
- Cover letter should be 3 paragraphs, confident tone
- ATS score should be realistic (60-95)
- Return ONLY valid JSON, no markdown, no extra text`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `MY WORK HISTORY:\n${workHistory}\n\nTARGET JOB DESCRIPTION:\n${jobDesc}\n\nGenerate my optimized resume and cover letter as JSON.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to generate resume' });
    }

    const data = await response.json();
    const text = data.content?.map((b) => b.text || '').join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Resume generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate resume. Please try again.' 
    });
  }
}
