
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, content } = req.body;

  if (!to || !subject || !content) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, content' });
  }

  try {
    // Here you would implement your actual email sending logic
    // For now, we'll simulate email sending
    
    const emailData = {
      id: Date.now().toString(),
      to,
      subject,
      content,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };


    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      emailId: emailData.id
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email: ' + error.message
    });
  }
}