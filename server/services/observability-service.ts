import type { IStorage } from "../storage";
import { EventEmitter } from 'events';

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
  tenantId?: string;
}

export interface SLAThreshold {
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  windowMs: number; // Time window for evaluation
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface StuckOperation {
  id: string;
  type: string;
  tenantId: string;
  startTime: Date;
  timeoutMs: number;
  metadata?: Record<string, any>;
  status: 'active' | 'timed_out' | 'completed';
}

export interface AlertEvent {
  id: string;
  type: 'sla_breach' | 'stuck_operation' | 'performance_degradation' | 'business_threshold';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  tenantId?: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export class ObservabilityService extends EventEmitter {
  private storage: IStorage;
  private metrics: Map<string, MetricPoint[]> = new Map();
  private slaThresholds: Map<string, SLAThreshold> = new Map();
  private stuckOperations: Map<string, StuckOperation> = new Map();
  private alerts: Map<string, AlertEvent> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private stuckOperationCheckInterval?: NodeJS.Timeout;
  
  // Performance tracking
  private performanceMetrics = {
    requestDurations: new Map<string, number[]>(),
    errorRates: new Map<string, number>(),
    activeConnections: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };

  constructor(storage: IStorage) {
    super();
    this.storage = storage;
    this.initializeDefaultSLAs();
    console.log('🔍 Observability service initialized');
  }

  /**
   * Start monitoring services
   */
  start() {
    console.log('📊 Starting observability monitoring...');
    
    // Monitor SLA thresholds every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkSLAThresholds();
      this.collectSystemMetrics();
    }, 30000);
    
    // Check for stuck operations every 60 seconds
    this.stuckOperationCheckInterval = setInterval(() => {
      this.detectStuckOperations();
    }, 60000);
    
    console.log('✅ Observability monitoring started');
  }

  /**
   * Stop monitoring services
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.stuckOperationCheckInterval) {
      clearInterval(this.stuckOperationCheckInterval);
    }
    console.log('🛑 Observability monitoring stopped');
  }

  /**
   * Record a metric point
   */
  recordMetric(metric: Omit<MetricPoint, 'timestamp'>) {
    const point: MetricPoint = {
      ...metric,
      timestamp: new Date()
    };
    
    const key = `${metric.name}_${metric.tenantId || 'global'}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const points = this.metrics.get(key)!;
    points.push(point);
    
    // Keep only last 1000 points per metric
    if (points.length > 1000) {
      points.splice(0, points.length - 1000);
    }
    
    // Emit metric event for real-time processing
    this.emit('metric_recorded', point);
  }

  /**
   * Start tracking an operation for stuck detection
   */
  startOperation(id: string, type: string, tenantId: string, timeoutMs: number = 300000, metadata?: Record<string, any>) {
    const operation: StuckOperation = {
      id,
      type,
      tenantId,
      startTime: new Date(),
      timeoutMs,
      metadata,
      status: 'active'
    };
    
    this.stuckOperations.set(id, operation);
    console.log(`🎯 Tracking operation: ${type} (${id}) - timeout in ${timeoutMs}ms`);
  }

  /**
   * Complete a tracked operation
   */
  completeOperation(id: string) {
    const operation = this.stuckOperations.get(id);
    if (operation) {
      operation.status = 'completed';
      const duration = Date.now() - operation.startTime.getTime();
      
      // Record completion metric
      this.recordMetric({
        name: 'operation_duration',
        value: duration,
        labels: { type: operation.type, status: 'completed' },
        tenantId: operation.tenantId
      });
      
      // Remove from tracking
      this.stuckOperations.delete(id);
      console.log(`✅ Operation completed: ${operation.type} (${id}) in ${duration}ms`);
    }
  }

  /**
   * Record request performance
   */
  recordRequestPerformance(path: string, method: string, duration: number, statusCode: number, tenantId?: string) {
    const key = `${method}_${path}`;
    
    // Track duration
    if (!this.performanceMetrics.requestDurations.has(key)) {
      this.performanceMetrics.requestDurations.set(key, []);
    }
    const durations = this.performanceMetrics.requestDurations.get(key)!;
    durations.push(duration);
    
    // Keep only last 100 requests per endpoint
    if (durations.length > 100) {
      durations.splice(0, durations.length - 100);
    }
    
    // Record metrics for duration
    this.recordMetric({
      name: 'http_request_duration',
      value: duration,
      labels: { method, path, status: statusCode.toString() },
      tenantId
    });
    
    // FIXED: Record both success and error requests for accurate error rate calculation
    this.recordMetric({
      name: 'http_request_count',
      value: 1,
      labels: { method, path, status: statusCode.toString() },
      tenantId
    });
    
    // Record error specifically
    if (statusCode >= 400) {
      this.recordMetric({
        name: 'http_error_count',
        value: 1,
        labels: { method, path, status: statusCode.toString() },
        tenantId
      });
    }
  }

  /**
   * Record business metrics
   */
  recordBusinessMetric(name: string, value: number, tenantId?: string, labels?: Record<string, string>) {
    this.recordMetric({
      name: `business_${name}`,
      value,
      labels,
      tenantId
    });
  }

  /**
   * Get performance summary for an endpoint
   */
  getEndpointPerformance(method: string, path: string) {
    const key = `${method}_${path}`;
    const durations = this.performanceMetrics.requestDurations.get(key) || [];
    
    if (durations.length === 0) {
      return null;
    }
    
    const sorted = [...durations].sort((a, b) => a - b);
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: Math.min(...durations),
      max: Math.max(...durations)
    };
  }

  /**
   * Initialize default SLA thresholds
   */
  private initializeDefaultSLAs() {
    const defaultSLAs: SLAThreshold[] = [
      {
        name: 'api_response_time',
        metric: 'http_request_duration',
        threshold: 5000, // 5 seconds
        operator: 'gt',
        windowMs: 300000, // 5 minutes
        description: 'API response time should be under 5 seconds',
        severity: 'high'
      },
      {
        name: 'error_rate',
        metric: 'http_error_rate_computed',
        threshold: 0.05, // 5%
        operator: 'gt',
        windowMs: 600000, // 10 minutes
        description: 'Error rate should be under 5%',
        severity: 'critical'
      },
      {
        name: 'call_success_rate',
        metric: 'business_call_success_rate',
        threshold: 0.85, // 85%
        operator: 'lt',
        windowMs: 900000, // 15 minutes
        description: 'Call success rate should be above 85%',
        severity: 'high'
      },
      {
        name: 'appointment_confirmation_rate',
        metric: 'business_confirmation_rate',
        threshold: 0.70, // 70%
        operator: 'lt',
        windowMs: 1800000, // 30 minutes
        description: 'Appointment confirmation rate should be above 70%',
        severity: 'medium'
      },
      {
        name: 'webhook_processing_time',
        metric: 'operation_duration',
        threshold: 30000, // 30 seconds
        operator: 'gt',
        windowMs: 300000, // 5 minutes
        description: 'Webhook processing should complete within 30 seconds',
        severity: 'medium'
      }
    ];
    
    defaultSLAs.forEach(sla => {
      this.slaThresholds.set(sla.name, sla);
    });
    
    console.log(`📏 Initialized ${defaultSLAs.length} default SLA thresholds`);
  }

  /**
   * Check SLA thresholds and generate alerts
   */
  private async checkSLAThresholds() {
    for (const [name, sla] of Array.from(this.slaThresholds.entries())) {
      try {
        const violations = await this.evaluateSLA(sla);
        if (violations.length > 0) {
          this.generateSLAAlert(sla, violations);
        }
      } catch (error) {
        console.error(`Error checking SLA ${name}:`, error);
      }
    }
  }

  /**
   * Evaluate a single SLA threshold
   */
  private async evaluateSLA(sla: SLAThreshold): Promise<any[]> {
    const windowStart = new Date(Date.now() - sla.windowMs);
    const violations: any[] = [];
    
    // Special handling for computed error rate
    if (sla.metric === 'http_error_rate_computed') {
      violations.push(...this.evaluateErrorRateSLA(sla, windowStart));
    } else {
      // Standard metric evaluation
      for (const [key, points] of Array.from(this.metrics.entries())) {
        if (key.includes(sla.metric)) {
          const recentPoints = points.filter((p: MetricPoint) => p.timestamp >= windowStart);
          
          if (recentPoints.length > 0) {
            const avg = recentPoints.reduce((sum: number, p: MetricPoint) => sum + p.value, 0) / recentPoints.length;
            
            const isViolation = this.checkThreshold(avg, sla.threshold, sla.operator);
            
            if (isViolation) {
              violations.push({
                metric: key,
                value: avg,
                threshold: sla.threshold,
                pointCount: recentPoints.length,
                tenantId: recentPoints[0]?.tenantId
              });
            }
          }
        }
      }
    }
    
    return violations;
  }

  /**
   * Evaluate error rate SLA by computing errors/requests ratio
   */
  private evaluateErrorRateSLA(sla: SLAThreshold, windowStart: Date): any[] {
    const violations: any[] = [];
    
    // Group by tenant and endpoint for accurate error rate calculation
    const endpointStats = new Map<string, { errors: number; total: number; tenantId?: string }>();
    
    // Collect error counts
    for (const [key, points] of Array.from(this.metrics.entries())) {
      if (key.includes('http_error_count')) {
        const recentPoints = points.filter((p: MetricPoint) => p.timestamp >= windowStart);
        for (const point of recentPoints) {
          const endpointKey = `${point.labels?.method}_${point.labels?.path}_${point.tenantId || 'global'}`;
          if (!endpointStats.has(endpointKey)) {
            endpointStats.set(endpointKey, { errors: 0, total: 0, tenantId: point.tenantId });
          }
          endpointStats.get(endpointKey)!.errors += point.value;
        }
      }
    }
    
    // Collect total request counts
    for (const [key, points] of Array.from(this.metrics.entries())) {
      if (key.includes('http_request_count')) {
        const recentPoints = points.filter((p: MetricPoint) => p.timestamp >= windowStart);
        for (const point of recentPoints) {
          const endpointKey = `${point.labels?.method}_${point.labels?.path}_${point.tenantId || 'global'}`;
          if (!endpointStats.has(endpointKey)) {
            endpointStats.set(endpointKey, { errors: 0, total: 0, tenantId: point.tenantId });
          }
          endpointStats.get(endpointKey)!.total += point.value;
        }
      }
    }
    
    // Check error rates
    for (const [endpointKey, stats] of endpointStats.entries()) {
      if (stats.total > 0) {
        const errorRate = stats.errors / stats.total;
        
        if (this.checkThreshold(errorRate, sla.threshold, sla.operator)) {
          violations.push({
            metric: endpointKey,
            value: errorRate,
            threshold: sla.threshold,
            pointCount: stats.total,
            tenantId: stats.tenantId,
            errors: stats.errors,
            requests: stats.total
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * Check if a value violates a threshold
   */
  private checkThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Generate SLA breach alert
   */
  private generateSLAAlert(sla: SLAThreshold, violations: any[]) {
    const alertId = `sla_${sla.name}_${Date.now()}`;
    const alert: AlertEvent = {
      id: alertId,
      type: 'sla_breach',
      severity: sla.severity,
      title: `SLA Breach: ${sla.name}`,
      description: `${sla.description}. Detected ${violations.length} violation(s).`,
      metadata: { sla: sla.name, violations },
      timestamp: new Date(),
      acknowledged: false
    };
    
    this.alerts.set(alertId, alert);
    this.emit('alert_generated', alert);
    
    console.warn(`🚨 SLA BREACH: ${sla.name} - ${violations.length} violations`);
  }

  /**
   * Detect stuck operations
   */
  private detectStuckOperations() {
    const now = Date.now();
    
    for (const [id, operation] of Array.from(this.stuckOperations.entries())) {
      if (operation.status === 'active') {
        const elapsed = now - operation.startTime.getTime();
        
        if (elapsed > operation.timeoutMs) {
          operation.status = 'timed_out';
          
          // Generate stuck operation alert
          const alertId = `stuck_op_${id}_${now}`;
          const alert: AlertEvent = {
            id: alertId,
            type: 'stuck_operation',
            severity: 'high',
            title: `Stuck Operation: ${operation.type}`,
            description: `Operation ${id} has been running for ${Math.round(elapsed / 1000)}s (timeout: ${Math.round(operation.timeoutMs / 1000)}s)`,
            metadata: { operation },
            tenantId: operation.tenantId,
            timestamp: new Date(),
            acknowledged: false
          };
          
          this.alerts.set(alertId, alert);
          this.emit('alert_generated', alert);
          
          console.warn(`⏰ STUCK OPERATION: ${operation.type} (${id}) - ${elapsed}ms elapsed`);
          
          // Record stuck operation metric
          this.recordMetric({
            name: 'stuck_operations',
            value: 1,
            labels: { type: operation.type },
            tenantId: operation.tenantId
          });
        }
      }
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics() {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.recordMetric({
      name: 'system_memory_used',
      value: memUsage.heapUsed
    });
    
    this.recordMetric({
      name: 'system_memory_total',
      value: memUsage.heapTotal
    });
    
    // Active operations count
    const activeOps = Array.from(this.stuckOperations.values()).filter(op => op.status === 'active').length;
    this.recordMetric({
      name: 'active_operations',
      value: activeOps
    });
    
    // Alert counts
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.acknowledged).length;
    this.recordMetric({
      name: 'active_alerts',
      value: activeAlerts
    });
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ Alert acknowledged: ${alert.title}`);
      return true;
    }
    return false;
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(metricName?: string, tenantId?: string): any {
    const results: any = {};
    
    for (const [key, points] of Array.from(this.metrics.entries())) {
      const shouldInclude = 
        (!metricName || key.includes(metricName)) &&
        (!tenantId || key.includes(tenantId));
      
      if (shouldInclude && points.length > 0) {
        const values = points.map((p: MetricPoint) => p.value);
        results[key] = {
          count: values.length,
          latest: values[values.length - 1],
          avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          timestamp: points[points.length - 1].timestamp
        };
      }
    }
    
    return results;
  }
}

// Global observability service instance
let observabilityService: ObservabilityService | null = null;

export const initializeObservability = (storage: IStorage) => {
  observabilityService = new ObservabilityService(storage);
  return observabilityService;
};

export const getObservabilityService = (): ObservabilityService => {
  if (!observabilityService) {
    throw new Error('Observability service not initialized');
  }
  return observabilityService;
};