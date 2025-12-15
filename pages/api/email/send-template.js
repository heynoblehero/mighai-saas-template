
const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Mighai!',
    content: `
      <h2>Welcome to Mighai!</h2>
      <p>Thank you for joining our platform. We're excited to have you on board!</p>
      <p>Get started by exploring our features and building your first page.</p>
      <p>Best regards,<br>The Mighai Team</p>
    `
  },
  order_confirmation: {
    subject: 'Order Confirmation',
    content: `
      <h2>Order Confirmed!</h2>
      <p>Thank you for your purchase. Your order has been confirmed and is being processed.</p>
      <p>You will receive another email once your order ships.</p>
      <p>Best regards,<br>The Mighai Team</p>
    `
  },
  password_reset: {
    subject: 'Password Reset Request',
    content: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
      <p>To reset your password, click the link below:</p>
      <p><a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>Best regards,<br>The Mighai Team</p>
    `
  },
  newsletter: {
    subject: 'Mighai Newsletter',
    content: `
      <h2>Latest Updates from Mighai</h2>
      <p>Here are the latest updates and features from our platform:</p>
      <ul>
        <li>New workflow automation features</li>
        <li>Improved page builder</li>
        <li>Enhanced analytics</li>
      </ul>
      <p>Best regards,<br>The Mighai Team</p>
    `
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, template, variables = {} } = req.body;

  if (!to || !template) {
    return res.status(400).json({ error: 'Missing required fields: to, template' });
  }

  if (!EMAIL_TEMPLATES[template]) {
    return res.status(400).json({ error: 'Invalid template. Available templates: ' + Object.keys(EMAIL_TEMPLATES).join(', ') });
  }

  try {
    const templateData = EMAIL_TEMPLATES[template];
    let subject = templateData.subject;
    let content = templateData.content;

    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), variables[key]);
      content = content.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    const emailData = {
      id: Date.now().toString(),
      to,
      subject,
      content,
      template,
      variables,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };


    res.status(200).json({
      success: true,
      message: 'Template email sent successfully',
      emailId: emailData.id,
      template
    });

  } catch (error) {
    console.error('Error sending template email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send template email: ' + error.message
    });
  }
}