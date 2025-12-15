import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Try to get version from package.json
    let version = 'unknown';
    let commitHash = 'unknown';
    let deploymentTime = 'unknown';

    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      version = packageData.version || 'unknown';
    } catch (error) {
      console.log('Could not read package.json version');
    }

    try {
      const { stdout } = await execAsync('git rev-parse --short HEAD');
      commitHash = stdout.trim();
    } catch (error) {
      console.log('Could not get git commit hash');
    }

    try {
      const { stdout } = await execAsync('git log -1 --format="%ai"');
      deploymentTime = new Date(stdout.trim()).toISOString();
    } catch (error) {
      console.log('Could not get deployment time');
    }

    // Get latest commit message and author
    let commitMessage = 'unknown';
    let commitAuthor = 'unknown';
    let branchName = 'unknown';
    
    try {
      const { stdout: message } = await execAsync('git log -1 --format="%s"');
      commitMessage = message.trim();
    } catch (error) {
      console.log('Could not get commit message');
    }

    try {
      const { stdout: author } = await execAsync('git log -1 --format="%an"');
      commitAuthor = author.trim();
    } catch (error) {
      console.log('Could not get commit author');
    }

    try {
      const { stdout: branch } = await execAsync('git branch --show-current');
      branchName = branch.trim();
    } catch (error) {
      console.log('Could not get branch name');
    }

    return res.status(200).json({
      success: true,
      version: version,
      commitHash: commitHash,
      commitMessage: commitMessage,
      commitAuthor: commitAuthor,
      branchName: branchName,
      deploymentTime: deploymentTime,
      platform: 'mighai-universal-saas',
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    console.error('Error getting platform version:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get platform version' 
    });
  }
}