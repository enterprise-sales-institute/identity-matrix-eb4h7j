/**
 * @fileoverview Core API service implementing secure, resilient HTTP client with comprehensive features
 * @version 1.0.0
 */

// External imports
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // v1.4.0
import axiosRetry from 'axios-retry'; // v3.5.0
import CircuitBreaker from 'opossum'; // v7.1.0

// Internal imports
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../types/common.types';

/**
 * Interface for request options extending axios config
 */
interface RequestOptions extends AxiosRequestConfig {
  useCache?: boolean;
  priority?: boolean;
  retries?: number;
  cacheTime?: number;
}

/**
 * Interface for request queue item
 */
interface QueueItem {
  id: string;
  request: () => Promise<any>;
  priority: boolean;
  timestamp: number;
}

/**
 * Core API service class implementing comprehensive HTTP client features
 */
export class ApiService {
  private readonly axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly requestQueue: QueueItem[] = [];
  private readonly requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private rateLimitCounter: Map<string, number> = new Map();

  constructor() {
    // Initialize axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.DEFAULT_HEADERS,
      validateStatus: (status) => status >= 200 && status < 500
    });

    // Configure retry mechanism
    axiosRetry(this.axiosInstance, {
      retries: API_CONFIG.RETRY_ATTEMPTS,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          API_CONFIG.ERROR_RETRY_CODES.includes(error.response?.status);
      }
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Configure request interceptors
    this.setupInterceptors();

    // Start queue processor
    this.processQueue();
  }

  /**
   * Configures request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        // Add request ID for tracking
        config.headers['X-Request-ID'] = crypto.randomUUID();
        
        // Add timestamp for metrics
        config.headers['X-Request-Time'] = Date.now().toString();
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => this.transformResponse(response),
      (error) => this.handleRequestError(error)
    );
  }

  /**
   * Transforms API response to standardized format
   */
  private transformResponse(response: AxiosResponse): ApiResponse<any> {
    return {
      data: response.data,
      success: response.status >= 200 && response.status < 300,
      message: response.data?.message || '',
      errors: response.data?.errors || {},
      metadata: {
        timestamp: new Date().toISOString(),
        statusCode: response.status,
        path: response.config.url
      }
    };
  }

  /**
   * Handles request errors with comprehensive error transformation
   */
  private handleRequestError(error: any): Promise<never> {
    const errorResponse: ApiResponse<null> = {
      data: null,
      success: false,
      message: error.message || 'An unexpected error occurred',
      errors: {},
      metadata: {
        timestamp: new Date().toISOString(),
        statusCode: error.response?.status || 500,
        path: error.config?.url
      }
    };

    if (error.response?.data?.errors) {
      errorResponse.errors = error.response.data.errors;
    }

    return Promise.reject(errorResponse);
  }

  /**
   * Makes HTTP request through circuit breaker
   */
  private async makeRequest(config: AxiosRequestConfig): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.request(config);
      return this.transformResponse(response);
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  /**
   * Processes queued requests
   */
  private async processQueue(): Promise<void> {
    while (true) {
      if (this.requestQueue.length > 0) {
        const priorityItems = this.requestQueue
          .filter(item => item.priority)
          .sort((a, b) => a.timestamp - b.timestamp);

        const normalItems = this.requestQueue
          .filter(item => !item.priority)
          .sort((a, b) => a.timestamp - b.timestamp);

        const nextItem = priorityItems[0] || normalItems[0];

        if (nextItem) {
          try {
            await nextItem.request();
          } catch (error) {
            console.error(`Queue item ${nextItem.id} failed:`, error);
          } finally {
            this.requestQueue.splice(this.requestQueue.indexOf(nextItem), 1);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Sets authentication token for subsequent requests
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Performs GET request with comprehensive handling
   */
  public async get<T>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const cacheKey = `GET:${url}${JSON.stringify(options.params || {})}`;

    if (options.useCache) {
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTime || 300000)) {
        return cached.data;
      }
    }

    const response = await this.circuitBreaker.fire({
      method: 'GET',
      url,
      ...options
    });

    if (options.useCache) {
      this.requestCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
    }

    return response;
  }

  /**
   * Performs POST request with comprehensive handling
   */
  public async post<T>(url: string, data: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.circuitBreaker.fire({
      method: 'POST',
      url,
      data,
      ...options
    });
  }

  /**
   * Performs PUT request with comprehensive handling
   */
  public async put<T>(url: string, data: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.circuitBreaker.fire({
      method: 'PUT',
      url,
      data,
      ...options
    });
  }

  /**
   * Performs DELETE request with comprehensive handling
   */
  public async delete<T>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.circuitBreaker.fire({
      method: 'DELETE',
      url,
      ...options
    });
  }
}

// Export singleton instance
export default new ApiService();