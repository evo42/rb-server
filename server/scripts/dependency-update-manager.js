#!/usr/bin/env node

/**
 * Dependency Update Manager
 * Automated dependency update management with safety checks
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

class DependencyUpdateManager {
    constructor(options = {}) {
        this.options = {
            dryRun: false,
            patch: true,      // Update patch versions (1.0.x)
            minor: false,     // Update minor versions (1.x.0)
            major: false,     // Update major versions (x.0.0)
            includeDevDeps: false,
            backupBeforeUpdate: true,
            testAfterUpdate: true,
            createPullRequest: false,
            branchName: `dependency-updates-${Date.now()}`,
            commitMessage: 'Automated dependency updates',
            timeout: 600000,
            ...options
        };

        this.results = {
            updated: [],
            failed: [],
            skipped: [],
            backups: [],
            testResults: [],
            summary: {
                totalUpdated: 0,
                totalFailed: 0,
                totalSkipped: 0,
                startTime: new Date().toISOString(),
                endTime: null,
                duration: 0
            }
        };
    }

    async update() {
        console.log('🔄 Starting Dependency Update Manager...\n');
        console.log(`📋 Options:`);
        console.log(`   Dry Run: ${this.options.dryRun}`);
        console.log(`   Patch Updates: ${this.options.patch}`);
        console.log(`   Minor Updates: ${this.options.minor}`);
        console.log(`   Major Updates: ${this.options.major}`);
        console.log(`   Include Dev Dependencies: ${this.options.includeDevDeps}`);
        console.log(`   Backup Before Update: ${this.options.backupBeforeUpdate}`);
        console.log(`   Test After Update: ${this.options.testAfterUpdate}\n`);

        const startTime = Date.now();

        try {
            // Find all package.json files
            const packageFiles = this.findPackageFiles();
            console.log(`📦 Found ${packageFiles.length} package.json files\n`);

            // Update each package
            for (const packageFile of packageFiles) {
                await this.updatePackage(packageFile);
            }

            this.results.summary.endTime = new Date().toISOString();
            this.results.summary.duration = Date.now() - startTime;

            // Output results
            this.outputResults();

            return this.results;

        } catch (error) {
            console.error('❌ Update process failed:', error.message);
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

    async updatePackage(packageFile) {
        console.log(`🔄 Updating: ${packageFile}`);

        const packageDir = path.dirname(packageFile);
        const packageName = this.getPackageName(packageFile);

        try {
            // Backup current state
            if (this.options.backupBeforeUpdate && !this.options.dryRun) {
                await this.createBackup(packageDir, packageName);
            }

            // Check for outdated packages
            const outdatedPackages = await this.getOutdatedPackages(packageDir);

            if (outdatedPackages.length === 0) {
                console.log(`✅ ${packageName}: All packages are up-to-date\n`);
                return;
            }

            console.log(`📊 Found ${outdatedPackages.length} outdated packages`);

            // Update packages based on version policies
            const updates = this.filterUpdates(outdatedPackages);

            if (updates.length === 0) {
                console.log(`⏭️ ${packageName}: No packages match update criteria\n`);
                this.results.skipped.push({
                    package: packageName,
                    reason: 'No packages match update criteria',
                    outdatedCount: outdatedPackages.length
                });
                return;
            }

            console.log(`🔄 Will update ${updates.length} packages`);

            // Perform updates
            await this.performUpdates(packageDir, updates);

            console.log(`✅ ${packageName}: Update completed\n`);

        } catch (error) {
            console.error(`❌ ${packageName}: Update failed - ${error.message}\n`);
            this.results.failed.push({
                package: packageName,
                error: error.message,
                packageFile
            });
        }
    }

    async createBackup(packageDir, packageName) {
        try {
            const backupDir = path.join(process.cwd(), 'backups', packageName);

            // Create backup directory
            fs.mkdirSync(backupDir, { recursive: true });

            // Copy package.json and package-lock.json
            const filesToBackup = ['package.json', 'package-lock.json', 'yarn.lock'];

            filesToBackup.forEach(file => {
                const sourceFile = path.join(packageDir, file);
                const backupFile = path.join(backupDir, file);

                if (fs.existsSync(sourceFile)) {
                    fs.copyFileSync(sourceFile, backupFile);
                }
            });

            this.results.backups.push({
                package: packageName,
                backupDir,
                timestamp: new Date().toISOString()
            });

            console.log(`💾 Created backup for ${packageName}`);

        } catch (error) {
            console.log(`⚠️ Backup failed for ${packageName}: ${error.message}`);
        }
    }

    async getOutdatedPackages(packageDir) {
        try {
            console.log('🔍 Checking outdated packages...');

            const output = execSync('npm outdated --json', {
                cwd: packageDir,
                timeout: this.options.timeout,
                encoding: 'utf8'
            });

            return JSON.parse(output);

        } catch (error) {
            // npm outdated returns non-zero if everything is up-to-date
            if (!error.stdout) {
                return {};
            }

            try {
                return JSON.parse(error.stdout);
            } catch (parseError) {
                return {};
            }
        }
    }

    filterUpdates(outdatedPackages) {
        const updates = [];

        Object.entries(outdatedPackages).forEach(([name, info]) => {
            if (info.dependencyType === 'devDependencies' && !this.options.includeDevDeps) {
                return;
            }

            const current = this.parseVersion(info.current);
            const latest = this.parseVersion(info.latest);

            if (this.shouldUpdate(current, latest)) {
                updates.push({
                    name,
                    current: info.current,
                    latest: info.latest,
                    wanted: info.wanted,
                    location: info.location,
                    dependencyType: info.dependencyType
                });
            }
        });

        return updates;
    }

    parseVersion(version) {
        if (!version || version === 'latest') {
            return { major: 0, minor: 0, patch: 0 };
        }

        const parts = version.replace(/^v/, '').split('.');
        return {
            major: parseInt(parts[0]) || 0,
            minor: parseInt(parts[1]) || 0,
            patch: parseInt(parts[2]) || 0
        };
    }

    shouldUpdate(current, latest) {
        if (latest.major > current.major && this.options.major) return true;
        if (latest.minor > current.minor && this.options.minor) return true;
        if (latest.patch > current.patch && this.options.patch) return true;
        return false;
    }

    async performUpdates(packageDir, updates) {
        console.log('🔄 Performing updates...');

        for (const update of updates) {
            try {
                if (this.options.dryRun) {
                    console.log(`🔍 [DRY RUN] Would update ${update.name}: ${update.current} → ${update.latest}`);
                } else {
                    console.log(`📦 Updating ${update.name}: ${update.current} → ${update.latest}`);

                    // Perform the update
                    execSync(`npm install ${update.name}@${update.latest}`, {
                        cwd: packageDir,
                        stdio: 'inherit',
                        timeout: this.options.timeout
                    });

                    this.results.updated.push({
                        name: update.name,
                        from: update.current,
                        to: update.latest,
                        dependencyType: update.dependencyType,
                        packageDir
                    });

                    console.log(`✅ Updated ${update.name}`);
                }

            } catch (error) {
                console.error(`❌ Failed to update ${update.name}: ${error.message}`);
                this.results.failed.push({
                    name: update.name,
                    error: error.message,
                    from: update.current,
                    to: update.latest
                });
            }
        }

        // Run tests if requested
        if (this.options.testAfterUpdate && !this.options.dryRun) {
            await this.runTests(packageDir);
        }

        // Create git commit if requested
        if (this.options.createPullRequest && !this.options.dryRun) {
            await this.createGitCommit();
        }
    }

    async runTests(packageDir) {
        try {
            console.log('🧪 Running tests...');

            const result = spawnSync('npm test', {
                cwd: packageDir,
                stdio: 'inherit',
                timeout: this.options.timeout
            });

            if (result.status === 0) {
                console.log('✅ All tests passed');
                this.results.testResults.push({
                    packageDir,
                    status: 'passed',
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log('❌ Tests failed');
                this.results.testResults.push({
                    packageDir,
                    status: 'failed',
                    timestamp: new Date().toISOString(),
                    error: 'Tests failed'
                });
            }

        } catch (error) {
            console.log(`⚠️ Test run failed: ${error.message}`);
            this.results.testResults.push({
                packageDir,
                status: 'error',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }

    async createGitCommit() {
        try {
            console.log('📝 Creating git commit...');

            // Check if we're in a git repository
            try {
                execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
            } catch (error) {
                console.log('⚠️ Not in a git repository, skipping commit');
                return;
            }

            // Create new branch
            execSync(`git checkout -b ${this.options.branchName}`, { stdio: 'inherit' });

            // Add changes
            execSync('git add package*.json', { stdio: 'inherit' });

            // Create commit
            execSync(`git commit -m "${this.options.commitMessage}"`, { stdio: 'inherit' });

            console.log(`✅ Created commit on branch: ${this.options.branchName}`);

        } catch (error) {
            console.log(`⚠️ Git commit failed: ${error.message}`);
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

    outputResults() {
        console.log('\n📊 UPDATE MANAGER RESULTS');
        console.log('=' .repeat(50));

        // Summary
        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total Updated: ${this.results.updated.length}`);
        console.log(`   Total Failed: ${this.results.failed.length}`);
        console.log(`   Total Skipped: ${this.results.skipped.length}`);
        console.log(`   Duration: ${Math.round(this.results.summary.duration / 1000)}s`);

        // Updated packages
        if (this.results.updated.length > 0) {
            console.log(`\n✅ UPDATED PACKAGES:`);
            this.results.updated.forEach(update => {
                console.log(`   📦 ${update.name}: ${update.from} → ${update.to}`);
            });
        }

        // Failed packages
        if (this.results.failed.length > 0) {
            console.log(`\n❌ FAILED UPDATES:`);
            this.results.failed.forEach(failure => {
                console.log(`   💥 ${failure.name}: ${failure.error}`);
            });
        }

        // Backups created
        if (this.results.backups.length > 0) {
            console.log(`\n💾 BACKUPS CREATED:`);
            this.results.backups.forEach(backup => {
                console.log(`   📁 ${backup.package}: ${backup.backupDir}`);
            });
        }

        // Test results
        if (this.results.testResults.length > 0) {
            console.log(`\n🧪 TEST RESULTS:`);
            this.results.testResults.forEach(result => {
                const emoji = result.status === 'passed' ? '✅' :
                             result.status === 'failed' ? '❌' : '⚠️';
                console.log(`   ${emoji} ${result.packageDir}: ${result.status}`);
                if (result.error) console.log(`      Error: ${result.error}`);
            });
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run') || args.includes('-n'),
        patch: !args.includes('--no-patch'),
        minor: args.includes('--minor') || args.includes('-m'),
        major: args.includes('--major') || args.includes('-M'),
        includeDevDeps: args.includes('--include-dev') || args.includes('-d'),
        backupBeforeUpdate: !args.includes('--no-backup'),
        testAfterUpdate: !args.includes('--no-test'),
        createPullRequest: args.includes('--pr'),
        branchName: args.includes('--branch') ?
            args[args.indexOf('--branch') + 1] : `dependency-updates-${Date.now()}`,
        commitMessage: args.includes('--message') ?
            args[args.indexOf('--message') + 1] : 'Automated dependency updates'
    };

    const manager = new DependencyUpdateManager(options);
    manager.update().catch(error => {
        console.error('Update failed:', error);
        process.exit(1);
    });
}

module.exports = DependencyUpdateManager;
