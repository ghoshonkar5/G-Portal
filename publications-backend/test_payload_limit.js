require('dotenv').config();

const testGemini = async (titleCount) => {
  const model = 'gemini-3.6-flash';
  
  const summary = Array(titleCount).fill(0).map((_, i) => ({
    title: `Publication Title ${i} About AI and Data Science`,
    journal: `Journal of Machine Learning ${i}`,
    authors: [`Author ${i}A`, `Author ${i}B`],
    citations: i,
    quartile: `Q${(i % 4) + 1}`,
    year: `202${i%5}`
  }));

  const aggregatedSummary = {
    total_publications: summary.length,
    quartile_distribution: { Q1: 10, Q2: 20 },
    top_cited_authors: ["A (10)", "B (5)"],
    top_journals: ["J1 (5)"],
    recent_titles: summary.map(p => p.title) 
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
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );
    
    console.log(`[${titleCount} titles] Status: ${response.status}`);
  } catch (err) {
    console.error("Fetch error:", err);
  }
};

const run = async () => {
  await testGemini(50);
  await testGemini(10);
  await testGemini(5);
  await testGemini(0);
};

run();
