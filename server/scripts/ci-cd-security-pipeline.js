#!/usr/bin/env node

/**
 * CI/CD Security Pipeline
 * Automated security scanning and quality gates for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const DependencySecurityScanner = require('./dependency-security-scanner');
const DependencyUpdateManager = require('./dependency-update-manager');
const LicenseComplianceChecker = require('./license-compliance-checker');

class CICDSecurityPipeline {
    constructor(options = {}) {
        this.options = {
            stage: 'all', // all, security, dependencies, licenses, quality
            failOnCritical: true,
            failOnHigh: false,
            updateDependencies: false,
            createReports: true,
            outputDir: 'security-reports',
            githubToken: process.env.GITHUB_TOKEN,
            slackWebhook: process.env.SLACK_WEBHOOK,
            emailNotifications: process.env.NOTIFICATION_EMAIL,
            enforceLicenseCompliance: true,
            enforceQualityGates: true,
            timeout: 900000, // 15 minutes
            ...options
        };

        this.results = {
            pipeline: {
                startTime: null,
                endTime: null,
                duration: 0,
                stage: this.options.stage,
                status: 'pending'
            },
            security: {
                vulnerabilities: [],
                score: 100,
                status: 'pending'
            },
            dependencies: {
                outdated: [],
                updated: [],
                score: 100,
                status: 'pending'
            },
            licenses: {
                compliance: [],
                score: 100,
                status: 'pending'
            },
            quality: {
                tests: [],
                coverage: 0,
                status: 'pending'
            },
            artifacts: [],
            reports: [],
            notifications: []
        };
    }

    async run() {
        console.log('🚀 Starting CI/CD Security Pipeline...\n');
        console.log(`📋 Configuration:`);
        console.log(`   Stage: ${this.options.stage}`);
        console.log(`   Fail on Critical: ${this.options.failOnCritical}`);
        console.log(`   Fail on High: ${this.options.failOnHigh}`);
        console.log(`   Update Dependencies: ${this.options.updateDependencies}`);
        console.log(`   Enforce License Compliance: ${this.options.enforceLicenseCompliance}`);
        console.log(`   Enforce Quality Gates: ${this.options.enforceQualityGates}\n`);

        this.results.pipeline.startTime = Date.now();

        try {
            // Create output directory
            this.createOutputDirectory();

            // Run stages based on configuration
            if (this.options.stage === 'all' || this.options.stage === 'security') {
                await this.runSecurityStage();
            }

            if (this.options.stage === 'all' || this.options.stage === 'dependencies') {
                await this.runDependenciesStage();
            }

            if (this.options.stage === 'all' || this.options.stage === 'licenses') {
                await this.runLicensesStage();
            }

            if (this.options.stage === 'all' || this.options.stage === 'quality') {
                await this.runQualityStage();
            }

            // Calculate overall results
            this.calculateOverallResults();

            // Generate reports
            if (this.options.createReports) {
                await this.generateReports();
            }

            // Send notifications
            await this.sendNotifications();

            // Determine pipeline status
            this.determinePipelineStatus();

            this.outputResults();

            // Exit with appropriate code
            process.exit(this.results.pipeline.status === 'success' ? 0 : 1);

        } catch (error) {
            console.error('❌ Pipeline failed:', error.message);
            this.results.pipeline.status = 'failed';
            this.results.pipeline.error = error.message;
            await this.sendNotifications();
            process.exit(1);
        }
    }

    createOutputDirectory() {
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }
    }

    async runSecurityStage() {
        console.log('🔐 SECURITY STAGE');
        console.log('=' .repeat(30));

        try {
            console.log('🔍 Running vulnerability scan...');

            const scanner = new DependencySecurityScanner({
                auditLevel: 'moderate',
                jsonOutput: true,
                autoFix: false
            });

            const securityResults = await scanner.scan();

            this.results.security.vulnerabilities = securityResults.vulnerabilities;
            this.results.security.score = securityResults.summary.securityScore;
            this.results.security.status = 'completed';

            // Check security thresholds
            const hasCritical = securityResults.vulnerabilities.some(v => v.severity === 'critical');
            const hasHigh = securityResults.vulnerabilities.some(v => v.severity === 'high');

            if (hasCritical && this.options.failOnCritical) {
                throw new Error('Critical security vulnerabilities found');
            }

            if (hasHigh && this.options.failOnHigh) {
                console.log('⚠️ High-severity vulnerabilities found but not failing build');
            }

            // Save security results
            this.saveResults('security', securityResults);

            console.log(`✅ Security scan completed (Score: ${this.results.security.score}/100)\n`);

        } catch (error) {
            console.error(`❌ Security stage failed: ${error.message}`);
            this.results.security.status = 'failed';
            this.results.security.error = error.message;
        }
    }

    async runDependenciesStage() {
        console.log('📦 DEPENDENCIES STAGE');
        console.log('=' .repeat(30));

        try {
            console.log('🔍 Checking for outdated dependencies...');

            const manager = new DependencyUpdateManager({
                dryRun: true,
                patch: true,
                minor: false,
                major: false,
                includeDevDeps: false,
                testAfterUpdate: true
            });

            const dependencyResults = await manager.update();

            this.results.dependencies.outdated = dependencyResults.outdated;
            this.results.dependencies.updated = dependencyResults.updated;

            // Calculate dependency score
            const totalDeps = dependencyResults.outdated.length + dependencyResults.updated.length;
            this.results.dependencies.score = totalDeps > 0 ?
                Math.max(0, 100 - (dependencyResults.outdated.length * 5)) : 100;
            this.results.dependencies.status = 'completed';

            // Auto-update if enabled
            if (this.options.updateDependencies && dependencyResults.outdated.length > 0) {
                console.log('🔄 Auto-updating dependencies...');

                const updateManager = new DependencyUpdateManager({
                    dryRun: false,
                    patch: true,
                    minor: true,
                    major: false,
                    includeDevDeps: false,
                    backupBeforeUpdate: true,
                    testAfterUpdate: true,
                    createPullRequest: !!this.options.githubToken
                });

                const updateResults = await updateManager.update();
                this.results.dependencies.updated = updateResults.updated;
            }

            // Save dependency results
            this.saveResults('dependencies', dependencyResults);

            console.log(`✅ Dependency check completed (${dependencyResults.outdated.length} outdated)\n`);

        } catch (error) {
            console.error(`❌ Dependencies stage failed: ${error.message}`);
            this.results.dependencies.status = 'failed';
            this.results.dependencies.error = error.message;
        }
    }

    async runLicensesStage() {
        console.log('📜 LICENSES STAGE');
        console.log('=' .repeat(30));

        try {
            console.log('📜 Checking license compliance...');

            const checker = new LicenseComplianceChecker({
                outputFormat: 'json',
                includeDevDependencies: false
            });

            const licenseResults = await checker.check();

            this.results.licenses.compliance = licenseResults.compliance;
            this.results.licenses.score = licenseResults.statistics.complianceScore;
            this.results.licenses.status = 'completed';

            // Check license compliance
            if (this.results.licenses.compliance.restricted.length > 0 &&
                this.options.enforceLicenseCompliance) {
                throw new Error('Restricted licenses found - compliance violation');
            }

            // Save license results
            this.saveResults('licenses', licenseResults);

            console.log(`✅ License compliance check completed (Score: ${this.results.licenses.score}/100)\n`);

        } catch (error) {
            console.error(`❌ Licenses stage failed: ${error.message}`);
            this.results.licenses.status = 'failed';
            this.results.licenses.error = error.message;
        }
    }

    async runQualityStage() {
        console.log('🧪 QUALITY STAGE');
        console.log('=' .repeat(30));

        try {
            // Run tests
            console.log('🧪 Running tests...');
            const testResults = await this.runTests();
            this.results.quality.tests = testResults;

            // Check test coverage
            console.log('📊 Checking test coverage...');
            const coverageResults = await this.checkCoverage();
            this.results.quality.coverage = coverageResults.percentage;

            // Quality gates
            if (this.options.enforceQualityGates) {
                this.checkQualityGates();
            }

            this.results.quality.status = 'completed';

            console.log(`✅ Quality checks completed (Coverage: ${this.results.quality.coverage}%)\n`);

        } catch (error) {
            console.error(`❌ Quality stage failed: ${error.message}`);
            this.results.quality.status = 'failed';
            this.results.quality.error = error.message;
        }
    }

    async runTests() {
        try {
            const packages = this.findPackageFiles();
            const testResults = [];

            for (const packageFile of packages) {
                const packageDir = path.dirname(packageFile);
                const packageName = this.getPackageName(packageFile);

                try {
                    console.log(`🧪 Testing ${packageName}...`);

                    const result = execSync('npm test -- --json', {
                        cwd: packageDir,
                        timeout: this.options.timeout,
                        encoding: 'utf8'
                    });

                    const testOutput = JSON.parse(result);
                    testResults.push({
                        package: packageName,
                        status: 'passed',
                        tests: testOutput.numTotalTests || 0,
                        passed: testOutput.numPassedTests || 0,
                        failed: testOutput.numFailedTests || 0,
                        duration: testOutput.testResults?.reduce((sum, result) =>
                            sum + result.perfStats.runtime, 0) || 0
                    });

                } catch (error) {
                    if (error.stdout) {
                        try {
                            const testOutput = JSON.parse(error.stdout);
                            testResults.push({
                                package: packageName,
                                status: 'failed',
                                tests: testOutput.numTotalTests || 0,
                                passed: testOutput.numPassedTests || 0,
                                failed: testOutput.numFailedTests || 0,
                                error: 'Test execution failed'
                            });
                        } catch (parseError) {
                            testResults.push({
                                package: packageName,
                                status: 'error',
                                error: 'Could not parse test output'
                            });
                        }
                    } else {
                        testResults.push({
                            package: packageName,
                            status: 'error',
                            error: error.message
                        });
                    }
                }
            }

            return testResults;

        } catch (error) {
            console.log('⚠️ Could not run tests:', error.message);
            return [];
        }
    }

    async checkCoverage() {
        try {
            const packages = this.findPackageFiles();
            let totalCoverage = 0;
            let packageCount = 0;

            for (const packageFile of packages) {
                const packageDir = path.dirname(packageFile);

                if (fs.existsSync(path.join(packageDir, 'coverage', 'coverage-summary.json'))) {
                    const coverageFile = path.join(packageDir, 'coverage', 'coverage-summary.json');
                    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

                    const packageCoverage = coverageData.total.lines.pct || 0;
                    totalCoverage += packageCoverage;
                    packageCount++;
                }
            }

            return {
                percentage: packageCount > 0 ? Math.round(totalCoverage / packageCount) : 0,
                packages: packageCount
            };

        } catch (error) {
            return { percentage: 0, packages: 0 };
        }
    }

    checkQualityGates() {
        // Check test coverage threshold (e.g., 80%)
        if (this.results.quality.coverage < 80) {
            throw new Error(`Test coverage too low: ${this.results.quality.coverage}% (required: 80%)`);
        }

        // Check if all tests pass
        const failedTests = this.results.quality.tests.filter(test =>
            test.status === 'failed' || test.status === 'error');

        if (failedTests.length > 0) {
            throw new Error(`${failedTests.length} test suites failed`);
        }
    }

    saveResults(stage, data) {
        const filename = path.join(this.options.outputDir, `${stage}-results.json`);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        this.results.artifacts.push(filename);
    }

    calculateOverallResults() {
        const { security, dependencies, licenses, quality } = this.results;

        // Calculate weighted score
        const scores = [];
        if (security.status === 'completed') scores.push(security.score);
        if (dependencies.status === 'completed') scores.push(dependencies.score);
        if (licenses.status === 'completed') scores.push(licenses.score);

        this.results.overallScore = scores.length > 0 ?
            Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    }

    async generateReports() {
        console.log('📊 Generating reports...');

        // Generate summary report
        const summaryReport = this.generateSummaryReport();
        const summaryFile = path.join(this.options.outputDir, 'pipeline-summary.json');
        fs.writeFileSync(summaryFile, JSON.stringify(summaryReport, null, 2));
        this.results.reports.push(summaryFile);

        // Generate HTML report
        await this.generateHTMLReport();

        console.log('✅ Reports generated\n');
    }

    generateSummaryReport() {
        return {
            pipeline: {
                status: this.results.pipeline.status,
                duration: this.results.pipeline.duration,
                stage: this.options.stage
            },
            scores: {
                overall: this.results.overallScore || 0,
                security: this.results.security.score,
                dependencies: this.results.dependencies.score,
                licenses: this.results.licenses.score
            },
            summary: {
                vulnerabilities: this.results.security.vulnerabilities.length,
                outdatedDependencies: this.results.dependencies.outdated.length,
                licenseViolations: this.results.licenses.compliance.restricted.length,
                testCoverage: this.results.quality.coverage
            },
            artifacts: this.results.artifacts,
            timestamp: new Date().toISOString()
        };
    }

    async generateHTMLReport() {
        const html = this.generateHTML();
        const htmlFile = path.join(this.options.outputDir, 'pipeline-report.html');
        fs.writeFileSync(htmlFile, html);
        this.results.reports.push(htmlFile);
    }

    generateHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CI/CD Security Pipeline Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; }
        .score { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; }
        .metric { display: inline-block; background: #f8f9fa; padding: 15px; margin: 10px; border-radius: 8px; min-width: 150px; text-align: center; }
        .status { padding: 5px 10px; border-radius: 4px; color: white; }
        .success { background: #28a745; }
        .warning { background: #ffc107; color: black; }
        .danger { background: #dc3545; }
        .info { background: #17a2b8; }
        .section { margin: 30px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 CI/CD Security Pipeline Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="section">
        <div class="score">${this.results.overallScore || 0}/100</div>
        <div style="text-align: center;">
            <div class="metric">
                <h3>🔐 Security</h3>
                <p>${this.results.security.score}/100</p>
                <span class="status ${this.results.security.status}">${this.results.security.status}</span>
            </div>
            <div class="metric">
                <h3>📦 Dependencies</h3>
                <p>${this.results.dependencies.score}/100</p>
                <span class="status ${this.results.dependencies.status}">${this.results.dependencies.status}</span>
            </div>
            <div class="metric">
                <h3>📜 Licenses</h3>
                <p>${this.results.licenses.score}/100</p>
                <span class="status ${this.results.licenses.status}">${this.results.licenses.status}</span>
            </div>
            <div class="metric">
                <h3>🧪 Quality</h3>
                <p>${this.results.quality.coverage}% Coverage</p>
                <span class="status ${this.results.quality.status}">${this.results.quality.status}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📊 Summary</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Vulnerabilities Found</td><td>${this.results.security.vulnerabilities.length}</td></tr>
            <tr><td>Outdated Dependencies</td><td>${this.results.dependencies.outdated.length}</td></tr>
            <tr><td>License Violations</td><td>${this.results.licenses.compliance.restricted.length}</td></tr>
            <tr><td>Test Coverage</td><td>${this.results.quality.coverage}%</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>📁 Artifacts</h2>
        <ul>
            ${this.results.artifacts.map(artifact => `<li>${path.basename(artifact)}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
    }

    async sendNotifications() {
        const notifications = [];

        // GitHub status check
        if (this.options.githubToken && process.env.GITHUB_SHA) {
            await this.updateGitHubStatus();
        }

        // Slack notification
        if (this.options.slackWebhook) {
            await this.sendSlackNotification();
        }

        // Email notification
        if (this.options.emailNotifications) {
            await this.sendEmailNotification();
        }
    }

    async updateGitHubStatus() {
        try {
            const status = this.results.pipeline.status === 'success' ? 'success' : 'failure';
            const description = `Security pipeline completed with score: ${this.results.overallScore}/100`;

            execSync(`curl -X POST \\
                -H "Authorization: token ${this.options.githubToken}" \\
                -H "Accept: application/vnd.github.v3+json" \\
                https://api.github.com/repos/${process.env.GITHUB_REPO}/statuses/${process.env.GITHUB_SHA} \\
                -d '{"state":"${status}","description":"${description}","context":"security-pipeline"}'`);

            console.log('✅ GitHub status updated');

        } catch (error) {
            console.log('⚠️ Could not update GitHub status');
        }
    }

    async sendSlackNotification() {
        try {
            const emoji = this.results.pipeline.status === 'success' ? '✅' : '❌';
            const color = this.results.pipeline.status === 'success' ? 'good' : 'danger';

            const payload = {
                attachments: [{
                    color,
                    title: `${emoji} CI/CD Security Pipeline`,
                    fields: [
                        { title: 'Status', value: this.results.pipeline.status, short: true },
                        { title: 'Score', value: `${this.results.overallScore}/100`, short: true },
                        { title: 'Vulnerabilities', value: this.results.security.vulnerabilities.length, short: true },
                        { title: 'Coverage', value: `${this.results.quality.coverage}%`, short: true }
                    ],
                    ts: Math.floor(Date.now() / 1000)
                }]
            };

            execSync(`curl -X POST -H 'Content-type: application/json' \\
                --data '${JSON.stringify(payload)}' \\
                ${this.options.slackWebhook}`);

            console.log('✅ Slack notification sent');

        } catch (error) {
            console.log('⚠️ Could not send Slack notification');
        }
    }

    async sendEmailNotification() {
        // This would require email service setup
        console.log('📧 Email notification configured (not implemented)');
    }

    determinePipelineStatus() {
        this.results.pipeline.endTime = Date.now();
        this.results.pipeline.duration = this.results.pipeline.endTime - this.results.pipeline.startTime;

        // Check if any critical stage failed
        const criticalFailures = [
            this.results.security.status === 'failed' && this.options.failOnCritical,
            this.results.licenses.status === 'failed' && this.options.enforceLicenseCompliance,
            this.results.quality.status === 'failed' && this.options.enforceQualityGates
        ];

        if (criticalFailures.some(failure => failure)) {
            this.results.pipeline.status = 'failed';
        } else {
            this.results.pipeline.status = 'success';
        }
    }

    outputResults() {
        console.log('\n🚀 CI/CD SECURITY PIPELINE RESULTS');
        console.log('=' .repeat(50));

        console.log(`\n📈 OVERALL RESULTS:`);
        console.log(`   Status: ${this.results.pipeline.status.toUpperCase()}`);
        console.log(`   Duration: ${Math.round(this.results.pipeline.duration / 1000)}s`);
        console.log(`   Overall Score: ${this.results.overallScore}/100`);

        console.log(`\n🔐 SECURITY:`);
        console.log(`   Status: ${this.results.security.status}`);
        console.log(`   Score: ${this.results.security.score}/100`);
        console.log(`   Vulnerabilities: ${this.results.security.vulnerabilities.length}`);

        console.log(`\n📦 DEPENDENCIES:`);
        console.log(`   Status: ${this.results.dependencies.status}`);
        console.log(`   Score: ${this.results.dependencies.score}/100`);
        console.log(`   Outdated: ${this.results.dependencies.outdated.length}`);

        console.log(`\n📜 LICENSES:`);
        console.log(`   Status: ${this.results.licenses.status}`);
        console.log(`   Score: ${this.results.licenses.score}/100`);
        console.log(`   Violations: ${this.results.licenses.compliance.restricted.length}`);

        console.log(`\n🧪 QUALITY:`);
        console.log(`   Status: ${this.results.quality.status}`);
        console.log(`   Coverage: ${this.results.quality.coverage}%`);
        console.log(`   Test Suites: ${this.results.quality.tests.length}`);

        console.log(`\n📁 ARTIFACTS:`);
        this.results.artifacts.forEach(artifact => {
            console.log(`   📄 ${path.basename(artifact)}`);
        });
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

    getPackageName(packageFile) {
        try {
            const content = fs.readFileSync(packageFile, 'utf8');
            const pkg = JSON.parse(content);
            return pkg.name || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        stage: args.includes('--stage') ?
            args[args.indexOf('--stage') + 1] : 'all',
        failOnCritical: !args.includes('--no-fail-critical'),
        failOnHigh: args.includes('--fail-high'),
        updateDependencies: args.includes('--update-deps'),
        createReports: !args.includes('--no-reports')
    };

    const pipeline = new CICDSecurityPipeline(options);
    pipeline.run().catch(error => {
        console.error('Pipeline failed:', error);
        process.exit(1);
    });
}

module.exports = CICDSecurityPipeline;