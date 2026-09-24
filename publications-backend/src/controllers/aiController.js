const analyzeTrends = async (req, res) => {
  try {
    const { publications } = req.body;

    if (!publications || publications.length === 0) {
      return res.status(400).json({ success: false, message: 'No publications data provided' });
    }

    // Summarize data sent to AI — don't send full objects, just what's needed
    const summary = publications.map(p => ({
      title: p.title,
      journal: p.journal,
      authors: Array.isArray(p.authors) ? p.authors : [p.authors],
      citations: p.citations || p.scopus_citations || 0,
      quartile: p.quartile,
      year: p.academic_year || p.academicYear,
    }));

    const prompt = `
You are an academic research analyst. Analyze this department's publication data and return ONLY a valid JSON object with no markdown, no backticks, no explanation. 

Return exactly this structure:
{
  "dominant_research_areas": ["area1", "area2", "area3"],
  "most_cited_author": "Name — X total citations",
  "top_journal": "Journal Name — X papers",
  "quartile_distribution": { "Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0, "Unranked": 0 },
  "yoy_trend": "One sentence describing year-on-year publishing trend",
  "insight": "2-3 sentence executive summary of the department's research output and key patterns"
}

Publication data:
${JSON.stringify(summary)}
    `.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 } // Low temp for structured output
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI] Gemini API error:', errText);
      return res.status(502).json({ success: false, message: 'AI service unavailable' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(502).json({ success: false, message: 'Empty response from AI' });
    }

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, data: parsed });

  } catch (err) {
    console.error('[AI] analyzeTrends error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to analyze trends' });
  }
};

module.exports = { analyzeTrends };
