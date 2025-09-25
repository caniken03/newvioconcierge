import type { Contact, CustomerAnalytics } from "@shared/schema";

export interface ResponsivenessPattern {
  contactId: string;
  overallScore: number; // 0.00 to 1.00
  trendDirection: 'improving' | 'stable' | 'declining';
  optimalContactWindow: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    timeRange: string; // "09:00-12:00"
    confidence: number; // 0.00 to 1.00
  };
  behaviorPredictions: {
    likelyToAnswer: number; // 0.00 to 1.00
    appointmentRisk: 'low' | 'medium' | 'high';
    recommendedStrategy: string;
  };
  insights: string[];
}

export interface ContactTimingData {
  timestamp: Date;
  dayOfWeek: number;
  hour: number;
  answered: boolean;
  duration?: number;
  sentiment?: string;
  engagementLevel?: string;
}

export interface ResponsivenessMetrics {
  totalAttempts: number;
  successfulContacts: number;
  answerRate: number;
  averageResponseTime: number;
  bestDayOfWeek: number;
  bestTimeRange: string;
  sentimentTrend: 'improving' | 'stable' | 'declining';
  riskScore: number;
}

export class ResponsivenessTracker {
  
  /**
   * Calculate comprehensive responsiveness score based on multiple factors
   */
  calculateResponsivenessScore(
    contact: Contact, 
    analytics: CustomerAnalytics | null,
    recentCallHistory: ContactTimingData[]
  ): number {
    let deltaSum = 0; // Accumulate weighted deltas separately
    let totalWeight = 0;

    // Factor 1: Basic answer rate (30% weight)
    const answerWeight = 0.3;
    if (contact.totalSuccessfulContacts && contact.callAttempts) {
      const answerRate = contact.totalSuccessfulContacts / Math.max(contact.callAttempts, 1);
      deltaSum += (answerRate - 0.5) * answerWeight;
      totalWeight += answerWeight;
    }

    // Factor 2: Recent performance trend (25% weight)
    const trendWeight = 0.25;
    const recentTrend = this.analyzeRecentTrend(recentCallHistory);
    deltaSum += recentTrend * trendWeight;
    totalWeight += trendWeight;

    // Factor 3: Sentiment stability (20% weight)
    const sentimentWeight = 0.2;
    if (analytics?.averageSentimentScore) {
      const sentimentScore = parseFloat(analytics.averageSentimentScore.toString());
      const normalizedSentiment = (sentimentScore + 1) / 2; // Convert -1 to 1 range to 0 to 1
      deltaSum += (normalizedSentiment - 0.5) * sentimentWeight;
      totalWeight += sentimentWeight;
    }

    // Factor 4: Engagement patterns (15% weight)
    const engagementWeight = 0.15;
    if (analytics?.overallEngagementScore) {
      const engagementScore = parseFloat(analytics.overallEngagementScore.toString());
      deltaSum += (engagementScore - 0.5) * engagementWeight;
      totalWeight += engagementWeight;
    }

    // Factor 5: Consistency bonus/penalty (10% weight)
    const consistencyWeight = 0.1;
    const consistencyScore = this.calculateConsistencyScore(recentCallHistory);
    deltaSum += (consistencyScore - 0.5) * consistencyWeight;
    totalWeight += consistencyWeight;

    // Correct normalization: normalize delta, then add to baseline
    const normalizedDelta = totalWeight > 0 ? (deltaSum / totalWeight) : 0;
    const finalScore = 0.5 + normalizedDelta;
    
    return Math.max(0, Math.min(1, finalScore));
  }

  /**
   * Analyze optimal contact timing patterns
   */
  analyzeOptimalTiming(callHistory: ContactTimingData[]): {
    dayOfWeek: number;
    timeRange: string;
    confidence: number;
  } {
    if (callHistory.length < 3) {
      return {
        dayOfWeek: 2, // Default Tuesday
        timeRange: "10:00-14:00", // Default business hours
        confidence: 0.1
      };
    }

    // Analyze success by day of week
    const daySuccess: { [key: number]: { total: number; answered: number } } = {};
    const hourSuccess: { [key: number]: { total: number; answered: number } } = {};

    for (const call of callHistory) {
      // Day of week analysis
      if (!daySuccess[call.dayOfWeek]) {
        daySuccess[call.dayOfWeek] = { total: 0, answered: 0 };
      }
      daySuccess[call.dayOfWeek].total++;
      if (call.answered) {
        daySuccess[call.dayOfWeek].answered++;
      }

      // Hour analysis
      if (!hourSuccess[call.hour]) {
        hourSuccess[call.hour] = { total: 0, answered: 0 };
      }
      hourSuccess[call.hour].total++;
      if (call.answered) {
        hourSuccess[call.hour].answered++;
      }
    }

    // Find best day of week
    let bestDay = 2; // Default Tuesday
    let bestDayRate = 0;
    for (const [day, data] of Object.entries(daySuccess)) {
      const rate = data.answered / Math.max(data.total, 1);
      if (rate > bestDayRate && data.total >= 2) { // Require at least 2 attempts
        bestDayRate = rate;
        bestDay = parseInt(day);
      }
    }

    // Find best time range (find 4-hour window with highest success rate)
    let bestTimeRange = "10:00-14:00";
    let bestTimeRate = 0;
    
    for (let startHour = 8; startHour <= 18; startHour++) {
      let windowTotal = 0;
      let windowAnswered = 0;
      
      for (let hour = startHour; hour < startHour + 4 && hour <= 21; hour++) {
        if (hourSuccess[hour]) {
          windowTotal += hourSuccess[hour].total;
          windowAnswered += hourSuccess[hour].answered;
        }
      }
      
      const windowRate = windowAnswered / Math.max(windowTotal, 1);
      if (windowRate > bestTimeRate && windowTotal >= 2) {
        bestTimeRate = windowRate;
        const endHour = Math.min(startHour + 4, 22);
        bestTimeRange = `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
      }
    }

    // Calculate confidence based on data volume and consistency
    const totalCalls = callHistory.length;
    const dataConfidence = Math.min(totalCalls / 10, 1); // Max confidence at 10+ calls
    const patternConfidence = bestTimeRate; // Higher success rate = higher confidence
    const confidence = (dataConfidence + patternConfidence) / 2;

    return {
      dayOfWeek: bestDay,
      timeRange: bestTimeRange,
      confidence: Math.max(0.1, Math.min(1, confidence))
    };
  }

  /**
   * Generate predictive insights and recommendations
   */
  generateResponsivenessPattern(
    contact: Contact,
    analytics: CustomerAnalytics | null,
    callHistory: ContactTimingData[]
  ): ResponsivenessPattern {
    const overallScore = this.calculateResponsivenessScore(contact, analytics, callHistory);
    const trendDirection = this.analyzeSentimentTrend(analytics?.sentimentHistory || undefined);
    const optimalTiming = this.analyzeOptimalTiming(callHistory);
    
    // Predict behavior
    const likelyToAnswer = this.predictAnswerProbability(overallScore, callHistory);
    const appointmentRisk = this.assessAppointmentRisk(contact, analytics, overallScore);
    const recommendedStrategy = this.generateStrategy(overallScore, trendDirection, appointmentRisk);
    
    // Generate insights
    const insights = this.generateInsights(contact, analytics, overallScore, trendDirection, optimalTiming);

    return {
      contactId: contact.id,
      overallScore,
      trendDirection,
      optimalContactWindow: optimalTiming,
      behaviorPredictions: {
        likelyToAnswer,
        appointmentRisk,
        recommendedStrategy
      },
      insights
    };
  }

  private analyzeRecentTrend(callHistory: ContactTimingData[]): number {
    if (callHistory.length < 2) return 0;

    // Look at last 5 calls vs previous 5 calls
    const recent = callHistory.slice(-5);
    const previous = callHistory.slice(-10, -5);

    if (previous.length === 0) return 0;

    const recentRate = recent.filter(call => call.answered).length / recent.length;
    const previousRate = previous.filter(call => call.answered).length / previous.length;

    return (recentRate - previousRate); // Will be between -1 and 1
  }

  private calculateConsistencyScore(callHistory: ContactTimingData[]): number {
    if (callHistory.length < 3) return 0.5;

    // Measure variance in response times and engagement
    const responseTimes = callHistory
      .filter(call => call.answered && call.duration)
      .map(call => call.duration!);

    if (responseTimes.length < 2) return 0.5;

    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower variance = higher consistency = higher score
    const consistencyScore = Math.max(0, 1 - (standardDeviation / avgTime));
    return Math.min(1, consistencyScore);
  }

  private analyzeSentimentTrend(sentimentHistory?: string): 'improving' | 'stable' | 'declining' {
    if (!sentimentHistory) return 'stable';

    try {
      const history = JSON.parse(sentimentHistory) as Array<{ timestamp: string; score: number }>;
      if (history.length < 3) return 'stable';

      // Compare recent vs older sentiment scores
      const recent = history.slice(-3).map(entry => entry.score);
      const older = history.slice(-6, -3).map(entry => entry.score);

      if (older.length === 0) return 'stable';

      const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
      const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;

      const difference = recentAvg - olderAvg;
      
      if (difference > 0.2) return 'improving';
      if (difference < -0.2) return 'declining';
      return 'stable';
    } catch {
      return 'stable';
    }
  }

  private predictAnswerProbability(overallScore: number, callHistory: ContactTimingData[]): number {
    // Base probability on overall score
    let probability = overallScore;

    // Adjust based on recent streak
    if (callHistory.length > 0) {
      const recentCalls = callHistory.slice(-3);
      const recentAnswers = recentCalls.filter(call => call.answered).length;
      const recentRate = recentAnswers / recentCalls.length;
      
      // Weight recent performance more heavily
      probability = (probability * 0.7) + (recentRate * 0.3);
    }

    return Math.max(0.05, Math.min(0.95, probability));
  }

  private assessAppointmentRisk(
    contact: Contact, 
    analytics: CustomerAnalytics | null,
    overallScore: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Factor in responsiveness score (lower responsiveness = higher risk)
    riskScore += (1 - overallScore) * 0.4;

    // Factor in no-shows and cancellations
    if (analytics?.noShowCount) {
      riskScore += Math.min(0.3, analytics.noShowCount * 0.1);
    }

    // Factor in consecutive no-answers
    if (contact.consecutiveNoAnswers) {
      riskScore += Math.min(0.3, contact.consecutiveNoAnswers * 0.05);
    }

    if (riskScore <= 0.3) return 'low';
    if (riskScore <= 0.6) return 'medium';
    return 'high';
  }

  private generateStrategy(
    overallScore: number, 
    trendDirection: 'improving' | 'stable' | 'declining',
    appointmentRisk: 'low' | 'medium' | 'high'
  ): string {
    if (overallScore >= 0.8 && appointmentRisk === 'low') {
      return "Standard contact protocol - high responsiveness customer";
    }

    if (overallScore >= 0.6 && trendDirection === 'improving') {
      return "Continue current approach - positive trend observed";
    }

    if (overallScore < 0.4 || appointmentRisk === 'high') {
      return "Multi-channel approach: voice + SMS + email with extended lead time";
    }

    if (trendDirection === 'declining') {
      return "Investigate concerns - declining engagement detected";
    }

    return "Standard contact with optimal timing focus";
  }

  private generateInsights(
    contact: Contact,
    analytics: CustomerAnalytics | null,
    overallScore: number,
    trendDirection: 'improving' | 'stable' | 'declining',
    optimalTiming: { dayOfWeek: number; timeRange: string; confidence: number }
  ): string[] {
    const insights: string[] = [];

    // Responsiveness insights
    if (overallScore >= 0.8) {
      insights.push("Highly responsive customer - reliable contact success");
    } else if (overallScore <= 0.3) {
      insights.push("Low responsiveness - consider alternative contact methods");
    }

    // Trend insights
    if (trendDirection === 'improving') {
      insights.push("Positive engagement trend - customer becoming more responsive");
    } else if (trendDirection === 'declining') {
      insights.push("Declining responsiveness - may need immediate attention");
    }

    // Timing insights
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (optimalTiming.confidence > 0.6) {
      insights.push(`Best contact window: ${dayNames[optimalTiming.dayOfWeek]} ${optimalTiming.timeRange} (${Math.round(optimalTiming.confidence * 100)}% confidence)`);
    }

    // Risk insights
    if ((contact.consecutiveNoAnswers || 0) >= 3) {
      insights.push(`${contact.consecutiveNoAnswers || 0} consecutive missed calls - high priority follow-up needed`);
    }

    // Engagement insights
    if (analytics?.overallEngagementScore) {
      const engagement = parseFloat(analytics.overallEngagementScore.toString());
      if (engagement >= 0.8) {
        insights.push("High engagement customer - actively participates in conversations");
      } else if (engagement <= 0.3) {
        insights.push("Low engagement - conversations tend to be brief or one-sided");
      }
    }

    return insights;
  }

  /**
   * Update contact responsiveness data after a call
   */
  updateResponsivenessData(
    currentContact: Contact,
    callOutcome: 'answered' | 'no_answer' | 'busy' | 'voicemail',
    callDuration?: number,
    sentimentData?: any
  ): Partial<Contact> {
    const updates: Partial<Contact> = {};

    // Update basic counters
    updates.callAttempts = (currentContact.callAttempts || 0) + 1;
    updates.lastCallOutcome = callOutcome;
    updates.lastContactTime = new Date();

    if (callOutcome === 'answered') {
      updates.totalSuccessfulContacts = (currentContact.totalSuccessfulContacts || 0) + 1;
      updates.consecutiveNoAnswers = 0;
      
      // Update average response time if duration provided
      if (callDuration && callDuration > 0) {
        const currentAvg = currentContact.averageResponseTime || 0;
        const totalContacts = updates.totalSuccessfulContacts!;
        updates.averageResponseTime = Math.round(
          ((currentAvg * (totalContacts - 1)) + callDuration) / totalContacts
        );
      }
    } else {
      updates.consecutiveNoAnswers = (currentContact.consecutiveNoAnswers || 0) + 1;
    }

    // Calculate new responsiveness score
    if (updates.totalSuccessfulContacts && updates.callAttempts) {
      const newScore = updates.totalSuccessfulContacts / updates.callAttempts;
      updates.responsivenessScore = newScore.toFixed(2);
    }

    // Update contact pattern data
    const currentTime = new Date();
    const contactData = {
      timestamp: currentTime.toISOString(),
      dayOfWeek: currentTime.getDay(),
      hour: currentTime.getHours(),
      outcome: callOutcome,
      duration: callDuration,
      sentiment: sentimentData?.overallSentiment
    };

    try {
      const existingPattern = currentContact.contactPatternData ? 
        JSON.parse(currentContact.contactPatternData) : [];
      existingPattern.push(contactData);
      
      // Keep only last 50 entries to prevent unlimited growth
      if (existingPattern.length > 50) {
        existingPattern.splice(0, existingPattern.length - 50);
      }
      
      updates.contactPatternData = JSON.stringify(existingPattern);
    } catch (error) {
      updates.contactPatternData = JSON.stringify([contactData]);
    }

    return updates;
  }
}

// Export singleton instance
export const responsivenessTracker = new ResponsivenessTracker();