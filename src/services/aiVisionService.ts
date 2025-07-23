import { AIVerificationRequest, AIVerificationResponse, AIVerificationError, AIServiceConfig } from '../types';

class AIVisionService {
  private static instance: AIVisionService;
  private config: AIServiceConfig;
  private requestQueue: Map<string, Promise<AIVerificationResponse>>;
  private rateTracker: {
    minuteRequests: number[];
    hourRequests: number[];
    lastMinute: number;
    lastHour: number;
  };

  private constructor() {
    this.config = {
      apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
      model: 'gpt-4o',
      maxRetries: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerMinute: 20,
        requestsPerHour: 100,
      },
      costOptimization: {
        imageCompressionQuality: 0.8,
        maxImageSize: 1024 * 1024, // 1MB
      },
    };
    
    this.requestQueue = new Map();
    this.rateTracker = {
      minuteRequests: [],
      hourRequests: [],
      lastMinute: Date.now(),
      lastHour: Date.now(),
    };

    if (!this.config.apiKey) {
      console.warn('OpenAI API key not found. AI verification will be disabled.');
    }
  }

  public static getInstance(): AIVisionService {
    if (!AIVisionService.instance) {
      AIVisionService.instance = new AIVisionService();
    }
    return AIVisionService.instance;
  }

  /**
   * Main method to verify if an image matches a report description
   */
  public async verifyImageMatch(request: AIVerificationRequest): Promise<AIVerificationResponse> {
    if (!this.config.apiKey) {
      throw this.createError('API_ERROR', 'OpenAI API key not configured', false);
    }

    // Check for duplicate requests
    const requestKey = this.generateRequestKey(request);
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey)!;
    }

    // Check rate limits
    this.updateRateTracker();
    if (!this.checkRateLimit()) {
      throw this.createError('RATE_LIMIT', 'Rate limit exceeded. Please try again later.', true, 60);
    }

    const verificationPromise = this.executeVerification(request);
    this.requestQueue.set(requestKey, verificationPromise);

    try {
      const result = await verificationPromise;
      return result;
    } finally {
      this.requestQueue.delete(requestKey);
    }
  }

  /**
   * Execute the actual AI verification with retries
   */
  private async executeVerification(request: AIVerificationRequest): Promise<AIVerificationResponse> {
    let lastError: AIVerificationError | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
        }

        const response = await this.callOpenAIVision(request);
        this.recordRequest();
        return response;
      } catch (error) {
        lastError = error as AIVerificationError;
        
        if (!lastError.retryable || attempt === this.config.maxRetries - 1) {
          throw lastError;
        }
      }
    }

    throw lastError!;
  }

  /**
   * Call OpenAI Vision API with optimized prompts
   */
  private async callOpenAIVision(request: AIVerificationRequest): Promise<AIVerificationResponse> {
    try {
      const prompt = this.generateOptimizedPrompt(request.reportDescription, request.courtContext);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: request.imageUrl,
                    detail: 'low', // Cost optimization
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.1, // Low temperature for consistent results
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw this.createError('RATE_LIMIT', 'OpenAI rate limit exceeded', true, 60);
        } else if (response.status >= 500) {
          throw this.createError('API_ERROR', `OpenAI server error: ${response.status}`, true);
        } else {
          throw this.createError('API_ERROR', `OpenAI API error: ${response.status}`, false);
        }
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw this.createError('PROCESSING_ERROR', 'Invalid response from OpenAI', false);
      }

      return this.parseAIResponse(data.choices[0].message.content);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          throw this.createError('NETWORK_ERROR', 'Network connection failed', true);
        }
      }
      throw error;
    }
  }

  /**
   * Generate basketball court-specific verification prompt
   */
  private generateOptimizedPrompt(reportDescription: string, courtContext?: string): string {
    const basePrompt = `You are an expert basketball court condition analyzer. Your task is to verify if a photo accurately represents the reported condition described below.

REPORT DESCRIPTION: "${reportDescription}"
${courtContext ? `COURT CONTEXT: "${courtContext}"` : ''}

Analyze the image and determine if it matches the reported condition. Consider:

BASKETBALL COURT ELEMENTS TO IDENTIFY:
- Court surface (hardwood, concrete, asphalt, painted lines)
- Basketball hoops, nets, backboards
- Court markings (three-point line, free-throw line, center circle)
- Surrounding facilities (benches, lighting, fencing)

CONDITION CATEGORIES TO EVALUATE:
- CROWDING: "crowded" (6+ people), "busy" (3-5 people), "empty" (0-1 people), "partially occupied" (2-4 people)
- SURFACE: "slippery", "wet", "damaged", "cracked", "well-maintained", "dirty", "clean"
- EQUIPMENT: "broken hoop", "missing net", "damaged backboard", "working condition"
- ENVIRONMENT: "poor lighting", "good lighting", "court closed", "open", "indoor", "outdoor"
- MAINTENANCE: "trash on court", "clean court", "needs cleaning", "well-maintained"
- OCCUPANCY: "tentages on court", "no tents on court", "special event at court", "no special event at court", "special event banner at court", "no special event banner at court"

ANALYSIS CRITERIA:
1. Does the image clearly show a basketball court?
2. Are the reported conditions visible and accurate?
3. Is the evidence clear and unambiguous?
4. Does the image quality allow for proper assessment?
5. Is the time of day and weather conditions considered?

RESPOND IN THIS EXACT JSON FORMAT:
{
  "isMatch": true/false,
  "confidence": 0-100,
  "reasoning": "Detailed explanation of what you see and why it matches/doesn't match",
  "feedback": "Brief user-friendly message explaining the decision"
}

IMPORTANT:
- Return isMatch=true if the image clearly shows the reported condition
- If the image is unclear, blurry, or doesn't show a basketball court, return isMatch=false
- For crowding reports, count visible people accurately
- For surface conditions, look for clear visual evidence
- Consider lighting conditions and image quality in your assessment
- Consider the time of day and weather conditions in your assessment
- Provide specific details in your reasoning`;

    return basePrompt;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(content: string): AIVerificationResponse {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (typeof parsed.isMatch !== 'boolean' || 
          typeof parsed.confidence !== 'number' || 
          typeof parsed.reasoning !== 'string') {
        throw new Error('Invalid response format');
      }

      return {
        isMatch: parsed.isMatch,
        confidence: Math.max(0, Math.min(100, parsed.confidence)),
        reasoning: parsed.reasoning.substring(0, 500), // Limit length
        feedback: parsed.feedback?.substring(0, 200) || (parsed.isMatch ? 
          'Photo verified! It matches the reported condition.' : 
          'Photo doesn\'t match the reported condition. Please try again.'),
        timestamp: new Date().toISOString(),
        promptVersion: '1.0',
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw this.createError('PROCESSING_ERROR', 'Failed to parse AI response', false);
    }
  }

  /**
   * Generate unique key for request deduplication
   */
  private generateRequestKey(request: AIVerificationRequest): string {
    return `${request.imageUrl}-${request.reportDescription}`.substring(0, 100);
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentMinuteRequests = this.rateTracker.minuteRequests.filter(time => time > oneMinuteAgo);
    const recentHourRequests = this.rateTracker.hourRequests.filter(time => time > oneHourAgo);

    return recentMinuteRequests.length < this.config.rateLimit.requestsPerMinute &&
           recentHourRequests.length < this.config.rateLimit.requestsPerHour;
  }

  /**
   * Update rate tracking
   */
  private updateRateTracker(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    this.rateTracker.minuteRequests = this.rateTracker.minuteRequests.filter(time => time > oneMinuteAgo);
    this.rateTracker.hourRequests = this.rateTracker.hourRequests.filter(time => time > oneHourAgo);
  }

  /**
   * Record a successful request
   */
  private recordRequest(): void {
    const now = Date.now();
    this.rateTracker.minuteRequests.push(now);
    this.rateTracker.hourRequests.push(now);
  }

  /**
   * Create standardized error
   */
  private createError(
    code: AIVerificationError['code'],
    message: string,
    retryable: boolean,
    retryAfter?: number
  ): AIVerificationError {
    return {
      code,
      message,
      retryable,
      retryAfter,
    };
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if service is available
   */
  public isAvailable(): boolean {
    return !!this.config.apiKey && this.checkRateLimit();
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): { minute: number; hour: number; available: boolean } {
    this.updateRateTracker();
    return {
      minute: this.rateTracker.minuteRequests.length,
      hour: this.rateTracker.hourRequests.length,
      available: this.checkRateLimit(),
    };
  }
}

export const aiVisionService = AIVisionService.getInstance(); 