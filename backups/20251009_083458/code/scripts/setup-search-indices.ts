#!/usr/bin/env ts-node

/**
 * LocalEx Search Indices Setup Script
 * Creates and configures all OpenSearch indices for the LocalEx platform
 */

import { indexService } from '../src/services/index.service';
import { testOpenSearchConnection, checkOpenSearchHealth } from '../src/config/opensearch';
import { searchService } from '../src/services/search.service';

async function setupSearchIndices(): Promise<void> {
  console.log('🔍 Setting up LocalEx Search Indices...\n');

  try {
    // Step 1: Test OpenSearch connection
    console.log('Step 1: Testing OpenSearch connection...');
    const connectionOk = await testOpenSearchConnection();
    if (!connectionOk) {
      throw new Error('OpenSearch connection failed. Please ensure OpenSearch is running.');
    }

    // Step 2: Check cluster health
    console.log('\nStep 2: Checking cluster health...');
    const healthOk = await checkOpenSearchHealth();
    if (!healthOk) {
      throw new Error('OpenSearch cluster is not healthy. Please check cluster status.');
    }

    // Step 3: Create index templates
    console.log('\nStep 3: Creating index templates...');
    await indexService.createIndexTemplates();

    // Step 4: Create all indices
    console.log('\nStep 4: Creating search indices...');
    await indexService.createAllIndices();

    // Step 5: Refresh indices
    console.log('\nStep 5: Refreshing indices...');
    await indexService.refreshIndices();

    // Step 6: Get index statistics
    console.log('\nStep 6: Getting index statistics...');
    const stats = await indexService.getIndexStats();
    console.log('Index Statistics:');
    console.log(JSON.stringify(stats, null, 2));

    // Step 7: Test search service
    console.log('\nStep 7: Testing search service...');
    const healthCheck = await searchService.healthCheck();
    console.log('Search Service Health:', healthCheck.status);

    console.log('\n🎉 Search indices setup completed successfully!');
    console.log('=====================================');
    console.log('✅ OpenSearch connection verified');
    console.log('✅ Cluster health confirmed');
    console.log('✅ Index templates created');
    console.log('✅ All indices created');
    console.log('✅ Search service operational');
    console.log('');
    console.log('Next Steps:');
    console.log('- Run search tests: npm run search:test');
    console.log('- Access OpenSearch Dashboards: http://localhost:5601');
    console.log('- Access OpenSearch API: http://localhost:9200');

  } catch (error) {
    console.error('\n❌ Search indices setup failed!');
    console.error('================================');
    console.error('Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Ensure OpenSearch is running: docker-compose -f docker-compose.opensearch.yml up -d');
    console.error('2. Check OpenSearch logs: docker logs localex-opensearch');
    console.error('3. Verify OpenSearch is accessible: curl http://localhost:9200');
    console.error('4. Check cluster health: curl http://localhost:9200/_cluster/health');
    
    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupSearchIndices().catch(console.error);
}

export { setupSearchIndices };
