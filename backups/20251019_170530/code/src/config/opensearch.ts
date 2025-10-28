import { Client, ClientOptions } from '@opensearch-project/opensearch';
import dotenv from 'dotenv';

dotenv.config();

interface OpenSearchConfig {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  caCertPath?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  requestTimeout?: number;
  maxRetries?: number;
  resurrectStrategy?: string;
}

const getOpenSearchConfig = (): ClientOptions => {
  const config: OpenSearchConfig = {
    host: process.env['OPENSEARCH_HOST'] || 'localhost',
    port: parseInt(process.env['OPENSEARCH_PORT'] || '9200'),
    protocol: process.env['OPENSEARCH_PROTOCOL'] || 'http',
    ssl: process.env['OPENSEARCH_SSL'] === 'true',
    requestTimeout: parseInt(process.env['SEARCH_QUERY_TIMEOUT'] || '5000'),
    maxRetries: 3,
    resurrectStrategy: 'ping',
  };

  // Add optional fields only if they exist
  if (process.env['OPENSEARCH_USERNAME']) {
    config.username = process.env['OPENSEARCH_USERNAME'];
  }
  if (process.env['OPENSEARCH_PASSWORD']) {
    config.password = process.env['OPENSEARCH_PASSWORD'];
  }
  if (process.env['OPENSEARCH_CA_CERT_PATH']) {
    config.caCertPath = process.env['OPENSEARCH_CA_CERT_PATH'];
  }
  if (process.env['OPENSEARCH_CLIENT_CERT_PATH']) {
    config.clientCertPath = process.env['OPENSEARCH_CLIENT_CERT_PATH'];
  }
  if (process.env['OPENSEARCH_CLIENT_KEY_PATH']) {
    config.clientKeyPath = process.env['OPENSEARCH_CLIENT_KEY_PATH'];
  }

  const clientOptions: ClientOptions = {
    node: `${config.protocol}://${config.host}:${config.port}`,
    resurrectStrategy: config.resurrectStrategy as any,
  };

  // Add optional fields only if they exist
  if (config.requestTimeout) {
    clientOptions.requestTimeout = config.requestTimeout;
  }
  if (config.maxRetries) {
    clientOptions.maxRetries = config.maxRetries;
  }

  // Add authentication if provided
  if (config.username && config.password) {
    clientOptions.auth = {
      username: config.username,
      password: config.password,
    };
  }

  // Add SSL configuration if enabled
  if (config.ssl) {
    clientOptions.ssl = {
      rejectUnauthorized: false, // For development only
    };

    if (config.caCertPath) {
      clientOptions.ssl.ca = config.caCertPath;
    }

    if (config.clientCertPath && config.clientKeyPath) {
      clientOptions.ssl.cert = config.clientCertPath;
      clientOptions.ssl.key = config.clientKeyPath;
    }
  }

  return clientOptions;
};

// Create OpenSearch client instance
export const opensearchClient = new Client(getOpenSearchConfig());

// Search configuration constants
export const SEARCH_CONFIG = {
  INDEX_PREFIX: process.env['SEARCH_INDEX_PREFIX'] || 'localex',
  INDEX_SHARDS: parseInt(process.env['SEARCH_INDEX_SHARDS'] || '1'),
  INDEX_REPLICAS: parseInt(process.env['SEARCH_INDEX_REPLICAS'] || '0'),
  REFRESH_INTERVAL: process.env['SEARCH_REFRESH_INTERVAL'] || '1s',
  QUERY_TIMEOUT: parseInt(process.env['SEARCH_QUERY_TIMEOUT'] || '5000'),
  MAX_RESULTS: parseInt(process.env['SEARCH_MAX_RESULTS'] || '1000'),
  DEFAULT_PAGE_SIZE: parseInt(process.env['SEARCH_DEFAULT_PAGE_SIZE'] || '20'),
};

// Index names
export const INDEX_NAMES = {
  ITEMS: `${SEARCH_CONFIG.INDEX_PREFIX}_items`,
  USERS: `${SEARCH_CONFIG.INDEX_PREFIX}_users`,
  CATEGORIES: `${SEARCH_CONFIG.INDEX_PREFIX}_categories`,
  SEARCH_LOGS: `${SEARCH_CONFIG.INDEX_PREFIX}_search_logs`,
};

// Setup OpenSearch client event listeners
opensearchClient.on('request', (err, result) => {
  if (err) {
    console.error('❌ OpenSearch request error:', err);
  } else {
    // @ts-ignore - OpenSearch types are incomplete
    console.log(`🔍 OpenSearch request: ${result.meta.request.method} ${result.meta.request.path}`);
  }
});

opensearchClient.on('response', (err, result) => {
  if (err) {
    console.error('❌ OpenSearch response error:', err);
  } else {
    // @ts-ignore - OpenSearch types are incomplete
    console.log(`✅ OpenSearch response: ${result.statusCode} (${result.meta.request.duration}ms)`);
  }
});

// Health check function
export const checkOpenSearchHealth = async (): Promise<boolean> => {
  try {
    const response = await opensearchClient.cluster.health({
      wait_for_status: 'yellow',
      timeout: '10s',
    });
    
    // @ts-ignore - OpenSearch body types are incomplete
    console.log(`✅ OpenSearch cluster health: ${response.body.status}`);
    return true;
  } catch (error) {
    console.error('❌ OpenSearch health check failed:', error);
    return false;
  }
};

// Connection test function
export const testOpenSearchConnection = async (): Promise<boolean> => {
  try {
    const response = await opensearchClient.info();
    // @ts-ignore - OpenSearch body types are incomplete
    console.log(`✅ OpenSearch connection successful: ${response.body.version.distribution} ${response.body.version.number}`);
    return true;
  } catch (error) {
    console.error('❌ OpenSearch connection failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down OpenSearch connection...');
  try {
    await opensearchClient.close();
    console.log('🛑 OpenSearch connection closed.');
  } catch (error) {
    console.error('❌ Error closing OpenSearch connection:', error);
  }
  process.exit(0);
});

export default opensearchClient;
