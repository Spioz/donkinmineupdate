import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Verify this is a cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Perform search
    const searchResponse = await fetch(`${process.env.VERCEL_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchTerms: [
          'Donkin coal mine sale',
          'Donkin mine investor',
          'Morien Resources Donkin',
          'Kameron Collieries sale',
          'Donkin mine buyer'
        ]
      })
    });

    const searchData = await searchResponse.json();
    
    // Check if there's meaningful news
    const hasUpdates = searchData.results.some(result => result.hasNewInfo);
    
    if (hasUpdates && process.env.EMAIL_USER) {
      await sendEmailNotification(searchData.results);
    }

    res.status(200).json({ 
      success: true, 
      hasUpdates,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: 'Cron job failed' });
  }
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
    .filter(r => r.hasNewInfo)
    .map(r => `**${r.searchTerm}**\n${r.summary}\n\n`)
    .join('');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFICATION_EMAIL,
    subject: 'Donkin Mine News Alert - ' + new Date().toDateString(),
    text: `Daily Donkin Mine News Update:\n\n${emailContent}`
  };

  await transporter.sendMail(mailOptions);
}
