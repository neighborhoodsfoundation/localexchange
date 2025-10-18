import { opensearchClient, INDEX_NAMES, SEARCH_CONFIG } from '../config/opensearch';

export interface IndexTemplate {
  name: string;
  patterns: string[];
  settings: any;
  mappings: any;
  aliases?: any;
}

class IndexService {
  private readonly client = opensearchClient;

  /**
   * Create all required indices for LocalEx
   */
  async createAllIndices(): Promise<void> {
    console.log('IndexService: Creating all LocalEx indices...');

    try {
      await Promise.all([
        this.createItemsIndex(),
        this.createUsersIndex(),
        this.createCategoriesIndex(),
        this.createSearchLogsIndex(),
      ]);

      console.log('✅ All indices created successfully');
    } catch (error) {
      console.error('❌ Failed to create indices:', error);
      throw error;
    }
  }

  /**
   * Create the items index with optimized mapping
   */
  async createItemsIndex(): Promise<void> {
    const indexName = INDEX_NAMES.ITEMS;
    
    try {
      // Check if index already exists
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists.body) {
        console.log(`Index ${indexName} already exists`);
        return;
      }

      const mapping = {
        settings: {
          number_of_shards: SEARCH_CONFIG.INDEX_SHARDS,
          number_of_replicas: SEARCH_CONFIG.INDEX_REPLICAS,
          refresh_interval: SEARCH_CONFIG.REFRESH_INTERVAL,
          analysis: {
            analyzer: {
              custom_text_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'snowball']
              },
              custom_keyword_analyzer: {
                type: 'custom',
                tokenizer: 'keyword',
                filter: ['lowercase']
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'custom_text_analyzer',
              fields: {
                keyword: { type: 'keyword', analyzer: 'custom_keyword_analyzer' },
                suggest: {
                  type: 'completion',
                  analyzer: 'simple',
                  search_analyzer: 'simple',
                  preserve_separators: true,
                  preserve_position_increments: true,
                  max_input_length: 50
                }
              }
            },
            description: {
              type: 'text',
              analyzer: 'custom_text_analyzer'
            },
            category: { 
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'custom_text_analyzer' }
              }
            },
            price: { type: 'double' },
            condition: { type: 'keyword' },
            location: {
              type: 'geo_point',
              fields: {
                address: { type: 'text', analyzer: 'custom_text_analyzer' },
                city: { type: 'keyword' },
                state: { type: 'keyword' },
                zipCode: { type: 'keyword' }
              }
            },
            images: { type: 'keyword' },
            tags: { 
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'custom_text_analyzer' }
              }
            },
            userId: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            status: { type: 'keyword' },
            views: { type: 'long' },
            favorites: { type: 'long' },
            search_text: { type: 'text', analyzer: 'custom_text_analyzer' },
            popularity_score: { type: 'float' },
            freshness_score: { type: 'long' }
          }
        }
      };

      await this.client.indices.create({
        index: indexName,
        body: mapping
      });

      console.log(`✅ Created index: ${indexName}`);
    } catch (error) {
      console.error(`❌ Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Create the users index for user search
   */
  async createUsersIndex(): Promise<void> {
    const indexName = INDEX_NAMES.USERS;
    
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists.body) {
        console.log(`Index ${indexName} already exists`);
        return;
      }

      const mapping = {
        settings: {
          number_of_shards: SEARCH_CONFIG.INDEX_SHARDS,
          number_of_replicas: SEARCH_CONFIG.INDEX_REPLICAS,
          refresh_interval: '5s'
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            username: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            email: { type: 'keyword' },
            firstName: { type: 'text' },
            lastName: { type: 'text' },
            bio: { type: 'text' },
            location: {
              type: 'geo_point',
              fields: {
                city: { type: 'keyword' },
                state: { type: 'keyword' }
              }
            },
            rating: { type: 'float' },
            reviewCount: { type: 'long' },
            joinedAt: { type: 'date' },
            lastActiveAt: { type: 'date' },
            isVerified: { type: 'boolean' },
            profileImage: { type: 'keyword' }
          }
        }
      };

      await this.client.indices.create({
        index: indexName,
        body: mapping
      });

      console.log(`✅ Created index: ${indexName}`);
    } catch (error) {
      console.error(`❌ Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Create the categories index
   */
  async createCategoriesIndex(): Promise<void> {
    const indexName = INDEX_NAMES.CATEGORIES;
    
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists.body) {
        console.log(`Index ${indexName} already exists`);
        return;
      }

      const mapping = {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '30s'
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            description: { type: 'text' },
            parentId: { type: 'keyword' },
            level: { type: 'integer' },
            path: { type: 'keyword' },
            itemCount: { type: 'long' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      };

      await this.client.indices.create({
        index: indexName,
        body: mapping
      });

      console.log(`✅ Created index: ${indexName}`);
    } catch (error) {
      console.error(`❌ Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Create the search logs index for analytics
   */
  async createSearchLogsIndex(): Promise<void> {
    const indexName = INDEX_NAMES.SEARCH_LOGS;
    
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists.body) {
        console.log(`Index ${indexName} already exists`);
        return;
      }

      const mapping = {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '30s'
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            query: { type: 'text' },
            timestamp: { type: 'date' },
            resultsCount: { type: 'long' },
            responseTime: { type: 'long' },
            filters: { type: 'object' },
            userId: { type: 'keyword' },
            sessionId: { type: 'keyword' },
            userAgent: { type: 'text' },
            ipAddress: { type: 'ip' }
          }
        }
      };

      await this.client.indices.create({
        index: indexName,
        body: mapping
      });

      console.log(`✅ Created index: ${indexName}`);
    } catch (error) {
      console.error(`❌ Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Delete all LocalEx indices
   */
  async deleteAllIndices(): Promise<void> {
    console.log('IndexService: Deleting all LocalEx indices...');

    try {
      const indices = Object.values(INDEX_NAMES);
      
      for (const indexName of indices) {
        try {
          const exists = await this.client.indices.exists({ index: indexName });
          if (exists.body) {
            await this.client.indices.delete({ index: indexName });
            console.log(`✅ Deleted index: ${indexName}`);
          }
        } catch (error) {
          console.error(`❌ Failed to delete index ${indexName}:`, error);
        }
      }

      console.log('✅ All indices deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete indices:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const indices = Object.values(INDEX_NAMES);
      const stats = await this.client.indices.stats({ index: indices.join(',') });
      
      return {
        indices: stats.body['indices'],
        total: stats.body['_all']
      };
    } catch (error) {
      console.error('IndexService: Failed to get index stats:', error);
      throw error;
    }
  }

  /**
   * Refresh indices for immediate search availability
   */
  async refreshIndices(): Promise<void> {
    try {
      const indices = Object.values(INDEX_NAMES);
      await this.client.indices.refresh({ index: indices.join(',') });
      console.log('✅ Indices refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh indices:', error);
      throw error;
    }
  }

  /**
   * Optimize indices for better performance
   */
  async optimizeIndices(): Promise<void> {
    try {
      const indices = Object.values(INDEX_NAMES);
      
      for (const indexName of indices) {
        try {
          await this.client.indices.forcemerge({ 
            index: indexName,
            max_num_segments: 1
          });
          console.log(`✅ Optimized index: ${indexName}`);
        } catch (error) {
          console.error(`❌ Failed to optimize index ${indexName}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to optimize indices:', error);
      throw error;
    }
  }

  /**
   * Create index templates for consistent index creation
   */
  async createIndexTemplates(): Promise<void> {
    console.log('IndexService: Creating index templates...');

    const templates = [
      {
        name: 'localex-items-template',
        patterns: [`${SEARCH_CONFIG.INDEX_PREFIX}_items*`],
        settings: {
          number_of_shards: SEARCH_CONFIG.INDEX_SHARDS,
          number_of_replicas: SEARCH_CONFIG.INDEX_REPLICAS,
          refresh_interval: SEARCH_CONFIG.REFRESH_INTERVAL
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: { type: 'text' },
            description: { type: 'text' },
            category: { type: 'keyword' },
            price: { type: 'double' },
            condition: { type: 'keyword' },
            location: { type: 'geo_point' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      }
    ];

    for (const template of templates) {
      try {
        await this.client.indices.putIndexTemplate({
          name: template.name,
          body: template
        });
        console.log(`✅ Created index template: ${template.name}`);
      } catch (error) {
        console.error(`❌ Failed to create template ${template.name}:`, error);
      }
    }
  }

  /**
   * Health check for all indices
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const indices = Object.values(INDEX_NAMES);
      const health = await this.client.cluster.health({
        index: indices.join(','),
        wait_for_status: 'yellow',
        timeout: '10s'
      });

      const stats = await this.getIndexStats();

      return {
        status: health.body['status'],
        details: {
          cluster: health.body,
          indices: stats
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

export const indexService = new IndexService();
