# Deployment Guide

This guide will help you deploy the Next.js Site Builder application on your server using Docker.

## Prerequisites

- Docker installed on your server ([Install Docker](https://docs.docker.com/engine/install/))
- Docker Compose installed ([Install Docker Compose](https://docs.docker.com/compose/install/))
- Minimum 2GB RAM
- 10GB free disk space

## Quick Start Deployment

### Step 1: Download the Deployment Files

You will receive:
- `docker-compose.deploy.yml` - Docker configuration file
- `.env.example` - Environment variables template
- The Docker image (either as a file or via Docker registry)

### Step 2: Setup Environment Variables

Create a `.env` file in your deployment directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Domain Configuration
DOMAIN=yourdomain.com

# Admin Settings
ADMIN_EMAIL=admin@yourdomain.com

# Security (Generate random strings for these)
JWT_SECRET=your-very-long-random-secret-string-here
SESSION_SECRET=another-very-long-random-secret-string-here

# Database
DATABASE_URL=file:/app/data/site_builder.db

# Optional: Email Configuration
RESEND_API_KEY=your-resend-api-key-if-using-email

# Optional: Other API Keys
UNSPLASH_ACCESS_KEY=your-unsplash-key
LEMON_SQUEEZY_API_KEY=your-lemon-squeezy-key
```

### Step 3: Load the Docker Image (if provided as a file)

If you received the image as a tar file:

```bash
docker load -i nextjs-site-builder.tar
```

If using Docker Hub/Registry:
```bash
docker pull your-registry/nextjs-site-builder:latest
```

### Step 4: Create Required Directories

```bash
mkdir -p data uploads logs
chmod 755 data uploads logs
```

### Step 5: Start the Application

```bash
docker-compose -f docker-compose.deploy.yml up -d
```

This will:
- Start the application in the background
- Expose it on port 3000
- Persist data in the `data` directory
- Persist uploads in the `uploads` directory

### Step 6: Verify Deployment

Check if the container is running:
```bash
docker ps
```

Check application logs:
```bash
docker logs -f nextjs-site-builder
```

Access the application:
```
http://your-server-ip:3000
```

## Production Setup with Nginx (Optional but Recommended)

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Configure Nginx as Reverse Proxy

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/nextjs-site-builder
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/nextjs-site-builder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Management Commands

### Stop the Application
```bash
docker-compose -f docker-compose.deploy.yml down
```

### Restart the Application
```bash
docker-compose -f docker-compose.deploy.yml restart
```

### View Logs
```bash
docker logs -f nextjs-site-builder
```

### Update to New Version
```bash
# Stop current version
docker-compose -f docker-compose.deploy.yml down

# Load new image
docker load -i nextjs-site-builder-new.tar

# Start new version
docker-compose -f docker-compose.deploy.yml up -d
```

### Backup Data
```bash
# Backup database and uploads
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

### Restore from Backup
```bash
# Stop the application first
docker-compose -f docker-compose.deploy.yml down

# Extract backup
tar -xzf backup-20240101.tar.gz

# Start the application
docker-compose -f docker-compose.deploy.yml up -d
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs nextjs-site-builder

# Check if port 3000 is available
sudo lsof -i :3000
```

### Permission Issues
```bash
# Fix permissions on data directories
sudo chown -R 1001:1001 data uploads logs
```

### Database Issues
```bash
# Rebuild the database (WARNING: This deletes all data!)
rm -rf data/site_builder.db
docker-compose -f docker-compose.deploy.yml restart
```

### Out of Memory
```bash
# Add memory limits to docker-compose.deploy.yml
# Under the 'app' service, add:
#   deploy:
#     resources:
#       limits:
#         memory: 2G
```

## Firewall Configuration

If using UFW:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Only if not using Nginx
```

## Security Best Practices

1. Always use strong, random values for JWT_SECRET and SESSION_SECRET
2. Never expose port 3000 directly to the internet (use Nginx)
3. Enable SSL/HTTPS using Let's Encrypt
4. Keep your Docker images updated
5. Regularly backup your data
6. Monitor logs for suspicious activity

## Support

For deployment assistance, contact: [your-support-email@example.com]
