#!/usr/bin/env node

/**
 * Dependency Security Scanner & Audit System
 * Comprehensive security analysis for all dependencies
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const https = require('https');

class DependencySecurityScanner {
    constructor(options = {}) {
        this.options = {
            auditLevel: 'moderate', // low, moderate, high, critical
            checkLicenses: true,
            checkOutdated: true,
            autoFix: false,
            jsonOutput: false,
            excludeDevDeps: false,
            timeout: 300000,
            ...options
        };
        
        this.results = {
            vulnerabilities: [],
            licenses: [],
            outdated: [],
            recommendations: [],
            summary: {
                totalPackages: 0,
                vulnerablePackages: 0,
                outdatedPackages: 0,
                complianceIssues: 0,
                securityScore: 100,
                lastUpdated: new Date().toISOString()
            }
        };
    }

    async scan() {
        console.log('🔍 Starting Dependency Security Scan...\n');
        
        try {
            // Find all package.json files
            const packageFiles = this.findPackageFiles();
            console.log(`📦 Found ${packageFiles.length} package.json files\n`);
            
            // Scan each package
            for (const packageFile of packageFiles) {
                await this.scanPackage(packageFile);
            }
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Generate security score
            this.calculateSecurityScore();
            
            // Output results
            this.outputResults();
            
            return this.results;
            
        } catch (error) {
            console.error('❌ Scan failed:', error.message);
            throw error;
        }
    }

    findPackageFiles() {
        const packages = [];
        const walk = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.') && 
                    entry.name !== 'node_modules' && entry.name !== 'dist') {
                    walk(fullPath);
                } else if (entry.name === 'package.json') {
                    packages.push(fullPath);
                }
            }
        };
        
        walk(process.cwd());
        return packages;
    }

    async scanPackage(packageFile) {
        console.log(`🔍 Scanning: ${packageFile}`);
        
        const packageDir = path.dirname(packageFile);
        const packageName = this.getPackageName(packageFile);
        
        try {
            // Install dependencies if not exists
            await this.ensureDependencies(packageDir);
            
            // Vulnerability audit
            await this.auditVulnerabilities(packageDir);
            
            // License check
            if (this.options.checkLicenses) {
                await this.checkLicenses(packageDir);
            }
            
            // Outdated check
            if (this.options.checkOutdated) {
                await this.checkOutdated(packageDir);
            }
            
            console.log(`✅ Completed: ${packageName}\n`);
            
        } catch (error) {
            console.error(`❌ Failed: ${packageName} - ${error.message}\n`);
            this.results.vulnerabilities.push({
                package: packageName,
                error: error.message,
                severity: 'high'
            });
        }
    }

    async ensureDependencies(packageDir) {
        try {
            // Check if node_modules exists
            const nodeModulesPath = path.join(packageDir, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
                console.log('📥 Installing dependencies...');
                execSync('npm install', { 
                    cwd: packageDir,
                    stdio: 'inherit',
                    timeout: this.options.timeout
                });
            }
        } catch (error) {
            console.log('⚠️ Dependency installation failed, continuing with audit...');
        }
    }

    async auditVulnerabilities(packageDir) {
        try {
            console.log('🔍 Auditing vulnerabilities...');
            
            const auditOutput = execSync(`npm audit --audit-level=${this.options.auditLevel} --json`, {
                cwd: packageDir,
                timeout: this.options.timeout,
                encoding: 'utf8'
            });
            
            const auditResult = JSON.parse(auditOutput);
            
            if (auditResult.vulnerabilities) {
                Object.entries(auditResult.vulnerabilities).forEach(([name, vuln]) => {
                    this.results.vulnerabilities.push({
                        package: name,
                        severity: vuln.severity,
                        title: vuln.title || 'Security Vulnerability',
                        url: vuln.url,
                        range: vuln.range,
                        fixAvailable: vuln.fixAvailable,
                        dependencyOf: vuln.dependencyOf,
                        path: vuln.path,
                        requires: vuln.requires,
                       透过: vuln.via,
                        nodeVersion: vuln.nodeVersion,
                        npmVersion: vuln.npmVersion,
                        packageDir
                    });
                });
            }
            
            // Auto-fix if requested
            if (this.options.autoFix) {
                try {
                    execSync('npm audit fix', { 
                        cwd: packageDir,
                        stdio: 'inherit'
                    });
                    console.log('✅ Auto-fix applied');
                } catch (fixError) {
                    console.log('⚠️ Auto-fix failed');
                }
            }
            
        } catch (error) {
            // NPM audit returns non-zero exit codes for vulnerabilities
            if (error.stdout) {
                try {
                    const auditResult = JSON.parse(error.stdout);
                    if (auditResult.vulnerabilities) {
                        Object.entries(auditResult.vulnerabilities).forEach(([name, vuln]) => {
                            this.results.vulnerabilities.push({
                                package: name,
                                severity: vuln.severity,
                                title: vuln.title || 'Security Vulnerability',
                                url: vuln.url,
                                range: vuln.range,
                                fixAvailable: vuln.fixAvailable,
                                dependencyOf: vuln.dependencyOf,
                                path: vuln.path,
                                requires: vuln.requires,
                               透过: vuln.via,
                                nodeVersion: vuln.nodeVersion,
                                npmVersion: vuln.npmVersion,
                                packageDir
                            });
                        });
                    }
                } catch (parseError) {
                    console.log('⚠️ Could not parse audit output');
                }
            }
        }
    }

    async checkLicenses(packageDir) {
        try {
            console.log('📜 Checking licenses...');
            
            const licenseOutput = execSync('npm list --depth=0 --json', {
                cwd: packageDir,
                timeout: this.options.timeout,
                encoding: 'utf8'
            });
            
            const packages = JSON.parse(licenseOutput);
            
            if (packages.dependencies) {
                Object.entries(packages.dependencies).forEach(([name, version]) => {
                    this.results.licenses.push({
                        package: name,
                        version: version.version || version,
                        license: this.getLicenseFromNPM(name),
                        complianceStatus: this.checkLicenseCompliance(name)
                    });
                });
            }
            
        } catch (error) {
            console.log('⚠️ License check failed');
        }
    }

    async checkOutdated(packageDir) {
        try {
            console.log('⏰ Checking outdated packages...');
            
            const outdatedOutput = execSync('npm outdated --json', {
                cwd: packageDir,
                timeout: this.options.timeout,
                encoding: 'utf8'
            });
            
            const outdated = JSON.parse(outdatedOutput);
            
            Object.entries(outdated).forEach(([name, info]) => {
                this.results.outdated.push({
                    package: name,
                    current: info.current,
                    wanted: info.wanted,
                    latest: info.latest,
                    location: info.location,
                    dependencyType: info.dependencyType
                });
            });
            
        } catch (error) {
            // npm outdated returns non-zero if everything is up-to-date
            if (!error.stdout) {
                console.log('✅ All packages are up-to-date');
            }
        }
    }

    getPackageName(packageFile) {
        try {
            const content = fs.readFileSync(packageFile, 'utf8');
            const pkg = JSON.parse(content);
            return pkg.name || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    getLicenseFromNPM(packageName) {
        return new Promise((resolve) => {
            https.get(`https://registry.npmjs.org/${packageName}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const info = JSON.parse(data);
                        resolve(info.license || 'unknown');
                    } catch (error) {
                        resolve('unknown');
                    }
                });
            }).on('error', () => resolve('unknown'));
        });
    }

    checkLicenseCompliance(packageName) {
        // Example compliance check - customize based on your policies
        const restrictedLicenses = ['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'];
        const allowedLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC', 'Unlicense'];
        
        // This would be async in real implementation
        // For now, return a placeholder
        return {
            status: 'unknown',
            restricted: false,
            compatible: true
        };
    }

    generateRecommendations() {
        console.log('💡 Generating recommendations...');
        
        // Security recommendations
        if (this.results.vulnerabilities.length > 0) {
            const critical = this.results.vulnerabilities.filter(v => v.severity === 'critical');
            const high = this.results.vulnerabilities.filter(v => v.severity === 'high');
            
            if (critical.length > 0) {
                this.results.recommendations.push({
                    type: 'critical',
                    title: 'Critical Security Vulnerabilities Found',
                    description: `${critical.length} packages have critical vulnerabilities`,
                    action: 'Update immediately',
                    priority: 1
                });
            }
            
            if (high.length > 0) {
                this.results.recommendations.push({
                    type: 'high',
                    title: 'High-Severity Security Issues',
                    description: `${high.length} packages have high-severity vulnerabilities`,
                    action: 'Update within 24 hours',
                    priority: 2
                });
            }
        }
        
        // Outdated recommendations
        if (this.results.outdated.length > 0) {
            this.results.recommendations.push({
                type: 'maintenance',
                title: 'Outdated Packages Detected',
                description: `${this.results.outdated.length} packages are outdated`,
                action: 'Review and update outdated packages',
                priority: 3
            });
        }
        
        // General recommendations
        this.results.recommendations.push({
            type: 'best-practice',
            title: 'Regular Security Audits',
            description: 'Implement automated security scanning in CI/CD pipeline',
            action: 'Add security scanning to your deployment workflow',
            priority: 4
        });
        
        this.results.recommendations.sort((a, b) => a.priority - b.priority);
    }

    calculateSecurityScore() {
        const { vulnerabilities, outdated } = this.results;
        const totalPackages = vulnerabilities.length + outdated.length + 10; // Base score
        
        let score = 100;
        
        // Deduct points for vulnerabilities
        vulnerabilities.forEach(vuln => {
            switch (vuln.severity) {
                case 'critical': score -= 25; break;
                case 'high': score -= 15; break;
                case 'moderate': score -= 10; break;
                case 'low': score -= 5; break;
            }
        });
        
        // Deduct points for outdated packages
        score -= Math.min(outdated.length * 2, 30);
        
        // Ensure score doesn't go below 0
        this.results.summary.securityScore = Math.max(score, 0);
    }

    outputResults() {
        console.log('\n📊 SECURITY SCAN RESULTS');
        console.log('=' .repeat(50));
        
        // Summary
        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total Packages: ${this.results.summary.totalPackages}`);
        console.log(`   Vulnerable Packages: ${this.results.vulnerabilities.length}`);
        console.log(`   Outdated Packages: ${this.results.outdated.length}`);
        console.log(`   Security Score: ${this.results.summary.securityScore}/100`);
        
        // Vulnerabilities
        if (this.results.vulnerabilities.length > 0) {
            console.log(`\n🚨 VULNERABILITIES:`);
            this.results.vulnerabilities.forEach(vuln => {
                const emoji = vuln.severity === 'critical' ? '💥' : 
                             vuln.severity === 'high' ? '⚠️' : 
                             vuln.severity === 'moderate' ? '🟡' : '🟢';
                console.log(`   ${emoji} ${vuln.package}: ${vuln.severity.toUpperCase()}`);
                if (vuln.title) console.log(`      ${vuln.title}`);
            });
        }
        
        // Recommendations
        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 RECOMMENDATIONS:`);
            this.results.recommendations.forEach(rec => {
                const emoji = rec.type === 'critical' ? '🚨' : 
                             rec.type === 'high' ? '⚠️' : '💡';
                console.log(`   ${emoji} ${rec.title}`);
                console.log(`      ${rec.description}`);
                console.log(`      Action: ${rec.action}\n`);
            });
        }
        
        // JSON output if requested
        if (this.options.jsonOutput) {
            console.log('\n📄 JSON OUTPUT:');
            console.log(JSON.stringify(this.results, null, 2));
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        auditLevel: args.includes('--audit-level') ? 
            args[args.indexOf('--audit-level') + 1] : 'moderate',
        checkLicenses: !args.includes('--no-licenses'),
        checkOutdated: !args.includes('--no-outdated'),
        autoFix: args.includes('--fix'),
        jsonOutput: args.includes('--json'),
        excludeDevDeps: args.includes('--exclude-dev')
    };
    
    const scanner = new DependencySecurityScanner(options);
    scanner.scan().catch(error => {
        console.error('Scan failed:', error);
        process.exit(1);
    });
}

module.exports = DependencySecurityScanner;