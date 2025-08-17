export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { searchTerms } = req.body;
  const API_KEY = process.env.PERPLEXITY_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const results = [];
    
    for (const term of searchTerms) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a news researcher. Search for the latest news and provide a concise summary.'
            },
            {
              role: 'user',
              content: `Find the latest news about "${term}" from the past 24 hours. Focus on new developments, sales updates, or investor activity.`
            }
          ],
          max_tokens: 500,
          temperature: 0.2,
          stream: false
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        results.push({
          searchTerm: term,
          summary: data.choices[0].message.content,
          timestamp: new Date().toISOString(),
          hasNewInfo: data.choices[0].message.content.length > 100
        });
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}
