#!/usr/bin/env node

/**
 * Domain and SSL Setup Script
 * This script helps you configure domain and SSL for your existing deployment
 */

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

class DomainSSLSetup {
  constructor() {
    this.config = {
      serverIP: null,
      domain: null,
      email: null,
      enableWWW: true
    };
  }

  async run() {
    console.log('🌐 Domain and SSL Setup for Mighai');
    console.log('═'.repeat(50));
    
    try {
      await this.collectInformation();
      await this.showDNSInstructions();
      await this.waitForDNSPropagation();
      await this.setupNginxConfig();
      await this.setupSSLCertificate();
      await this.showCompletionSummary();
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async collectInformation() {
    console.log('📋 Please provide the following information:\n');
    
    // Get server IP
    this.config.serverIP = await ask('🔍 Server IP Address (e.g., 165.227.196.152): ');
    if (!this.isValidIP(this.config.serverIP)) {
      throw new Error('Invalid IP address format');
    }
    
    // Get domain
    this.config.domain = await ask('🌐 Your Domain (e.g., myapp.com): ');
    if (!this.isValidDomain(this.config.domain)) {
      throw new Error('Invalid domain format');
    }
    
    // Get email for SSL
    this.config.email = await ask('📧 Email for SSL certificate (e.g., admin@myapp.com): ');
    if (!this.isValidEmail(this.config.email)) {
      throw new Error('Invalid email format');
    }
    
    // Ask about www subdomain
    const includeWWW = await ask('🌍 Include www subdomain? (y/n) [y]: ');
    this.config.enableWWW = includeWWW.toLowerCase() !== 'n';
    
    console.log('\n✅ Configuration collected:');
    console.log(`   Server IP: ${this.config.serverIP}`);
    console.log(`   Domain: ${this.config.domain}`);
    console.log(`   WWW: ${this.config.enableWWW ? 'Yes' : 'No'}`);
    console.log(`   SSL Email: ${this.config.email}\n`);
  }

  async showDNSInstructions() {
    console.log('📋 DNS CONFIGURATION REQUIRED');
    console.log('═'.repeat(50));
    console.log('Please add these DNS records to your domain registrar:\n');
    
    console.log(`🔸 A Record:`);
    console.log(`   Name: @ (or root/apex)`);
    console.log(`   Value: ${this.config.serverIP}`);
    console.log(`   TTL: 300 (5 minutes)\n`);
    
    if (this.config.enableWWW) {
      console.log(`🔸 A Record for www:`);
      console.log(`   Name: www`);
      console.log(`   Value: ${this.config.serverIP}`);
      console.log(`   TTL: 300 (5 minutes)\n`);
    }
    
    console.log('🎯 Common DNS providers instructions:');
    console.log('   • GoDaddy: Go to DNS Management → Add Record');
    console.log('   • Namecheap: Go to Domain List → Manage → Advanced DNS');
    console.log('   • Cloudflare: Go to DNS → Add Record');
    console.log('   • Google Domains: Go to DNS → Custom Records\n');
  }

  async waitForDNSPropagation() {
    console.log('⏳ Waiting for DNS propagation...\n');
    
    const ready = await ask('Have you added the DNS records? Press Enter when ready or type "skip" to continue: ');
    if (ready.toLowerCase() === 'skip') {
      console.log('⚠️  Skipping DNS check - SSL setup may fail\n');
      return;
    }
    
    console.log('🔍 Checking DNS propagation...');
    
    let attempts = 0;
    const maxAttempts = 12; // 2 minutes
    
    while (attempts < maxAttempts) {
      try {
        const result = execSync(`dig +short ${this.config.domain}`, { encoding: 'utf8' });
        const resolvedIP = result.trim();
        
        if (resolvedIP === this.config.serverIP) {
          console.log('✅ DNS propagation complete!\n');
          return;
        }
        
        console.log(`🔄 DNS not propagated yet (got: ${resolvedIP || 'no result'}), waiting...`);
      } catch (error) {
        console.log('🔄 DNS lookup failed, waiting...');
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    
    console.log('⚠️  DNS propagation taking longer than expected, continuing anyway...\n');
  }

  async setupNginxConfig() {
    console.log('🔧 Setting up Nginx configuration...');
    
    const nginxConfig = this.generateNginxConfig();
    
    try {
      // Upload nginx config
      console.log('📤 Uploading Nginx configuration...');
      const tempFile = `/tmp/nginx-${this.config.domain}.conf`;
      fs.writeFileSync(tempFile, nginxConfig);
      
      execSync(`scp -o StrictHostKeyChecking=no ${tempFile} root@${this.config.serverIP}:/etc/nginx/sites-available/${this.config.domain}`);
      
      // Enable site and reload nginx
      const commands = [
        `ln -sf /etc/nginx/sites-available/${this.config.domain} /etc/nginx/sites-enabled/`,
        'nginx -t', // Test configuration
        'systemctl reload nginx'
      ];
      
      for (const cmd of commands) {
        execSync(`ssh -o StrictHostKeyChecking=no root@${this.config.serverIP} "${cmd}"`);
      }
      
      console.log('✅ Nginx configuration completed\n');
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
    } catch (error) {
      throw new Error(`Nginx setup failed: ${error.message}`);
    }
  }

  async setupSSLCertificate() {
    console.log('🔒 Setting up SSL certificate with Let\'s Encrypt...');
    
    try {
      const domains = [this.config.domain];
      if (this.config.enableWWW) {
        domains.push(`www.${this.config.domain}`);
      }
      
      const domainArgs = domains.map(d => `-d ${d}`).join(' ');
      
      const sslCommands = [
        'apt-get update',
        'apt-get install -y certbot python3-certbot-nginx',
        `certbot --nginx ${domainArgs} --non-interactive --agree-tos --email ${this.config.email} --redirect`,
        'systemctl enable certbot.timer', // Auto-renewal
        'systemctl start certbot.timer'
      ];
      
      for (const cmd of sslCommands) {
        console.log(`🔄 Running: ${cmd.split(' ').slice(0, 3).join(' ')}...`);
        execSync(`ssh -o StrictHostKeyChecking=no root@${this.config.serverIP} "${cmd}"`, { 
          stdio: 'pipe' 
        });
      }
      
      console.log('✅ SSL certificate installed and configured!\n');
      
    } catch (error) {
      console.log('⚠️  SSL setup failed:', error.message);
      console.log('💡 You can try running certbot manually later:\n');
      console.log(`   ssh root@${this.config.serverIP}`);
      console.log(`   certbot --nginx -d ${this.config.domain} ${this.config.enableWWW ? `-d www.${this.config.domain}` : ''}\n`);
    }
  }

  generateNginxConfig() {
    const wwwRedirect = this.config.enableWWW ? `
# Redirect www to non-www
server {
    listen 80;
    listen 443 ssl http2;
    server_name www.${this.config.domain};
    return 301 https://${this.config.domain}$request_uri;
}` : '';

    return `# Mighai - ${this.config.domain}
${wwwRedirect}

server {
    listen 80;
    server_name ${this.config.domain};
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Let's Encrypt will handle SSL redirection
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3000;
    }
}`;
  }

  async showCompletionSummary() {
    console.log('🎉 DOMAIN AND SSL SETUP COMPLETE!');
    console.log('═'.repeat(50));
    
    const protocol = 'https';
    console.log(`🌐 Your site is now available at:`);
    console.log(`   Primary: ${protocol}://${this.config.domain}`);
    
    if (this.config.enableWWW) {
      console.log(`   Redirect: www.${this.config.domain} → ${this.config.domain}`);
    }
    
    console.log(`\n🔧 Admin panel: ${protocol}://${this.config.domain}/admin`);
    console.log(`📧 SSL certificate email: ${this.config.email}`);
    console.log(`🔄 Auto-renewal: Enabled (certbot.timer)\n`);
    
    console.log('📋 Next Steps:');
    console.log('1. Visit your domain to verify SSL is working');
    console.log('2. Check that admin panel is accessible');
    console.log('3. Update any hardcoded URLs in your app');
    console.log('4. Set up monitoring for certificate expiration\n');
    
    console.log('🔍 Troubleshooting:');
    console.log(`• Check site status: curl -I https://${this.config.domain}`);
    console.log(`• View nginx logs: ssh root@${this.config.serverIP} "tail -f /var/log/nginx/error.log"`);
    console.log(`• Check SSL: ssh root@${this.config.serverIP} "certbot certificates"\n`);
    
    console.log('✅ Domain and SSL setup completed successfully!');
  }

  isValidIP(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  }

  isValidDomain(domain) {
    return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(domain);
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new DomainSSLSetup();
  setup.run();
}

module.exports = DomainSSLSetup;