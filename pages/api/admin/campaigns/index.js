const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return getCampaigns(req, res);
  } else if (req.method === 'POST') {
    return createCampaign(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getCampaigns(req, res) {
  const db = new sqlite3.Database(dbPath);

  try {
    const campaigns = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM email_campaigns ORDER BY created_at DESC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  } finally {
    db.close();
  }
}

async function createCampaign(req, res) {
  const {
    name,
    description,
    type,
    trigger_condition,
    email_template_id,
    send_delay_hours,
    target_plan
  } = req.body;

  if (!name || !type || !email_template_id) {
    return res.status(400).json({ error: 'Name, type, and email template are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    const campaignId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO email_campaigns 
         (name, description, type, trigger_condition, email_template_id, send_delay_hours, target_plan)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description, type, JSON.stringify(trigger_condition || {}), email_template_id, send_delay_hours || 0, target_plan || 'all'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({ 
      message: 'Campaign created successfully',
      campaignId 
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  } finally {
    db.close();
  }
}