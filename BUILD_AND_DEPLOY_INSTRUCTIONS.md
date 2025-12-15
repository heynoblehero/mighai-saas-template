# Build and Deploy Instructions (For You - The Developer)

This document explains how to build the Docker image and distribute it to clients without exposing your source code.

## Building the Secure Docker Image

### Method 1: Build the Image

```bash
# Build the secure Docker image (this protects your source code)
docker build -f Dockerfile.secure -t nextjs-site-builder:latest .
```

### Method 2: Build with Version Tag

```bash
# Build with version tag
docker build -f Dockerfile.secure -t nextjs-site-builder:1.0.0 .
docker tag nextjs-site-builder:1.0.0 nextjs-site-builder:latest
```

## Verify What's in the Image (Important!)

Before distributing, verify that source code is NOT included:

```bash
# Run a temporary container
docker run --rm -it nextjs-site-builder:latest /bin/sh

# Inside the container, check what files are present:
ls -la
# You should see: .next/, node_modules/, server.js, package.json
# You should NOT see: pages/, components/, styles/, or any .tsx/.jsx files

# Exit the container
exit
```

## Distribution Methods

### Option 1: Save as Tar File (Recommended for Private Distribution)

```bash
# Save the image to a tar file
docker save nextjs-site-builder:latest -o nextjs-site-builder.tar

# Compress it to reduce size
gzip nextjs-site-builder.tar
# This creates: nextjs-site-builder.tar.gz
```

Send the `.tar.gz` file to your client along with:
- `docker-compose.deploy.yml`
- `.env.example`
- `DEPLOYMENT_GUIDE.md`

### Option 2: Push to Private Docker Registry

#### Using Docker Hub (Private Repository)

```bash
# Login to Docker Hub
docker login

# Tag the image with your Docker Hub username
docker tag nextjs-site-builder:latest yourusername/nextjs-site-builder:latest

# Push to Docker Hub private repository
docker push yourusername/nextjs-site-builder:latest
```

Then provide clients with:
- Access credentials to your private repository
- `docker-compose.deploy.yml` (update image name to `yourusername/nextjs-site-builder:latest`)
- `.env.example`
- `DEPLOYMENT_GUIDE.md`

#### Using Private Registry (AWS ECR, Google Container Registry, etc.)

##### AWS ECR Example:
```bash
# Login to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag nextjs-site-builder:latest <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/nextjs-site-builder:latest

# Push to ECR
docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/nextjs-site-builder:latest
```

### Option 3: GitHub Container Registry (Private)

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag the image
docker tag nextjs-site-builder:latest ghcr.io/yourusername/nextjs-site-builder:latest

# Push to GitHub Container Registry
docker push ghcr.io/yourusername/nextjs-site-builder:latest
```

## Creating a Distribution Package

Create a complete package for clients:

```bash
# Create distribution directory
mkdir -p distribution

# Copy necessary files
cp docker-compose.deploy.yml distribution/
cp DEPLOYMENT_GUIDE.md distribution/
cp .env.example distribution/

# If using tar method, copy the image
cp nextjs-site-builder.tar.gz distribution/

# Create a zip file
cd distribution
zip -r ../client-deployment-package.zip .
cd ..
```

Send `client-deployment-package.zip` to your client.

## Environment Variables Template

Create `.env.example` for clients:

```bash
cat > .env.example << 'EOF'
# Domain Configuration
DOMAIN=yourdomain.com

# Admin Settings
ADMIN_EMAIL=admin@yourdomain.com

# Security Secrets (CHANGE THESE!)
JWT_SECRET=generate-a-random-string-here
SESSION_SECRET=generate-another-random-string-here

# Database Configuration
DATABASE_URL=file:/app/data/site_builder.db

# Optional: Email Service (Resend)
RESEND_API_KEY=

# Optional: Unsplash Integration
UNSPLASH_ACCESS_KEY=

# Optional: Payment Integration (Lemon Squeezy)
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_WEBHOOK_SECRET=

# Application Settings
NODE_ENV=production
PORT=3000
EOF
```

## Update Process (For New Versions)

When you release an update:

1. Build new version:
```bash
docker build -f Dockerfile.secure -t nextjs-site-builder:1.1.0 .
```

2. Save and distribute:
```bash
docker save nextjs-site-builder:1.1.0 -o nextjs-site-builder-v1.1.0.tar
gzip nextjs-site-builder-v1.1.0.tar
```

3. Provide update instructions to clients:
```markdown
# Update Instructions

1. Download the new image file: nextjs-site-builder-v1.1.0.tar.gz
2. Stop the current application:
   docker-compose -f docker-compose.deploy.yml down
3. Load the new image:
   gunzip nextjs-site-builder-v1.1.0.tar.gz
   docker load -i nextjs-site-builder-v1.1.0.tar
4. Start the updated application:
   docker-compose -f docker-compose.deploy.yml up -d
```

## Security Checklist

Before distributing, verify:

- [ ] Source code is NOT in the Docker image
- [ ] Only built files (.next) are included
- [ ] No .git directory in the image
- [ ] No development dependencies in the image
- [ ] Secrets are provided via environment variables, not hardcoded
- [ ] Image runs as non-root user (nextjs)
- [ ] Health check is configured

## Testing the Distribution Package

Before sending to clients, test it yourself:

```bash
# Remove local images to simulate client environment
docker rmi nextjs-site-builder:latest

# Load from tar file
gunzip -c nextjs-site-builder.tar.gz | docker load

# Test with docker-compose
docker-compose -f docker-compose.deploy.yml up

# Verify the application works
curl http://localhost:3000
```

## License Management (Optional)

To add license validation:

1. Generate unique license keys for each client
2. Add license validation in your `server.js`
3. Provide license key as environment variable:
```yaml
environment:
  - LICENSE_KEY=${LICENSE_KEY}
```

## Pricing Models

Consider these distribution models:

1. **One-time Purchase**: Single tar file, no updates
2. **Subscription**: Access to private registry + updates
3. **Per-Server License**: License key per deployment
4. **Source Code Access** (Premium): Charge extra for source code access

## Support

When providing support to clients:
- You can access their logs via docker commands
- You can update their deployment via new image distribution
- You never need to expose your source code
