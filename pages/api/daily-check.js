import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  console.log('Daily check triggered at:', new Date().toISOString());

  try {
    // Perform search
    const searchTerms = [
      'Donkin coal mine sale',
      'Donkin mine investor', 
      'Morien Resources Donkin',
      'Kameron Collieries sale',
      'Donkin mine buyer'
    ];

    const searchResponse = await fetch(`${getBaseUrl(req)}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerms })
    });

    if (!searchResponse.ok) {
      throw new Error(`Search API failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    // Check if there's meaningful news
    const newsWithInfo = searchData.results.filter(result => result.hasNewInfo);
    const hasUpdates = newsWithInfo.length > 0;
    
    console.log(`Found ${newsWithInfo.length} news items with new info`);

    if (hasUpdates && process.env.NOTIFICATION_EMAIL && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await sendEmailNotification(newsWithInfo);
      console.log('Email notification sent');
    }

    res.status(200).json({ 
      success: true, 
      hasUpdates,
      newsCount: newsWithInfo.length,
      timestamp: new Date().toISOString(),
      results: newsWithInfo.map(item => ({
        searchTerm: item.searchTerm,
        summary: item.summary.substring(0, 200) + '...'
      }))
    });
  } catch (error) {
    console.error('Daily check error:', error);
    res.status(500).json({ 
      error: 'Daily check failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

async function sendEmailNotification(results) {
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const emailContent = results
    .map(r => `📰 **${r.searchTerm}**\n${r.summary}\n\n---\n`)
    .join('\n');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `🚨 Donkin Mine News Alert - ${new Date().toLocaleDateString()}`,
    text: `New Donkin Mine Developments Found:\n\n${emailContent}\n\nCheck your app for full details and sources.\n\nSent automatically by Donkin Mine Tracker`,
    html: `
      <h2>🚨 New Donkin Mine Developments Found:</h2>
      ${results.map(r => `
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #1FB8CD;">
          <h3>${r.searchTerm}</h3>
          <p>${r.summary.replace(/\n/g, '<br>')}</p>
        </div>
      `).join('')}
      <p><em>Check your app for full details and sources.</em></p>
      <p><small>Sent automatically by Donkin Mine Tracker</small></p>
    `
  };

  await transporter.sendMail(mailOptions);
}
