/**
 * @fileoverview Custom React hook for managing attribution model state, calculations, and real-time data retrieval
 * @version 1.0.0
 */

// External imports - v18.2.0
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // v8.1.1

// Internal imports
import AttributionService from '../services/attribution.service';
import { 
  setConfig, 
  setResults, 
  setLoading, 
  setError,
  selectAttributionConfig,
  selectAttributionResults,
  selectValidationErrors,
  selectIsConfigValid,
  selectAttributionError,
  selectIsLoading
} from '../store/slices/attributionSlice';
import { AttributionModel } from '../types/attribution.types';
import { TimeRange, LoadingState } from '../types/common.types';

/**
 * Interface for WebSocket connection configuration
 */
interface WebSocketConfig {
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
}

/**
 * Default WebSocket configuration
 */
const DEFAULT_WS_CONFIG: WebSocketConfig = {
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  heartbeatInterval: 30000
};

/**
 * Custom hook for managing attribution functionality with real-time updates
 */
export const useAttribution = () => {
  const dispatch = useDispatch();
  const attributionService = useRef(new AttributionService());
  const wsConnection = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout>();

  // Redux selectors
  const currentModel = useSelector(selectAttributionConfig);
  const results = useSelector(selectAttributionResults);
  const validationErrors = useSelector(selectValidationErrors);
  const isConfigValid = useSelector(selectIsConfigValid);
  const error = useSelector(selectAttributionError);
  const isLoading = useSelector(selectIsLoading);

  // Local state for enhanced loading status
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: '',
    isSuccess: false,
    progress: 0,
    stage: 'idle'
  });

  /**
   * Handles WebSocket connection and reconnection logic
   */
  const connectRealTime = useCallback(async (config: WebSocketConfig = DEFAULT_WS_CONFIG) => {
    try {
      setLoadingState(prev => ({ ...prev, stage: 'connecting' }));
      
      if (wsConnection.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const connection = await attributionService.current.connectWebSocket();
      wsConnection.current = connection;

      connection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'attribution_update') {
          dispatch(setResults(data.results));
        }
      };

      connection.onclose = () => {
        if (reconnectAttempts.current < config.reconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current += 1;
            connectRealTime(config);
          }, config.reconnectInterval * Math.pow(2, reconnectAttempts.current));
        }
      };

      // Setup heartbeat
      heartbeatInterval.current = setInterval(() => {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, config.heartbeatInterval);

      setLoadingState(prev => ({ 
        ...prev, 
        isSuccess: true, 
        stage: 'connected' 
      }));
    } catch (error) {
      setLoadingState(prev => ({ 
        ...prev, 
        error: 'Failed to establish real-time connection',
        stage: 'error' 
      }));
    }
  }, [dispatch]);

  /**
   * Updates attribution model configuration
   */
  const updateModel = useCallback(async (modelConfig: Partial<typeof currentModel>) => {
    try {
      dispatch(setLoading(true));
      setLoadingState(prev => ({ ...prev, stage: 'updating' }));

      const response = await attributionService.current.updateModelConfiguration(modelConfig);
      dispatch(setConfig(response.data));

      setLoadingState(prev => ({
        ...prev,
        isSuccess: true,
        stage: 'complete'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update model';
      dispatch(setError(errorMessage));
      setLoadingState(prev => ({
        ...prev,
        error: errorMessage,
        stage: 'error'
      }));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, currentModel]);

  /**
   * Fetches attribution results for specified time range
   */
  const fetchResults = useCallback(async (timeRange: TimeRange) => {
    try {
      dispatch(setLoading(true));
      setLoadingState(prev => ({ ...prev, stage: 'fetching' }));

      const response = await attributionService.current.getAttributionResults(timeRange);
      dispatch(setResults(response.data));

      setLoadingState(prev => ({
        ...prev,
        isSuccess: true,
        stage: 'complete'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch results';
      dispatch(setError(errorMessage));
      setLoadingState(prev => ({
        ...prev,
        error: errorMessage,
        stage: 'error'
      }));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  /**
   * Fetches touchpoint data for analysis
   */
  const fetchTouchpoints = useCallback(async (timeRange: TimeRange) => {
    try {
      dispatch(setLoading(true));
      setLoadingState(prev => ({ ...prev, stage: 'fetching' }));

      const response = await attributionService.current.getTouchpointData(timeRange);
      dispatch(setResults(response.data));

      setLoadingState(prev => ({
        ...prev,
        isSuccess: true,
        stage: 'complete'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch touchpoints';
      dispatch(setError(errorMessage));
      setLoadingState(prev => ({
        ...prev,
        error: errorMessage,
        stage: 'error'
      }));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  /**
   * Cleanup WebSocket connection and intervals
   */
  useEffect(() => {
    return () => {
      if (wsConnection.current) {
        wsConnection.current.close();
        wsConnection.current = null;
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      attributionService.current.dispose();
    };
  }, []);

  return {
    // State
    currentModel,
    results,
    validationErrors,
    isConfigValid,
    error,
    isLoading,
    loadingState,

    // Methods
    updateModel,
    fetchResults,
    fetchTouchpoints,
    connectRealTime,
    disconnectRealTime: useCallback(() => {
      if (wsConnection.current) {
        wsConnection.current.close();
        wsConnection.current = null;
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    }, [])
  };
};

export default useAttribution;