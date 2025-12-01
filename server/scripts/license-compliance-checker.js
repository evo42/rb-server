#!/usr/bin/env node

/**
 * License Compliance Checker
 * Comprehensive license analysis and compliance verification
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class LicenseComplianceChecker {
    constructor(options = {}) {
        this.options = {
            outputFormat: 'console', // console, json, csv, html
            checkRecursively: true,
            includeDevDependencies: false,
            allowedLicenses: [
                'MIT',
                'Apache-2.0',
                'Apache 2.0',
                'BSD-2-Clause',
                'BSD-3-Clause',
                'ISC',
                'Unlicense',
                'CC0-1.0',
                '0BSD',
                'WTFPL'
            ],
            restrictedLicenses: [
                'GPL-2.0',
                'GPL-3.0',
                'AGPL-3.0',
                'LGPL-2.1',
                'LGPL-3.0',
                'MPL-2.0',
                'SSPL-1.0'
            ],
            warnLicenses: [
                'EPL-2.0',
                'CDDL-1.0',
                'Artistic-2.0'
            ],
            customRules: {},
            timeout: 30000,
            ...options
        };

        this.results = {
            packages: [],
            compliance: {
                compliant: [],
                restricted: [],
                warn: [],
                unknown: [],
                errors: []
            },
            statistics: {
                totalPackages: 0,
                compliantPackages: 0,
                restrictedPackages: 0,
                warnPackages: 0,
                unknownPackages: 0,
                complianceScore: 100
            },
            recommendations: [],
            lastChecked: new Date().toISOString()
        };
    }

    async check() {
        console.log('📜 Starting License Compliance Check...\n');

        try {
            // Find all package.json files
            const packageFiles = this.findPackageFiles();
            console.log(`📦 Found ${packageFiles.length} package.json files\n`);

            // Check each package
            for (const packageFile of packageFiles) {
                await this.checkPackage(packageFile);
            }

            // Calculate statistics
            this.calculateStatistics();

            // Generate recommendations
            this.generateRecommendations();

            // Output results
            this.outputResults();

            return this.results;

        } catch (error) {
            console.error('❌ License check failed:', error.message);
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

    async checkPackage(packageFile) {
        console.log(`📜 Checking licenses: ${packageFile}`);

        const packageDir = path.dirname(packageFile);
        const packageName = this.getPackageName(packageFile);

        try {
            // Get dependency tree
            const dependencies = await this.getDependencies(packageDir);

            // Check each dependency
            for (const [depName, depInfo] of Object.entries(dependencies)) {
                if (depInfo.type === 'devDependencies' && !this.options.includeDevDependencies) {
                    continue;
                }

                const licenseInfo = await this.getLicenseInfo(depName, depInfo);

                const compliance = this.checkLicenseCompliance(licenseInfo);

                this.results.packages.push({
                    name: depName,
                    version: depInfo.version || depInfo,
                    license: licenseInfo.license,
                    licenseText: licenseInfo.text,
                    source: licenseInfo.source,
                    compliance: compliance.status,
                    category: compliance.category,
                    reason: compliance.reason,
                    parentPackage: packageName,
                    url: licenseInfo.url
                });
            }

            console.log(`✅ Completed: ${packageName}\n`);

        } catch (error) {
            console.error(`❌ Failed: ${packageName} - ${error.message}\n`);
            this.results.compliance.errors.push({
                package: packageName,
                error: error.message,
                packageFile
            });
        }
    }

    async getDependencies(packageDir) {
        try {
            console.log('🔍 Getting dependency tree...');

            const output = execSync('npm list --depth=0 --json', {
                cwd: packageDir,
                timeout: this.options.timeout,
                encoding: 'utf8'
            });

            const tree = JSON.parse(output);

            // Extract dependencies
            const dependencies = {};

            if (tree.dependencies) {
                Object.entries(tree.dependencies).forEach(([name, info]) => {
                    dependencies[name] = {
                        ...info,
                        type: 'dependencies'
                    };
                });
            }

            if (tree.devDependencies && this.options.includeDevDependencies) {
                Object.entries(tree.devDependencies).forEach(([name, info]) => {
                    dependencies[name] = {
                        ...info,
                        type: 'devDependencies'
                    };
                });
            }

            return dependencies;

        } catch (error) {
            console.log('⚠️ Could not get dependency tree');
            return {};
        }
    }

    async getLicenseInfo(packageName, depInfo) {
        const licenseInfo = {
            license: 'unknown',
            text: null,
            source: 'unknown',
            url: null
        };

        try {
            // Try to get from npm registry
            const registryInfo = await this.getNpmRegistryInfo(packageName);

            if (registryInfo.license) {
                licenseInfo.license = this.normalizeLicense(registryInfo.license);
                licenseInfo.source = 'npm-registry';
                licenseInfo.url = registryInfo.homepage;
            }

            // If no license from registry, try to parse from package.json
            if (licenseInfo.license === 'unknown') {
                const packagePath = this.findPackagePath(packageName, depInfo);
                if (packagePath) {
                    const localInfo = this.getLocalLicenseInfo(packagePath);
                    if (localInfo.license !== 'unknown') {
                        licenseInfo.license = localInfo.license;
                        licenseInfo.source = 'local-package';
                        licenseInfo.text = localInfo.text;
                    }
                }
            }

        } catch (error) {
            console.log(`⚠️ Could not get license info for ${packageName}`);
        }

        return licenseInfo;
    }

    async getNpmRegistryInfo(packageName) {
        return new Promise((resolve) => {
            https.get(`https://registry.npmjs.org/${packageName}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const info = JSON.parse(data);
                        resolve({
                            license: info.license,
                            homepage: info.homepage
                        });
                    } catch (error) {
                        resolve({ license: null, homepage: null });
                    }
                });
            }).on('error', () => resolve({ license: null, homepage: null }));
        });
    }

    findPackagePath(packageName, depInfo) {
        // Try common node_modules locations
        const possiblePaths = [
            path.join(process.cwd(), 'node_modules', packageName),
            path.join(process.cwd(), 'services', 'roblox-server', 'node_modules', packageName),
            path.join(process.cwd(), 'services', 'game-manager', 'node_modules', packageName)
        ];

        for (const packagePath of possiblePaths) {
            const packageJsonPath = path.join(packagePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                return packageJsonPath;
            }
        }

        return null;
    }

    getLocalLicenseInfo(packageJsonPath) {
        try {
            const content = fs.readFileSync(packageJsonPath, 'utf8');
            const pkg = JSON.parse(content);

            return {
                license: this.normalizeLicense(pkg.license),
                text: pkg.licenseText || null
            };
        } catch (error) {
            return { license: 'unknown', text: null };
        }
    }

    normalizeLicense(license) {
        if (!license) return 'unknown';

        // Handle different license formats
        if (typeof license === 'string') {
            return license.replace(/\s+/g, ' ').trim();
        }

        if (license.type) {
            return license.type.replace(/\s+/g, ' ').trim();
        }

        return 'unknown';
    }

    checkLicenseCompliance(licenseInfo) {
        const license = licenseInfo.license.toUpperCase();

        // Check custom rules first
        if (this.options.customRules[licenseInfo.license]) {
            const rule = this.options.customRules[licenseInfo.license];
            return {
                status: rule.action === 'allow' ? 'compliant' : 'restricted',
                category: rule.action === 'allow' ? 'compliant' : 'restricted',
                reason: `Custom rule: ${rule.reason}`
            };
        }

        // Check against allowed licenses
        if (this.options.allowedLicenses.some(allowed =>
            this.licensesMatch(license, allowed))) {
            return {
                status: 'compliant',
                category: 'compliant',
                reason: 'Allowed license'
            };
        }

        // Check against restricted licenses
        if (this.options.restrictedLicenses.some(restricted =>
            this.licensesMatch(license, restricted))) {
            return {
                status: 'restricted',
                category: 'restricted',
                reason: 'Restricted license - not allowed in this project'
            };
        }

        // Check against warning licenses
        if (this.options.warnLicenses.some(warn =>
            this.licensesMatch(license, warn))) {
            return {
                status: 'warn',
                category: 'warn',
                reason: 'Warning license - review required'
            };
        }

        // Unknown license
        return {
            status: 'unknown',
            category: 'unknown',
            reason: 'License information not available'
        };
    }

    licensesMatch(license1, license2) {
        const normalize = (license) => license.toUpperCase().replace(/[\s\-_]/g, '');
        return normalize(license1) === normalize(license2);
    }

    calculateStatistics() {
        const packages = this.results.packages;
        this.results.statistics.totalPackages = packages.length;

        packages.forEach(pkg => {
            switch (pkg.compliance) {
                case 'compliant':
                    this.results.statistics.compliantPackages++;
                    this.results.compliance.compliant.push(pkg);
                    break;
                case 'restricted':
                    this.results.statistics.restrictedPackages++;
                    this.results.compliance.restricted.push(pkg);
                    break;
                case 'warn':
                    this.results.statistics.warnPackages++;
                    this.results.compliance.warn.push(pkg);
                    break;
                case 'unknown':
                    this.results.statistics.unknownPackages++;
                    this.results.compliance.unknown.push(pkg);
                    break;
            }
        });

        // Calculate compliance score
        const total = this.results.statistics.totalPackages;
        const compliant = this.results.statistics.compliantPackages;
        const score = total > 0 ? Math.round((compliant / total) * 100) : 100;
        this.results.statistics.complianceScore = score;
    }

    generateRecommendations() {
        const { restricted, warn, unknown } = this.results.compliance;

        if (restricted.length > 0) {
            this.results.recommendations.push({
                type: 'critical',
                title: 'Restricted Licenses Found',
                description: `${restricted.length} packages use restricted licenses`,
                packages: restricted.map(pkg => pkg.name),
                action: 'Remove or replace packages with restricted licenses',
                priority: 1
            });
        }

        if (warn.length > 0) {
            this.results.recommendations.push({
                type: 'warning',
                title: 'Licenses Requiring Review',
                description: `${warn.length} packages use licenses that may require review`,
                packages: warn.map(pkg => pkg.name),
                action: 'Review and approve warn-listed licenses',
                priority: 2
            });
        }

        if (unknown.length > 0) {
            this.results.recommendations.push({
                type: 'info',
                title: 'Unknown Licenses',
                description: `${unknown.length} packages have unknown or missing license information`,
                packages: unknown.map(pkg => pkg.name),
                action: 'Investigate and document license information',
                priority: 3
            });
        }

        this.results.recommendations.sort((a, b) => a.priority - b.priority);
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

    outputResults() {
        console.log('\n📊 LICENSE COMPLIANCE RESULTS');
        console.log('=' .repeat(50));

        // Summary
        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total Packages: ${this.results.statistics.totalPackages}`);
        console.log(`   Compliant: ${this.results.statistics.compliantPackages}`);
        console.log(`   Restricted: ${this.results.statistics.restrictedPackages}`);
        console.log(`   Warning: ${this.results.statistics.warnPackages}`);
        console.log(`   Unknown: ${this.results.statistics.unknownPackages}`);
        console.log(`   Compliance Score: ${this.results.statistics.complianceScore}/100`);

        // Restricted licenses
        if (this.results.compliance.restricted.length > 0) {
            console.log(`\n🚫 RESTRICTED LICENSES:`);
            this.results.compliance.restricted.forEach(pkg => {
                console.log(`   ❌ ${pkg.name} (${pkg.license}) - ${pkg.reason}`);
            });
        }

        // Warning licenses
        if (this.results.compliance.warn.length > 0) {
            console.log(`\n⚠️ WARNING LICENSES:`);
            this.results.compliance.warn.forEach(pkg => {
                console.log(`   🟡 ${pkg.name} (${pkg.license}) - ${pkg.reason}`);
            });
        }

        // Unknown licenses
        if (this.results.compliance.unknown.length > 0) {
            console.log(`\n❓ UNKNOWN LICENSES:`);
            this.results.compliance.unknown.slice(0, 10).forEach(pkg => {
                console.log(`   ❓ ${pkg.name} - ${pkg.reason}`);
            });

            if (this.results.compliance.unknown.length > 10) {
                console.log(`   ... and ${this.results.compliance.unknown.length - 10} more`);
            }
        }

        // Recommendations
        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 RECOMMENDATIONS:`);
            this.results.recommendations.forEach(rec => {
                const emoji = rec.type === 'critical' ? '🚨' :
                             rec.type === 'warning' ? '⚠️' : '💡';
                console.log(`   ${emoji} ${rec.title}`);
                console.log(`      ${rec.description}`);
                console.log(`      Action: ${rec.action}\n`);
            });
        }

        // JSON output if requested
        if (this.options.outputFormat === 'json') {
            console.log('\n📄 JSON OUTPUT:');
            console.log(JSON.stringify(this.results, null, 2));
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        outputFormat: args.includes('--format') ?
            args[args.indexOf('--format') + 1] : 'console',
        includeDevDependencies: args.includes('--include-dev'),
        checkRecursively: !args.includes('--no-recursive')
    };

    const checker = new LicenseComplianceChecker(options);
    checker.check().catch(error => {
        console.error('License check failed:', error);
        process.exit(1);
    });
}

module.exports = LicenseComplianceChecker;