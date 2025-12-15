import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  const debug = {
    workingDirectory: process.cwd(),
    timestamp: new Date().toISOString()
  };

  try {
    // Check if git is installed
    try {
      const { stdout: gitVersion } = await execAsync('git --version');
      debug.gitInstalled = true;
      debug.gitVersion = gitVersion.trim();
    } catch (error) {
      debug.gitInstalled = false;
      debug.gitError = error.message;
    }

    // Check if we're in a git repository
    try {
      await execAsync('git rev-parse --git-dir');
      debug.isGitRepo = true;
    } catch (error) {
      debug.isGitRepo = false;
      debug.gitRepoError = error.message;
    }

    // Check if .git directory exists
    debug.gitDirExists = fs.existsSync('.git');
    debug.gitDirPath = path.join(process.cwd(), '.git');

    // List files in current directory
    try {
      debug.currentDirFiles = fs.readdirSync('.');
    } catch (error) {
      debug.currentDirError = error.message;
    }

    // Check git status if possible
    if (debug.isGitRepo) {
      try {
        const { stdout: gitStatus } = await execAsync('git status --porcelain');
        debug.gitStatus = gitStatus;
      } catch (error) {
        debug.gitStatusError = error.message;
      }

      try {
        const { stdout: currentCommit } = await execAsync('git rev-parse HEAD');
        debug.currentCommit = currentCommit.trim();
        debug.currentCommitShort = currentCommit.trim().substring(0, 7);
      } catch (error) {
        debug.currentCommitError = error.message;
      }

      try {
        const { stdout: branch } = await execAsync('git branch --show-current');
        debug.currentBranch = branch.trim();
      } catch (error) {
        debug.branchError = error.message;
      }

      try {
        const { stdout: remoteUrl } = await execAsync('git remote get-url origin');
        debug.remoteUrl = remoteUrl.trim();
      } catch (error) {
        debug.remoteError = error.message;
      }

      try {
        const { stdout: lastCommit } = await execAsync('git log -1 --oneline');
        debug.lastCommit = lastCommit.trim();
      } catch (error) {
        debug.lastCommitError = error.message;
      }
    }

    // Check environment variables
    debug.nodeEnv = process.env.NODE_ENV;
    debug.platform = process.platform;
    debug.nodeVersion = process.version;

    // Check if package.json has version
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      debug.packageVersion = packageJson.version;
    } catch (error) {
      debug.packageJsonError = error.message;
    }

    res.status(200).json({
      success: true,
      debug
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      debug
    });
  }
}