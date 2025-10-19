/**
 * Integration Test Runner
 * 
 * Executes all integration tests with proper setup, monitoring, and reporting
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  timeout: number;
  critical: boolean;
}

interface TestResult {
  suite: string;
  success: boolean;
  duration: number;
  error?: string;
  metrics?: any;
}

class IntegrationTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Complete Trading Flow',
      file: 'complete-trading-flow.test.ts',
      description: 'End-to-end trading lifecycle testing',
      timeout: 300000, // 5 minutes
      critical: true
    },
    {
      name: 'Load Testing',
      file: 'load-testing.test.ts',
      description: 'Performance testing with 1,000 concurrent users',
      timeout: 600000, // 10 minutes
      critical: true
    },
    {
      name: 'Security Audit',
      file: 'security-audit.test.ts',
      description: 'Comprehensive security and penetration testing',
      timeout: 300000, // 5 minutes
      critical: true
    },
    {
      name: 'Beta Testing',
      file: 'beta-testing.test.ts',
      description: 'Realistic user behavior simulation with 50-100 users',
      timeout: 900000, // 15 minutes
      critical: true
    }
  ];

  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Integration Test Suite');
    console.log('=====================================');
    
    this.startTime = Date.now();
    
    // Check if we're in the right directory
    if (!fs.existsSync('package.json')) {
      throw new Error('Please run this script from the project root directory');
    }

    // Ensure test environment is set up
    await this.setupTestEnvironment();

    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate report
    this.generateReport();
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    try {
      // Check if .env.test exists
      if (!fs.existsSync('.env.test')) {
        console.log('Creating .env.test file...');
        const envContent = `NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/localex_test
REDIS_URL=redis://localhost:6379/1
OPENSEARCH_URL=http://localhost:9200
S3_BUCKET=localex-test
S3_REGION=us-east-1
JWT_SECRET=test-secret-key
ENCRYPTION_KEY=test-encryption-key-32-chars
`;
        fs.writeFileSync('.env.test', envContent);
      }

      // Install dependencies if needed
      if (!fs.existsSync('node_modules')) {
        console.log('Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
      }

      // Build the project
      console.log('Building project...');
      execSync('npm run build', { stdio: 'inherit' });

      console.log('✅ Test environment ready');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`   Description: ${suite.description}`);
    console.log(`   Timeout: ${suite.timeout / 1000}s`);
    
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Run the specific test file
      const testPath = path.join('tests', 'integration', suite.file);
      const command = `npx jest "${testPath}" --verbose --detectOpenHandles --forceExit --testTimeout=${suite.timeout}`;
      
      console.log(`   Command: ${command}`);
      
      execSync(command, { 
        stdio: 'inherit',
        timeout: suite.timeout + 30000 // Add 30s buffer
      });
      
      success = true;
      console.log(`   ✅ ${suite.name} completed successfully`);
    } catch (err: any) {
      error = err.message || 'Unknown error';
      console.log(`   ❌ ${suite.name} failed: ${error}`);
    }

    const duration = Date.now() - startTime;
    
    this.results.push({
      suite: suite.name,
      success,
      duration,
      ...(error && { error })
    });
  }

  private generateReport(): void {
    const totalTime = Date.now() - this.startTime;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    const criticalFailures = this.results.filter(r => !r.success && this.testSuites.find(s => s.name === r.suite)?.critical).length;

    console.log('\n📊 Integration Test Report');
    console.log('==========================');
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Successful Tests: ${successfulTests}/${this.results.length}`);
    console.log(`Failed Tests: ${failedTests}/${this.results.length}`);
    console.log(`Critical Failures: ${criticalFailures}`);

    console.log('\n📋 Test Results:');
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`   ${status} ${result.suite} (${duration}s)`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    // Generate detailed report file
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTime,
      summary: {
        total: this.results.length,
        successful: successfulTests,
        failed: failedTests,
        criticalFailures
      },
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    const reportPath = 'test-reports/integration-test-report.json';
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with appropriate code
    if (criticalFailures > 0) {
      console.log('\n❌ Critical test failures detected. Exiting with code 1.');
      process.exit(1);
    } else if (failedTests > 0) {
      console.log('\n⚠️  Some tests failed but no critical failures. Exiting with code 1.');
      process.exit(1);
    } else {
      console.log('\n🎉 All integration tests passed! Exiting with code 0.');
      process.exit(0);
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Integration test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };
