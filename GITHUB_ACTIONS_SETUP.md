# GitHub Actions Setup for Docker Image Building

## Prerequisites

1. GitHub repository for saastemplate (https://github.com/heynoblehero/mighai-saas-template)
2. GitHub account with admin access to the repository

---

## Step 1: Enable GitHub Actions

1. Go to your repository on GitHub: https://github.com/heynoblehero/mighai-saas-template
2. Click **Settings** → **Actions** → **General**
3. Under "Actions permissions", select **Allow all actions and reusable workflows**
4. Click **Save**

---

## Step 2: Configure Container Registry Permissions

1. Still in Settings → **Actions** → **General**
2. Scroll to "Workflow permissions"
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

---

## Step 3: Push Workflow Files

The workflow files are already in the repository. Push them to trigger the first build:

```bash
cd /home/ishaan/Projects/mighai-test/saastemplate
git add .github/workflows/build-and-push.yml
git add .dockerignore
git add Dockerfile
git add GITHUB_ACTIONS_SETUP.md
git commit -m "Add Docker build and push workflow"
git push origin main
```

---

## Step 4: Monitor First Build

1. Go to **Actions** tab in your repository
2. You should see a workflow run starting automatically
3. Click on the run to see detailed logs
4. Wait for completion (typically 5-10 minutes for first build)
5. Subsequent builds will be faster (2-3 minutes) due to layer caching

---

## Step 5: Verify Docker Image

1. After successful build, go to your repository main page
2. On the right sidebar, click **Packages**
3. You should see `mighai-saas-template` package
4. Click on it to see available tags:
   - `latest` - latest build from main branch
   - `main-abc1234` - tagged with commit SHA
   - Any version tags you create (v1.0.0, etc.)

---

## Step 6: Make Image Public (Recommended)

By default, packages inherit repository visibility (private). To make the image public while keeping the repo private:

1. Go to the package page (https://github.com/users/heynoblehero/packages/container/mighai-saas-template)
2. Click **Package settings** (bottom right)
3. Scroll to **Danger Zone**
4. Click **Change visibility**
5. Select **Public**
6. Type package name `mighai-saas-template` to confirm
7. Click **I understand, change package visibility**

**Why make it public?**
- Your source code stays private in the repository
- Docker images can be pulled without authentication
- Easier for platform to deploy instances
- FREE unlimited pulls
- Docker images don't expose your source code directly

---

## Accessing the Image

Once published, your image will be available at:

```
ghcr.io/heynoblehero/mighai-saas-template:latest
ghcr.io/heynoblehero/mighai-saas-template:main-abc1234
```

### Test Pull Locally

```bash
# Pull the latest image
docker pull ghcr.io/heynoblehero/mighai-saas-template:latest

# Run locally for testing
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e ADMIN_EMAIL=admin@test.com \
  -e ADMIN_PASSWORD=testpass123 \
  ghcr.io/heynoblehero/mighai-saas-template:latest

# Visit http://localhost:3000 to verify
```

---

## Automatic Builds

The workflow will automatically build and push Docker images when:

1. **Push to main branch** → Tagged as `latest`
2. **Push to develop branch** → Tagged as `develop`
3. **Create git tag** (e.g., `v1.0.0`) → Tagged as `v1.0.0`, `v1.0`, and `latest`
4. **Open pull request** → Build only (no push) for testing

---

## Workflow Features

### Multi-Tag Strategy

Each build creates multiple tags for flexibility:

```
ghcr.io/heynoblehero/mighai-saas-template:latest
ghcr.io/heynoblehero/mighai-saas-template:main
ghcr.io/heynoblehero/mighai-saas-template:main-a1b2c3d
```

### Layer Caching

GitHub Actions cache is enabled for faster builds:
- First build: ~10 minutes
- Subsequent builds: ~2-3 minutes
- Cache is shared across workflow runs

### Build Attestation

Supply chain security with artifact attestation:
- Verifies build provenance
- Links image to source commit
- Enhances security and compliance

---

## Troubleshooting

### Error: "Resource not accessible by integration"

**Solution:**
- Check workflow permissions (Step 2)
- Ensure GITHUB_TOKEN has `packages:write` permission

### Error: "denied: permission_denied"

**Solution:**
- Package visibility might be private and requires authentication
- Follow Step 6 to make it public OR
- Configure registry authentication in platform deployment script

### Build Fails During npm install

**Solution:**
- Check `package.json` for syntax errors
- Ensure all dependencies are available in npm registry
- Check for private npm packages that require authentication

### Build Fails During npm run build

**Solution:**
- Verify Next.js configuration is correct
- Check for build errors in the logs
- Ensure all required files are included (not in `.dockerignore`)

### Image Not Appearing in Packages

**Solution:**
- Check Actions tab for failed builds
- Verify workflow file syntax with YAML validator
- Ensure branch name matches (main vs master)
- Check repository permissions for Actions

### Docker Pull Fails with Authentication Error

**Solution:**
1. If image is public: Make sure package visibility is set to Public (Step 6)
2. If image is private: Generate GitHub PAT and use it:
   ```bash
   # Create PAT with read:packages scope
   echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_USERNAME --password-stdin
   docker pull ghcr.io/heynoblehero/mighai-saas-template:latest
   ```

---

## Updating the Platform Configuration

After the Docker image is published, update your platform `.env`:

```bash
# Platform .env file
DOCKER_REGISTRY_URL=ghcr.io
DOCKER_IMAGE_NAME=ghcr.io/heynoblehero/mighai-saas-template:latest
DOCKER_REGISTRY_USERNAME=heynoblehero
DOCKER_REGISTRY_TOKEN=  # Empty for public images
```

---

## Deployment Workflow

When developers push changes:

1. Developer commits code changes
2. Push to main branch: `git push origin main`
3. GitHub Actions triggers automatically
4. Workflow builds Docker image (~2-3 min)
5. Image pushed to GitHub Container Registry
6. Tagged as `latest` and `main-<commit>`
7. **New instances automatically get latest code**
8. Existing instances continue running current version

---

## Versioning Strategy

### Development Workflow

```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature
# Open PR → Build runs but doesn't push

# Merge to develop
git checkout develop
git merge feature/new-feature
git push origin develop
# → Pushes image tagged as 'develop'

# Release to production
git checkout main
git merge develop
git tag v1.2.0
git push origin main --tags
# → Pushes image tagged as 'v1.2.0', 'v1.2', 'v1', and 'latest'
```

### Semantic Versioning

Use git tags for releases:

```bash
# Major version (breaking changes)
git tag v2.0.0

# Minor version (new features)
git tag v1.3.0

# Patch version (bug fixes)
git tag v1.2.1

# Push tags
git push origin --tags
```

Each tag creates multiple Docker tags:
- `v1.2.1` → `1.2.1`, `1.2`, `1`
- Makes it easy to pin to major or minor versions

---

## Monitoring Builds

### GitHub Actions Dashboard

View all builds at:
https://github.com/heynoblehero/mighai-saas-template/actions

### Build Status Badge

Add to your README.md:

```markdown
![Docker Build Status](https://github.com/heynoblehero/mighai-saas-template/actions/workflows/build-and-push.yml/badge.svg)
```

### Email Notifications

1. Go to GitHub Settings → Notifications
2. Enable "Actions" notifications
3. Get notified on build failures

---

## Security Best Practices

### 1. Keep Secrets Out of Docker Images

- Never include `.env` files in images (use `.dockerignore`)
- Pass secrets as environment variables at runtime
- Use Docker secrets for sensitive data in production

### 2. Scan Images for Vulnerabilities

Enable GitHub security features:
1. Settings → Code security and analysis
2. Enable **Dependabot alerts**
3. Enable **Dependabot security updates**
4. Enable **Code scanning**

### 3. Use Minimal Base Images

The Dockerfile uses `node:20-alpine`:
- Smaller attack surface
- Faster pulls
- Lower storage costs

### 4. Regular Updates

Keep dependencies updated:
```bash
npm outdated
npm update
npm audit fix
```

---

## Cost Analysis

### GitHub Actions (Free Tier)
- 2000 minutes/month for private repos
- Unlimited for public repos
- Each build: ~3-5 minutes
- **Estimated capacity: 400+ builds/month (FREE)**

### GitHub Container Registry
- Unlimited public images (FREE)
- 500MB free storage for private images
- Unlimited bandwidth for public images
- **Recommended: Use public images (FREE)**

### Total Cost: $0/month

---

## Support Resources

- **GitHub Actions Documentation:** https://docs.github.com/en/actions
- **GitHub Packages Documentation:** https://docs.github.com/en/packages
- **Docker Documentation:** https://docs.docker.com/
- **Workflow Syntax:** https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

---

## Next Steps

After setup is complete:

1. ✓ GitHub Actions configured
2. ✓ First Docker image built and published
3. ✓ Image visibility set to public
4. → Update platform to use Docker deployment (Phase 3)
5. → Test instance provisioning with Docker images
6. → Monitor deployment times and success rates

---

**Setup Status Checklist:**

- [ ] GitHub Actions enabled
- [ ] Workflow permissions configured (read/write)
- [ ] Workflow files committed and pushed
- [ ] First build completed successfully
- [ ] Docker image visible in Packages
- [ ] Package visibility set to Public
- [ ] Image pullable without authentication
- [ ] Platform .env updated with Docker image URL
- [ ] Local test pull successful

Once all items are checked, proceed to Phase 3: Platform Updates.
