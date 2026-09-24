const analyzeTrends = async (req, res) => {
  try {
    const { publications } = req.body;

    if (!publications || publications.length === 0) {
      return res.status(400).json({ success: false, message: 'No publications data provided' });
    }

    // Pre-aggregate data to drastically reduce LLM payload size (prevents 503 size limits)
    const authors = {};
    const journals = {};
    const quartiles = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Unranked: 0 };

    publications.forEach(p => {
      // Authors
      const pubAuthors = Array.isArray(p.authors) ? p.authors : (p.authors ? [p.authors] : []);
      const cites = parseInt(p.citations || p.scopus_citations || 0, 10) || 0;
      pubAuthors.forEach(a => {
        const name = typeof a === 'string' ? a.trim() : '';
        if (!name) return;
        authors[name] = (authors[name] || 0) + cites;
      });

      // Journals
      if (p.journal) {
        journals[p.journal] = (journals[p.journal] || 0) + 1;
      }

      // Quartiles
      let q = p.quartile || 'Unranked';
      q = q.toUpperCase();
      if (quartiles[q] !== undefined) quartiles[q]++;
      else quartiles.Unranked++;
    });

    const topAuthors = Object.entries(authors).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topJournals = Object.entries(journals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    // Sort by year to get latest titles
    const sortedPubs = [...publications].sort((a, b) => (b.academic_year || '').localeCompare(a.academic_year || ''));

    const aggregatedSummary = {
      total_publications: publications.length,
      quartile_distribution: quartiles,
      top_cited_authors: topAuthors.map(a => `${a[0]} (${a[1]} citations)`),
      top_journals: topJournals.map(j => `${j[0]} (${j[1]} papers)`),
      recent_titles: sortedPubs.slice(0, 50).map(p => p.title) // 50 titles is enough for identifying research areas
    };

    const prompt = `
You are an academic research analyst. Analyze this department's publication data and return ONLY a valid JSON object with no markdown, no backticks, no explanation. 

Return exactly this structure:
{
  "dominant_research_areas": ["area1", "area2", "area3"],
  "most_cited_author": "Name — X total citations",
  "top_journal": "Journal Name — X papers",
  "quartile_distribution": { "Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0, "Unranked": 0 },
  "yoy_trend": "One sentence describing publishing trends based on the titles and distribution",
  "insight": "2-3 sentence executive summary of the department's research output and key patterns"
}

Publication data summary:
${JSON.stringify(aggregatedSummary)}
    `.trim();

    let response;
    let retries = 3;
    let model = 'gemini-3.6-flash';
    let errText = '';

    while (retries > 0) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        }
      );

      if (response.ok) break;
      
      errText = await response.text();
      console.error(`[AI] Gemini API error on ${model}:`, errText);
      
      if (response.status === 503) {
        console.log(`[AI] ${model} is overloaded, retrying...`);
        retries--;
        await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
      } else {
        break; // break on non-503 errors (e.g. 400, 403, 404)
      }
    }

    if (!response || !response.ok) {
      return res.status(502).json({ success: false, message: 'AI service unavailable due to high demand. Please try again later.' });
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
