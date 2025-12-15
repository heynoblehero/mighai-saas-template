#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const DigitalOceanAPI = require('./digitalocean-api');

class ResourceCleanup {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.config = null;
        this.deploymentState = null;
        this.doAPI = null;
    }

    async question(query) {
        return new Promise(resolve => {
            this.rl.question(query, resolve);
        });
    }

    async loadDeploymentState() {
        try {
            const statePath = path.join(process.cwd(), 'deployment-state.json');
            const stateContent = await fs.readFile(statePath, 'utf8');
            this.deploymentState = JSON.parse(stateContent);
            console.log('✅ Deployment state loaded');
            return true;
        } catch (error) {
            console.log('⚠️ Could not load deployment state:', error.message);
            return false;
        }
    }

    async loadConfig() {
        try {
            const configPath = path.join(process.cwd(), 'deployment-config.json');
            const configContent = await fs.readFile(configPath, 'utf8');
            this.config = JSON.parse(configContent);
            console.log('✅ Configuration loaded');
            return true;
        } catch (error) {
            console.log('⚠️ Could not load configuration:', error.message);
            return false;
        }
    }

    async initializeAPI() {
        if (!this.config || !this.config.doToken) {
            const token = await this.question('Enter your DigitalOcean API token: ');
            this.doAPI = new DigitalOceanAPI(token);
        } else {
            this.doAPI = new DigitalOceanAPI(this.config.doToken);
        }

        const isValid = await this.doAPI.validateToken();
        if (!isValid) {
            throw new Error('Invalid DigitalOcean API token');
        }

        console.log('✅ DigitalOcean API initialized');
    }

    async showResourceSummary() {
        console.log('\n📋 Resources to be cleaned up:');
        console.log('═'.repeat(50));

        if (this.deploymentState?.resources) {
            const resources = this.deploymentState.resources;

            if (resources.droplet) {
                console.log(`🖥️  Droplet: ${resources.droplet.name} (${resources.droplet.id})`);
                if (resources.droplet.networks?.v4?.[0]) {
                    console.log(`   IP: ${resources.droplet.networks.v4[0].ip_address}`);
                }
            }

            if (resources.database) {
                if (resources.database.type === 'managed') {
                    console.log(`🗄️  Database: ${resources.database.id} (Managed PostgreSQL)`);
                } else {
                    console.log(`🗄️  Database: Local PostgreSQL (will be removed with droplet)`);
                }
            }

            if (resources.firewall) {
                console.log(`🛡️  Firewall: ${resources.firewall.name} (${resources.firewall.id})`);
            }

            if (resources.domain) {
                console.log(`🌐 Domain: ${resources.domain.name}`);
            }

            if (resources.certificate) {
                console.log(`🔒 SSL Certificate: ${resources.certificate.name} (${resources.certificate.id})`);
            }

            if (resources.loadBalancer) {
                console.log(`⚖️  Load Balancer: ${resources.loadBalancer.name} (${resources.loadBalancer.id})`);
            }

            if (resources.sshKey) {
                console.log(`🔑 SSH Key: ${resources.sshKey.name} (${resources.sshKey.id})`);
            }
        } else {
            console.log('⚠️ No deployment state found. Manual resource identification required.');
        }

        console.log('═'.repeat(50));
    }

    async confirmCleanup() {
        const confirm = await this.question('\n⚠️  Are you sure you want to delete these resources? This action cannot be undone. (yes/no): ');
        
        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Cleanup cancelled');
            return false;
        }

        const doubleConfirm = await this.question('Type "DELETE" to confirm deletion: ');
        
        if (doubleConfirm !== 'DELETE') {
            console.log('❌ Cleanup cancelled - confirmation text did not match');
            return false;
        }

        return true;
    }

    async cleanupResources() {
        console.log('\n🧹 Starting resource cleanup...');

        const errors = [];

        try {
            // Set resources on API client
            if (this.deploymentState?.resources) {
                this.doAPI.resources = this.deploymentState.resources;
            }

            // Delete resources in reverse order of creation
            
            // 1. Load Balancer (if exists)
            if (this.deploymentState?.resources?.loadBalancer) {
                try {
                    await this.doAPI.deleteLoadBalancer(this.deploymentState.resources.loadBalancer.id);
                    console.log('✅ Load balancer deleted');
                } catch (error) {
                    console.log('❌ Failed to delete load balancer:', error.message);
                    errors.push(`Load Balancer: ${error.message}`);
                }
            }

            // 2. Certificate (if exists)
            if (this.deploymentState?.resources?.certificate) {
                try {
                    await this.doAPI.makeRequest('DELETE', `/certificates/${this.deploymentState.resources.certificate.id}`);
                    console.log('✅ SSL certificate deleted');
                } catch (error) {
                    console.log('❌ Failed to delete certificate:', error.message);
                    errors.push(`Certificate: ${error.message}`);
                }
            }

            // 3. Firewall
            if (this.deploymentState?.resources?.firewall) {
                try {
                    await this.doAPI.deleteFirewall(this.deploymentState.resources.firewall.id);
                    console.log('✅ Firewall deleted');
                } catch (error) {
                    console.log('❌ Failed to delete firewall:', error.message);
                    errors.push(`Firewall: ${error.message}`);
                }
            }

            // 4. Droplet
            if (this.deploymentState?.resources?.droplet) {
                try {
                    await this.doAPI.deleteDroplet(this.deploymentState.resources.droplet.id);
                    console.log('✅ Droplet deleted');
                } catch (error) {
                    console.log('❌ Failed to delete droplet:', error.message);
                    errors.push(`Droplet: ${error.message}`);
                }
            }

            // 5. Database (if managed)
            if (this.deploymentState?.resources?.database?.type === 'managed') {
                try {
                    await this.doAPI.deleteDatabase(this.deploymentState.resources.database.id);
                    console.log('✅ Managed database deleted');
                } catch (error) {
                    console.log('❌ Failed to delete database:', error.message);
                    errors.push(`Database: ${error.message}`);
                }
            }

            // 6. Domain (optional - user may want to keep)
            if (this.deploymentState?.resources?.domain) {
                const deleteDomain = await this.question(`\n🌐 Delete domain ${this.deploymentState.resources.domain.name}? (y/n): `);
                if (deleteDomain.toLowerCase() === 'y') {
                    try {
                        await this.doAPI.deleteDomain(this.deploymentState.resources.domain.name);
                        console.log('✅ Domain deleted');
                    } catch (error) {
                        console.log('❌ Failed to delete domain:', error.message);
                        errors.push(`Domain: ${error.message}`);
                    }
                } else {
                    console.log('⚠️ Domain kept - you can delete it manually later');
                }
            }

            // 7. SSH Key (optional - user may want to keep)
            if (this.deploymentState?.resources?.sshKey) {
                const deleteSSHKey = await this.question(`\n🔑 Delete SSH key ${this.deploymentState.resources.sshKey.name}? (y/n): `);
                if (deleteSSHKey.toLowerCase() === 'y') {
                    try {
                        await this.doAPI.makeRequest('DELETE', `/ssh_keys/${this.deploymentState.resources.sshKey.id}`);
                        console.log('✅ SSH key deleted');
                    } catch (error) {
                        console.log('❌ Failed to delete SSH key:', error.message);
                        errors.push(`SSH Key: ${error.message}`);
                    }
                } else {
                    console.log('⚠️ SSH key kept - you can delete it manually later');
                }
            }

        } catch (error) {
            console.error('❌ Cleanup process failed:', error.message);
            errors.push(`General: ${error.message}`);
        }

        return errors;
    }

    async cleanupLocalFiles() {
        console.log('\n🗂️ Cleaning up local deployment files...');

        const filesToClean = [
            'deployment-config.json',
            'deployment-state.json',
            'deploy-package'
        ];

        for (const file of filesToClean) {
            try {
                const filePath = path.join(process.cwd(), file);
                const stats = await fs.stat(filePath);
                
                if (stats.isDirectory()) {
                    await fs.rmdir(filePath, { recursive: true });
                    console.log(`✅ Removed directory: ${file}`);
                } else {
                    await fs.unlink(filePath);
                    console.log(`✅ Removed file: ${file}`);
                }
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.log(`⚠️ Could not remove ${file}:`, error.message);
                }
            }
        }
    }

    async manualCleanup() {
        console.log('\n🔧 Manual Resource Cleanup');
        console.log('Enter resource IDs to delete them manually:');

        const resourceTypes = [
            { name: 'Droplet', endpoint: 'droplets' },
            { name: 'Database', endpoint: 'databases' },
            { name: 'Firewall', endpoint: 'firewalls' },
            { name: 'Load Balancer', endpoint: 'load_balancers' },
            { name: 'Domain', endpoint: 'domains' }
        ];

        for (const resourceType of resourceTypes) {
            const resourceId = await this.question(`${resourceType.name} ID (press Enter to skip): `);
            
            if (resourceId.trim()) {
                try {
                    if (resourceType.name === 'Domain') {
                        await this.doAPI.deleteDomain(resourceId);
                    } else {
                        await this.doAPI.makeRequest('DELETE', `/${resourceType.endpoint}/${resourceId}`);
                    }
                    console.log(`✅ ${resourceType.name} ${resourceId} deleted`);
                } catch (error) {
                    console.log(`❌ Failed to delete ${resourceType.name}:`, error.message);
                }
            }
        }
    }

    async run() {
        try {
            console.log('🧹 DigitalOcean Resource Cleanup Tool');
            console.log('═'.repeat(50));

            // Try to load deployment state and config
            const hasState = await this.loadDeploymentState();
            const hasConfig = await this.loadConfig();

            if (!hasState && !hasConfig) {
                console.log('⚠️ No deployment files found.');
                const manual = await this.question('Would you like to manually specify resources to delete? (y/n): ');
                
                if (manual.toLowerCase() === 'y') {
                    await this.initializeAPI();
                    await this.manualCleanup();
                    return;
                } else {
                    console.log('❌ Cleanup cancelled');
                    return;
                }
            }

            await this.initializeAPI();
            await this.showResourceSummary();

            const confirmed = await this.confirmCleanup();
            if (!confirmed) {
                return;
            }

            const errors = await this.cleanupResources();

            // Ask about local files
            const cleanLocal = await this.question('\n🗂️ Clean up local deployment files? (y/n): ');
            if (cleanLocal.toLowerCase() === 'y') {
                await this.cleanupLocalFiles();
            }

            console.log('\n🎉 Cleanup process completed!');

            if (errors.length > 0) {
                console.log('\n⚠️ Some resources could not be deleted:');
                errors.forEach(error => console.log(`  - ${error}`));
                console.log('\nYou may need to delete these manually from the DigitalOcean control panel.');
            } else {
                console.log('✅ All resources were successfully deleted');
            }

        } catch (error) {
            console.error('\n❌ Cleanup failed:', error.message);
        } finally {
            this.rl.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const cleanup = new ResourceCleanup();
    cleanup.run()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Cleanup failed:', error.message);
            process.exit(1);
        });
}

module.exports = ResourceCleanup;