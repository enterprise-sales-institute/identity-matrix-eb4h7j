import { useDispatch } from 'react-redux'; // v8.0.0
import { useCallback, useEffect, useRef } from 'react'; // v18.2.0
import { addNotification, removeNotification, clearNotifications } from '../store/slices/uiSlice';
import { NotificationType } from '../store/slices/uiSlice';

// Constants for toast configuration
const DEFAULT_DURATION = 3000;
const MAX_QUEUE_SIZE = 5;
const TYPE_DURATIONS: Record<NotificationType, number> = {
  [NotificationType.SUCCESS]: 3000,
  [NotificationType.ERROR]: 5000,
  [NotificationType.WARNING]: 4000,
  [NotificationType.INFO]: 3000
};

// Interface for toast options
export interface ToastOptions {
  message: string;
  type: NotificationType;
  duration?: number;
  persistent?: boolean;
  priority?: number;
}

// Interface for queued toast
interface QueuedToast extends ToastOptions {
  id: string;
  timestamp: number;
}

/**
 * Custom hook for managing Material Design 3.0 compliant toast notifications
 * with support for queueing, auto-dismissal, and priority management
 */
export const useToast = () => {
  const dispatch = useDispatch();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const queueRef = useRef<QueuedToast[]>([]);

  /**
   * Shows a toast notification with the provided options
   * Handles queueing if multiple notifications are triggered
   */
  const showToast = useCallback((options: ToastOptions) => {
    if (!options.message) {
      console.warn('Toast message is required');
      return;
    }

    // Apply default duration based on notification type
    const duration = options.duration || TYPE_DURATIONS[options.type] || DEFAULT_DURATION;
    
    const notification = {
      ...options,
      duration,
      autoRemove: !options.persistent
    };

    // Handle notification queue
    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      // Remove lowest priority notification if queue is full
      const lowestPriority = Math.min(...queueRef.current.map(t => t.priority || 0));
      const index = queueRef.current.findIndex(t => (t.priority || 0) === lowestPriority);
      if (index !== -1) {
        queueRef.current.splice(index, 1);
      }
    }

    // Add to queue with timestamp
    const queuedToast: QueuedToast = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      priority: options.priority || 0
    };

    queueRef.current.push(queuedToast);

    // Show immediately if it's the only notification
    if (queueRef.current.length === 1) {
      dispatch(addNotification({
        type: notification.type,
        message: notification.message,
        duration: notification.duration,
        autoRemove: notification.autoRemove
      }));

      // Set auto-dismiss timeout if not persistent
      if (!options.persistent) {
        timeoutRef.current = setTimeout(() => {
          hideToast(queuedToast.id);
        }, duration);
      }
    }
  }, [dispatch]);

  /**
   * Hides the current toast notification and shows the next in queue
   */
  const hideToast = useCallback((id?: string) => {
    // Clear current timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    // Remove from queue
    if (id) {
      queueRef.current = queueRef.current.filter(toast => toast.id !== id);
    } else if (queueRef.current.length > 0) {
      queueRef.current.shift();
    }

    dispatch(removeNotification(id || ''));

    // Show next notification in queue
    if (queueRef.current.length > 0) {
      const nextToast = queueRef.current[0];
      dispatch(addNotification({
        type: nextToast.type,
        message: nextToast.message,
        duration: nextToast.duration,
        autoRemove: !nextToast.persistent
      }));

      if (!nextToast.persistent) {
        timeoutRef.current = setTimeout(() => {
          hideToast(nextToast.id);
        }, nextToast.duration);
      }
    }
  }, [dispatch]);

  /**
   * Clears all toast notifications and resets the queue
   */
  const clearToasts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    queueRef.current = [];
    dispatch(clearNotifications());
  }, [dispatch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    showToast,
    hideToast,
    clearToasts
  };
};

export default useToast;