/**
 * LocalEx Queue Service
 * Robust job queue system with idempotency and retry mechanisms
 */

import { queueRedis, QUEUE_CONFIG, QUEUE_NAMES, redisUtils } from '../config/redis';
import crypto from 'crypto';
import { EventEmitter } from 'events';

interface JobData {
  id: string;
  type: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  delay?: number;
  priority?: number;
}

interface JobOptions {
  delay?: number;
  priority?: number;
  maxAttempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

class QueueService extends EventEmitter {
  private workers: Map<string, (job: JobData) => Promise<void>> = new Map();
  private isProcessing = false;
  private stats: QueueStats = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    total: 0,
  };

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    queueRedis.on('error', (error) => {
      console.error('Queue Redis error:', error);
      this.emit('error', error);
    });

    queueRedis.on('connect', () => {
      console.log('✅ Queue Redis connected');
      this.emit('connected');
    });
  }

  /**
   * Generate unique job ID with idempotency
   */
  private generateJobId(type: string, data: any): string {
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ type, data }))
      .digest('hex')
      .substring(0, 16);
    
    return `${type}:${dataHash}:${Date.now()}`;
  }

  /**
   * Add job to queue with idempotency
   */
  async addJob(
    queueName: string,
    jobType: string,
    jobData: any,
    options: JobOptions = {}
  ): Promise<string> {
    try {
      if (!redisUtils.isConnected(queueRedis)) {
        throw new Error('Queue Redis not connected');
      }

      const jobId = this.generateJobId(jobType, jobData);
      const idempotencyKey = `idempotency:${jobId}`;
      
      // Check for existing job using Redis SET NX (set if not exists)
      const isNewJob = await queueRedis.set(idempotencyKey, '1', 'EX', 3600, 'NX');
      
      if (!isNewJob) {
        // Job already exists, return existing job ID
        console.log(`Job already exists: ${jobId}`);
        return jobId;
      }

      const job: JobData = {
        id: jobId,
        type: jobType,
        data: jobData,
        attempts: 0,
        maxAttempts: options.maxAttempts || QUEUE_CONFIG.MAX_ATTEMPTS,
        createdAt: Date.now(),
        delay: options.delay,
        priority: options.priority || 0,
      };

      // Store job data
      const jobKey = `job:${jobId}`;
      await queueRedis.setex(jobKey, 86400, redisUtils.serialize(job)); // 24 hour TTL

      // Add to queue based on delay and priority
      const score = options.delay ? Date.now() + options.delay : Date.now();
      const queueKey = options.delay ? `${queueName}:delayed` : `${queueName}:waiting`;
      
      await queueRedis.zadd(queueKey, score, jobId);
      
      this.stats.waiting++;
      this.stats.total++;
      this.updateStats();

      this.emit('jobAdded', { queueName, jobId, jobType });
      
      return jobId;
    } catch (error) {
      console.error('Add job error:', error);
      throw error;
    }
  }

  /**
   * Register job processor
   */
  registerProcessor(queueName: string, jobType: string, processor: (job: JobData) => Promise<void>): void {
    const key = `${queueName}:${jobType}`;
    this.workers.set(key, processor);
    console.log(`Registered processor for ${queueName}:${jobType}`);
  }

  /**
   * Start processing jobs
   */
  async startProcessing(queueName: string): Promise<void> {
    if (this.isProcessing) {
      console.log(`Queue ${queueName} is already processing`);
      return;
    }

    this.isProcessing = true;
    console.log(`Starting job processing for queue: ${queueName}`);

    // Process jobs in parallel
    const concurrency = QUEUE_CONFIG.CONCURRENCY;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(this.processJobs(queueName));
    }

    await Promise.all(promises);
  }

  /**
   * Process jobs from queue
   */
  private async processJobs(queueName: string): Promise<void> {
    while (this.isProcessing) {
      try {
        // Check for delayed jobs first
        await this.processDelayedJobs(queueName);
        
        // Process waiting jobs
        const jobId = await this.getNextJob(queueName);
        
        if (jobId) {
          await this.processJob(queueName, jobId);
        } else {
          // No jobs available, wait a bit
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Job processing error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process delayed jobs
   */
  private async processDelayedJobs(queueName: string): Promise<void> {
    try {
      const delayedQueueKey = `${queueName}:delayed`;
      const now = Date.now();
      
      // Get jobs that are ready to be processed
      const readyJobs = await queueRedis.zrangebyscore(delayedQueueKey, 0, now);
      
      if (readyJobs.length > 0) {
        // Move ready jobs to waiting queue
        const pipeline = queueRedis.pipeline();
        
        for (const jobId of readyJobs) {
          pipeline.zrem(delayedQueueKey, jobId);
          pipeline.zadd(`${queueName}:waiting`, now, jobId);
        }
        
        await pipeline.exec();
        
        this.stats.delayed -= readyJobs.length;
        this.stats.waiting += readyJobs.length;
        this.updateStats();
      }
    } catch (error) {
      console.error('Process delayed jobs error:', error);
    }
  }

  /**
   * Get next job from queue
   */
  private async getNextJob(queueName: string): Promise<string | null> {
    try {
      const waitingQueueKey = `${queueName}:waiting`;
      
      // Get job with highest priority (lowest score)
      const result = await queueRedis.zpopmin(waitingQueueKey, 1);
      
      if (result && result.length > 0) {
        return result[0];
      }
      
      return null;
    } catch (error) {
      console.error('Get next job error:', error);
      return null;
    }
  }

  /**
   * Process individual job
   */
  private async processJob(queueName: string, jobId: string): Promise<void> {
    try {
      const jobKey = `job:${jobId}`;
      const jobData = await queueRedis.get(jobKey);
      
      if (!jobData) {
        console.log(`Job ${jobId} not found, skipping`);
        return;
      }

      const job: JobData = redisUtils.deserialize(jobData);
      
      // Update job status
      job.attempts++;
      job.processedAt = Date.now();
      
      await queueRedis.setex(jobKey, 86400, redisUtils.serialize(job));
      
      this.stats.waiting--;
      this.stats.active++;
      this.updateStats();

      // Find processor for this job type
      const processorKey = `${queueName}:${job.type}`;
      const processor = this.workers.get(processorKey);
      
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.type}`);
      }

      this.emit('jobStarted', { queueName, jobId, job });
      
      try {
        // Process the job
        await processor(job);
        
        // Job completed successfully
        job.completedAt = Date.now();
        await this.completeJob(jobId, job);
        
        this.emit('jobCompleted', { queueName, jobId, job });
        
      } catch (error) {
        // Job failed
        job.failedAt = Date.now();
        job.error = error instanceof Error ? error.message : String(error);
        
        await this.handleJobFailure(queueName, jobId, job);
        
        this.emit('jobFailed', { queueName, jobId, job, error });
      }
      
    } catch (error) {
      console.error(`Process job ${jobId} error:`, error);
      this.stats.active--;
      this.updateStats();
    }
  }

  /**
   * Complete job successfully
   */
  private async completeJob(jobId: string, job: JobData): Promise<void> {
    try {
      const jobKey = `job:${jobId}`;
      await queueRedis.setex(jobKey, 86400, redisUtils.serialize(job));
      
      // Add to completed queue for tracking
      await queueRedis.lpush('completed:jobs', jobId);
      await queueRedis.ltrim('completed:jobs', 0, 999); // Keep last 1000
      
      this.stats.active--;
      this.stats.completed++;
      this.updateStats();
      
    } catch (error) {
      console.error('Complete job error:', error);
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(queueName: string, jobId: string, job: JobData): Promise<void> {
    try {
      const jobKey = `job:${jobId}`;
      
      if (job.attempts < job.maxAttempts) {
        // Retry job with exponential backoff
        const backoffDelay = QUEUE_CONFIG.BACKOFF_DELAY * Math.pow(2, job.attempts - 1);
        
        await queueRedis.setex(jobKey, 86400, redisUtils.serialize(job));
        await queueRedis.zadd(`${queueName}:waiting`, Date.now() + backoffDelay, jobId);
        
        this.stats.active--;
        this.stats.waiting++;
        
      } else {
        // Max attempts reached, mark as failed
        await queueRedis.setex(jobKey, 86400, redisUtils.serialize(job));
        await queueRedis.lpush('failed:jobs', jobId);
        await queueRedis.ltrim('failed:jobs', 0, 999); // Keep last 1000
        
        this.stats.active--;
        this.stats.failed++;
      }
      
      this.updateStats();
      
    } catch (error) {
      console.error('Handle job failure error:', error);
    }
  }

  /**
   * Stop processing jobs
   */
  async stopProcessing(): Promise<void> {
    this.isProcessing = false;
    console.log('Stopping job processing...');
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobData | null> {
    try {
      const jobKey = `job:${jobId}`;
      const jobData = await queueRedis.get(jobKey);
      
      if (!jobData) {
        return null;
      }
      
      return redisUtils.deserialize(jobData);
    } catch (error) {
      console.error('Get job status error:', error);
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<QueueStats> {
    try {
      const waitingCount = await queueRedis.zcard(`${queueName}:waiting`);
      const delayedCount = await queueRedis.zcard(`${queueName}:delayed`);
      const completedCount = await queueRedis.llen('completed:jobs');
      const failedCount = await queueRedis.llen('failed:jobs');
      
      return {
        waiting: waitingCount,
        active: this.stats.active,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
        total: waitingCount + delayedCount + completedCount + failedCount + this.stats.active,
      };
    } catch (error) {
      console.error('Get queue stats error:', error);
      return this.stats;
    }
  }

  /**
   * Clear completed jobs
   */
  async clearCompletedJobs(): Promise<number> {
    try {
      const count = await queueRedis.llen('completed:jobs');
      await queueRedis.del('completed:jobs');
      return count;
    } catch (error) {
      console.error('Clear completed jobs error:', error);
      return 0;
    }
  }

  /**
   * Clear failed jobs
   */
  async clearFailedJobs(): Promise<number> {
    try {
      const count = await queueRedis.llen('failed:jobs');
      await queueRedis.del('failed:jobs');
      return count;
    } catch (error) {
      console.error('Clear failed jobs error:', error);
      return 0;
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.emit('statsUpdated', this.stats);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    processing: boolean;
    stats: QueueStats;
  }> {
    const connected = redisUtils.isConnected(queueRedis);
    const stats = await this.getQueueStats('default');
    
    return {
      status: connected ? 'healthy' : 'unhealthy',
      connected,
      processing: this.isProcessing,
      stats,
    };
  }
}

// Export singleton instance
export const queueService = new QueueService();
export default queueService;
