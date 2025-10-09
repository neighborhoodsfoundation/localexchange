import { opensearchClient, INDEX_NAMES, SEARCH_CONFIG } from '../config/opensearch';
import { cacheService } from './cache.service';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort[];
  pagination?: PaginationOptions;
  highlights?: boolean;
}

export interface SearchFilters {
  category?: string[];
  priceMin?: number;
  priceMax?: number;
  condition?: string[];
  location?: GeoLocationFilter;
  userId?: string;
  tags?: string[];
  dateRange?: DateRangeFilter;
}

export interface GeoLocationFilter {
  lat: number;
  lon: number;
  distance: string; // e.g., "10km", "5mi"
}

export interface DateRangeFilter {
  from: string; // ISO date string
  to: string;   // ISO date string
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page?: number;
  size?: number;
  from?: number;
}

export interface SearchResults {
  hits: SearchHit[];
  total: number;
  maxScore: number;
  took: number;
  aggregations?: Record<string, any>;
  suggestions?: SearchSuggestion[];
}

export interface SearchHit {
  id: string;
  score: number;
  source: any;
  highlights?: Record<string, string[]>;
}

export interface SearchSuggestion {
  text: string;
  score: number;
}

export interface SearchAnalytics {
  query: string;
  timestamp: number;
  resultsCount: number;
  responseTime: number;
  filters?: SearchFilters;
  userId?: string;
}

export interface ItemDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  condition: string;
  location: {
    lat: number;
    lon: number;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  images: string[];
  tags: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'sold' | 'pending' | 'draft';
  views: number;
  favorites: number;
}

class SearchService {
  private readonly client = opensearchClient;
  private readonly cache = cacheService;
  private readonly cachePrefix = 'search:';
  private readonly cacheTTL = 300; // 5 minutes

  /**
   * Perform a basic search across all item fields
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(query);
      
      // Try cache first
      const cached = await this.cache.get<SearchResults>(cacheKey);
      if (cached) {
        console.log(`SearchService: Cache hit for query: ${query.query}`);
        return cached;
      }

      // Build search request
      const searchRequest = this.buildSearchRequest(query);
      
      // Execute search
      const response = await this.client.search({
        index: INDEX_NAMES.ITEMS,
        body: searchRequest,
        timeout: `${SEARCH_CONFIG.QUERY_TIMEOUT}ms`
      });

      // Process results
      const results = this.processSearchResponse(response.body);
      
      // Cache results
      await this.cache.set(cacheKey, results, { ttl: this.cacheTTL });
      
      // Log analytics
      const analyticsData: SearchAnalytics = {
        query: query.query,
        timestamp: Date.now(),
        resultsCount: results.total,
        responseTime: Date.now() - startTime,
      };
      if (query.filters) {
        analyticsData.filters = query.filters;
      }
      await this.logSearchAnalytics(analyticsData);

      return results;
    } catch (error) {
      console.error('SearchService: Search failed:', error);
      throw new Error(`Search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(partial: string, limit: number = 10): Promise<SearchSuggestion[]> {
    if (!partial || partial.length < 2) {
      return [];
    }

    try {
      const response = await this.client.search({
        index: INDEX_NAMES.ITEMS,
        body: {
          suggest: {
            title_suggest: {
              prefix: partial,
              completion: {
                field: 'title.suggest',
                size: limit,
                skip_duplicates: true
              }
            }
          },
          size: 0
        }
      });

      const suggestions = response.body['suggest']?.['title_suggest']?.[0]?.['options'] || [];
      return suggestions.map((option: any) => ({
        text: option.text,
        score: option._score
      }));
    } catch (error) {
      console.error('SearchService: Suggestions failed:', error);
      return [];
    }
  }

  /**
   * Index a new item document
   */
  async indexItem(item: ItemDocument): Promise<void> {
    try {
      await this.client.index({
        index: INDEX_NAMES.ITEMS,
        id: item.id,
        body: this.prepareItemDocument(item),
        refresh: true
      });

      // Invalidate related caches
      await this.invalidateRelatedCaches(item);
      
      console.log(`SearchService: Indexed item: ${item.id}`);
    } catch (error) {
      console.error(`SearchService: Failed to index item ${item.id}:`, error);
      throw new Error(`Failed to index item: ${(error as Error).message}`);
    }
  }

  /**
   * Update an existing item document
   */
  async updateItem(itemId: string, updates: Partial<ItemDocument>): Promise<void> {
    try {
      await this.client.update({
        index: INDEX_NAMES.ITEMS,
        id: itemId,
        body: {
          doc: this.prepareItemDocument(updates as ItemDocument)
        },
        refresh: true
      });

      // Invalidate related caches
      await this.invalidateItemCaches(itemId);
      
      console.log(`SearchService: Updated item: ${itemId}`);
    } catch (error) {
      console.error(`SearchService: Failed to update item ${itemId}:`, error);
      throw new Error(`Failed to update item: ${(error as Error).message}`);
    }
  }

  /**
   * Delete an item document
   */
  async deleteItem(itemId: string): Promise<void> {
    try {
      await this.client.delete({
        index: INDEX_NAMES.ITEMS,
        id: itemId,
        refresh: true
      });

      // Invalidate related caches
      await this.invalidateItemCaches(itemId);
      
      console.log(`SearchService: Deleted item: ${itemId}`);
    } catch (error) {
      console.error(`SearchService: Failed to delete item ${itemId}:`, error);
      throw new Error(`Failed to delete item: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk index multiple items
   */
  async bulkIndexItems(items: ItemDocument[]): Promise<void> {
    if (items.length === 0) return;

    try {
      const body = [];
      
      for (const item of items) {
        body.push({
          index: {
            _index: INDEX_NAMES.ITEMS,
            _id: item.id
          }
        });
        body.push(this.prepareItemDocument(item));
      }

      await this.client.bulk({
        body,
        refresh: true
      });

      console.log(`SearchService: Bulk indexed ${items.length} items`);
    } catch (error) {
      console.error('SearchService: Bulk index failed:', error);
      throw new Error(`Bulk index failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get search analytics for monitoring
   */
  async getSearchAnalytics(timeRange: { from: string; to: string }): Promise<SearchAnalytics[]> {
    try {
      const response = await this.client.search({
        index: INDEX_NAMES.SEARCH_LOGS,
        body: {
          query: {
            range: {
              timestamp: {
                gte: timeRange.from,
                lte: timeRange.to
              }
            }
          },
          sort: [{ timestamp: { order: 'desc' } }],
          size: 1000
        }
      });

      return response.body['hits']['hits'].map((hit: any) => hit._source);
    } catch (error) {
      console.error('SearchService: Analytics query failed:', error);
      return [];
    }
  }

  /**
   * Health check for search service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const clusterHealth = await this.client.cluster.health({
        wait_for_status: 'yellow',
        timeout: '10s'
      });

      const indices = await this.client.cat.indices({
        index: INDEX_NAMES.ITEMS,
        format: 'json'
      });

      return {
        status: clusterHealth.body['status'],
        details: {
          cluster: clusterHealth.body,
          indices: indices.body
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: (error as Error).message }
      };
    }
  }

  // Private helper methods

  private buildSearchRequest(query: SearchQuery): any {
    const { query: queryText, filters, sort, pagination, highlights } = query;
    
    const searchRequest: any = {
      query: this.buildQuery(queryText, filters),
      size: pagination?.size || SEARCH_CONFIG.DEFAULT_PAGE_SIZE,
      from: pagination?.from || ((pagination?.page || 1) - 1) * (pagination?.size || SEARCH_CONFIG.DEFAULT_PAGE_SIZE),
    };

    // Add sorting
    if (sort && sort.length > 0) {
      searchRequest.sort = sort.map(s => ({ [s.field]: { order: s.order } }));
    } else {
      // Default sort by relevance and freshness
      searchRequest.sort = [
        { _score: { order: 'desc' } },
        { createdAt: { order: 'desc' } }
      ];
    }

    // Add highlights
    if (highlights) {
      searchRequest.highlight = {
        fields: {
          'title': { fragment_size: 150, number_of_fragments: 1 },
          'description': { fragment_size: 150, number_of_fragments: 2 }
        }
      };
    }

    // Add aggregations for faceted search
    searchRequest.aggs = this.buildAggregations();

    return searchRequest;
  }

  private buildQuery(queryText: string, filters?: SearchFilters): any {
    const mustQueries: any[] = [];
    const filterQueries: any[] = [];

    // Main text query
    if (queryText && queryText.trim()) {
      mustQueries.push({
        multi_match: {
          query: queryText,
          fields: ['title^3', 'description^2', 'tags^1.5', 'category'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    } else {
      // Match all if no query text
      mustQueries.push({ match_all: {} });
    }

    // Add filters
    if (filters) {
      // Category filter
      if (filters.category && filters.category.length > 0) {
        filterQueries.push({
          terms: { category: filters.category }
        });
      }

      // Price range filter
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        const priceRange: any = {};
        if (filters.priceMin !== undefined) priceRange.gte = filters.priceMin;
        if (filters.priceMax !== undefined) priceRange.lte = filters.priceMax;
        filterQueries.push({ range: { price: priceRange } });
      }

      // Condition filter
      if (filters.condition && filters.condition.length > 0) {
        filterQueries.push({
          terms: { condition: filters.condition }
        });
      }

      // Location filter (geo distance)
      if (filters.location) {
        filterQueries.push({
          geo_distance: {
            distance: filters.location.distance,
            location: {
              lat: filters.location.lat,
              lon: filters.location.lon
            }
          }
        });
      }

      // User filter
      if (filters.userId) {
        filterQueries.push({
          term: { userId: filters.userId }
        });
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        filterQueries.push({
          terms: { tags: filters.tags }
        });
      }

      // Date range filter
      if (filters.dateRange) {
        filterQueries.push({
          range: {
            createdAt: {
              gte: filters.dateRange.from,
              lte: filters.dateRange.to
            }
          }
        });
      }
    }

    // Only show active items
    filterQueries.push({
      term: { status: 'active' }
    });

    return {
      bool: {
        must: mustQueries,
        filter: filterQueries
      }
    };
  }

  private buildAggregations(): any {
    return {
      categories: {
        terms: { field: 'category', size: 20 }
      },
      conditions: {
        terms: { field: 'condition', size: 10 }
      },
      price_ranges: {
        histogram: {
          field: 'price',
          interval: 50,
          min_doc_count: 1
        }
      },
      tags: {
        terms: { field: 'tags', size: 20 }
      }
    };
  }

  private processSearchResponse(response: any): SearchResults {
    const hits = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      highlights: hit.highlight
    }));

    return {
      hits,
      total: response.hits.total.value || response.hits.total,
      maxScore: response.hits.max_score || 0,
      took: response.took,
      aggregations: response.aggregations
    };
  }

  private prepareItemDocument(item: ItemDocument): any {
    return {
      ...item,
      title: {
        text: item.title,
        suggest: {
          input: item.title.split(' '),
          weight: item.favorites + 1
        }
      },
      // Add computed fields for better search
      search_text: `${item.title} ${item.description} ${item.tags.join(' ')}`,
      popularity_score: item.favorites + (item.views * 0.1),
      freshness_score: Date.now() - new Date(item.createdAt).getTime()
    };
  }

  private generateCacheKey(query: SearchQuery): string {
    const keyData = {
      q: query.query,
      f: query.filters,
      s: query.sort,
      p: query.pagination
    };
    return `${this.cachePrefix}${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private async invalidateRelatedCaches(item: ItemDocument): Promise<void> {
    // Invalidate caches that might contain this item
    const patterns = [
      `${this.cachePrefix}*`,
      `items:${item.id}`,
      `user:${item.userId}:items`,
      `category:${item.category}:items`
    ];

    for (const pattern of patterns) {
      await this.cache.invalidatePattern(pattern);
    }
  }

  private async invalidateItemCaches(itemId: string): Promise<void> {
    const patterns = [
      `${this.cachePrefix}*`,
      `items:${itemId}`
    ];

    for (const pattern of patterns) {
      await this.cache.invalidatePattern(pattern);
    }
  }

  private async logSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      await this.client.index({
        index: INDEX_NAMES.SEARCH_LOGS,
        body: {
          ...analytics,
          id: uuidv4()
        }
      });
    } catch (error) {
      console.error('SearchService: Failed to log analytics:', error);
      // Don't throw - analytics failure shouldn't break search
    }
  }
}

export const searchService = new SearchService();
