/**
 * Data Retention Policies for LocalEx
 * Implements GDPR compliance and explicit retention windows from v5 architecture
 */

export interface RetentionPolicy {
  dataType: string;
  retentionPeriod: number; // milliseconds
  description: string;
  legalBasis: string;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
}

export interface DSRConfig {
  requestType: 'EXPORT' | 'DELETE' | 'RECTIFY' | 'PORT';
  slaDeadline: number; // milliseconds
  description: string;
}

/**
 * Data Retention Policies (CRITICAL FIX from v5 architecture)
 */
export const RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  // PII Data - 7 years retention
  userProfiles: {
    dataType: 'user_profiles',
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    description: 'User profile information including personal details',
    legalBasis: 'Contract performance and legal obligations',
    autoDelete: true,
    archiveBeforeDelete: true
  },

  verificationData: {
    dataType: 'verification_data',
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    description: 'Identity verification documents and data',
    legalBasis: 'Legal obligations and fraud prevention',
    autoDelete: true,
    archiveBeforeDelete: true
  },

  chatMessages: {
    dataType: 'chat_messages',
    retentionPeriod: 18 * 30 * 24 * 60 * 60 * 1000, // 18 months
    description: 'User-to-user chat messages and communications',
    legalBasis: 'Legitimate interest for dispute resolution',
    autoDelete: true,
    archiveBeforeDelete: false
  },

  tradeHistory: {
    dataType: 'trade_history',
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    description: 'Complete trading transaction history',
    legalBasis: 'Legal obligations and audit requirements',
    autoDelete: false, // Never auto-delete financial records
    archiveBeforeDelete: true
  },

  // Image Data - 12 months retention
  itemPhotos: {
    dataType: 'item_photos',
    retentionPeriod: 12 * 30 * 24 * 60 * 60 * 1000, // 12 months
    description: 'Item listing photographs',
    legalBasis: 'Contract performance',
    autoDelete: true,
    archiveBeforeDelete: true
  },

  profilePhotos: {
    dataType: 'profile_photos',
    retentionPeriod: 12 * 30 * 24 * 60 * 60 * 1000, // 12 months
    description: 'User profile photographs',
    legalBasis: 'Consent-based',
    autoDelete: true,
    archiveBeforeDelete: true
  },

  verificationPhotos: {
    dataType: 'verification_photos',
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    description: 'Identity verification photographs',
    legalBasis: 'Legal obligations',
    autoDelete: true,
    archiveBeforeDelete: true
  },

  // Financial Data - Permanent retention
  ledgerEntries: {
    dataType: 'ledger_entries',
    retentionPeriod: -1, // Permanent - never delete
    description: 'Financial ledger entries (double-entry accounting)',
    legalBasis: 'Legal obligations and audit requirements',
    autoDelete: false,
    archiveBeforeDelete: false
  },

  transactionLogs: {
    dataType: 'transaction_logs',
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    description: 'Transaction audit logs',
    legalBasis: 'Legal obligations and audit requirements',
    autoDelete: true,
    archiveBeforeDelete: true
  },

  // System Data
  systemLogs: {
    dataType: 'system_logs',
    retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
    description: 'System and application logs',
    legalBasis: 'Legitimate interest for system maintenance',
    autoDelete: true,
    archiveBeforeDelete: false
  },

  analyticsData: {
    dataType: 'analytics_data',
    retentionPeriod: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    description: 'User behavior and analytics data',
    legalBasis: 'Legitimate interest for service improvement',
    autoDelete: true,
    archiveBeforeDelete: false
  }
};

/**
 * Data Subject Request (DSR) SLA Configuration (CRITICAL FIX from v5 architecture)
 */
export const DSR_SLA_CONFIG: Record<string, DSRConfig> = {
  dataExport: {
    requestType: 'EXPORT',
    slaDeadline: 30 * 24 * 60 * 60 * 1000, // 30 days
    description: 'Complete data export in machine-readable format'
  },

  dataDeletion: {
    requestType: 'DELETE',
    slaDeadline: 30 * 24 * 60 * 60 * 1000, // 30 days
    description: 'Complete data deletion with verification'
  },

  dataRectification: {
    requestType: 'RECTIFY',
    slaDeadline: 7 * 24 * 60 * 60 * 1000, // 7 days
    description: 'Data correction and update requests'
  },

  dataPortability: {
    requestType: 'PORT',
    slaDeadline: 14 * 24 * 60 * 60 * 1000, // 14 days
    description: 'Data portability in standard format'
  }
};

/**
 * Data Retention Service Implementation
 */
export class DataRetentionService {
  private readonly policies = RETENTION_POLICIES;
  private readonly dsrConfig = DSR_SLA_CONFIG;

  /**
   * Check if data should be deleted based on retention policy
   */
  shouldDeleteData(dataType: string, createdAt: Date): boolean {
    const policy = this.policies[dataType];
    if (!policy || !policy.autoDelete) {
      return false;
    }

    const age = Date.now() - createdAt.getTime();
    return age > policy.retentionPeriod;
  }

  /**
   * Get retention policy for data type
   */
  getRetentionPolicy(dataType: string): RetentionPolicy | null {
    return this.policies[dataType] || null;
  }

  /**
   * Get DSR SLA configuration
   */
  getDSRSLA(requestType: string): DSRConfig | null {
    return this.dsrConfig[requestType] || null;
  }

  /**
   * Calculate deletion date for data
   */
  getDeletionDate(dataType: string, createdAt: Date): Date | null {
    const policy = this.policies[dataType];
    if (!policy || !policy.autoDelete) {
      return null;
    }

    return new Date(createdAt.getTime() + policy.retentionPeriod);
  }

  /**
   * Get all data types that require archiving before deletion
   */
  getArchivableDataTypes(): string[] {
    return Object.entries(this.policies)
      .filter(([_, policy]) => policy.archiveBeforeDelete)
      .map(([dataType, _]) => dataType);
  }

  /**
   * Validate retention policy compliance
   */
  validateCompliance(dataType: string, createdAt: Date): {
    compliant: boolean;
    daysRemaining: number;
    policy: RetentionPolicy;
  } {
    const policy = this.policies[dataType];
    if (!policy) {
      throw new Error(`No retention policy found for data type: ${dataType}`);
    }

    const age = Date.now() - createdAt.getTime();
    const daysRemaining = Math.max(0, (policy.retentionPeriod - age) / (24 * 60 * 60 * 1000));

    return {
      compliant: !policy.autoDelete || age <= policy.retentionPeriod,
      daysRemaining: Math.floor(daysRemaining),
      policy
    };
  }
}

/**
 * Data Subject Request Handler
 */
export class DSRHandler {
  private readonly retentionService = new DataRetentionService();

  /**
   * Process Data Subject Request with SLA tracking
   */
  async handleDSRRequest(
    userId: string,
    requestType: 'EXPORT' | 'DELETE' | 'RECTIFY' | 'PORT'
  ): Promise<{
    requestId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    slaDeadline: Date;
    estimatedCompletion: Date;
    dataTypes: string[];
  }> {
    const startTime = Date.now();
    const slaConfig = this.retentionService.getDSRSLA(requestType);
    
    if (!slaConfig) {
      throw new Error(`Invalid DSR request type: ${requestType}`);
    }

    const requestId = `dsr_${userId}_${Date.now()}`;
    const slaDeadline = new Date(startTime + slaConfig.slaDeadline);
    const estimatedCompletion = new Date(startTime + (slaConfig.slaDeadline * 0.8)); // 80% of SLA

    // Get all data types for this user
    const dataTypes = await this.getUserDataTypes(userId);

    return {
      requestId,
      status: 'PROCESSING',
      slaDeadline,
      estimatedCompletion,
      dataTypes
    };
  }

  /**
   * Get all data types associated with a user
   */
  private async getUserDataTypes(_userId: string): Promise<string[]> {
    // This would query the database to find all data types for the user
    return Object.keys(RETENTION_POLICIES);
  }
}

export default {
  RETENTION_POLICIES,
  DSR_SLA_CONFIG,
  DataRetentionService,
  DSRHandler
};
