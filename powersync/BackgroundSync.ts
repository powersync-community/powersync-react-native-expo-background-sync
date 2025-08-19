import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import { System } from '@/powersync/system';

export const BACKGROUND_SYNC_TASK_NAME = 'powersync-background-sync';

/**
 * Defines the background task for syncing data.
 * This task is designed to run headlessly using expo-background-task.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  console.log(`[${BACKGROUND_SYNC_TASK_NAME}] Task started at ${new Date().toISOString()}`);
  try {
    // A new System instance is created to ensure it's a clean state for the background task.
    const system = new System();
    // The init method handles Supabase sign-in and PowerSync connection, triggering the sync.
    await system.init();

    // Here you can add more complex logic, like listening for sync completion
    // to then trigger your S3 asset downloads/uploads.

    console.log(`[${BACKGROUND_SYNC_TASK_NAME}] Task finished successfully.`);
    // Return success for expo-background-task
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error(`[${BACKGROUND_SYNC_TASK_NAME}] Task failed:`, error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Starts a background task using expo-background-task.
 * This provides more direct control over background execution.
 */
export async function startBackgroundTask() {
  try {
    // Ensure the task is registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, {});
      console.log(`[BackgroundTask] Task "${BACKGROUND_SYNC_TASK_NAME}" registered for background execution.`);
    }

    // In debug builds you can trigger the task worker for testing.
    // This does not return a real OS task ID, so we return a placeholder string.
    try {
      const triggered = await BackgroundTask.triggerTaskWorkerForTestingAsync();
      if (triggered) {
        console.log('[BackgroundTask] Triggered background task worker for testing.');
        return 'debug-trigger';
      }
    } catch (e) {
      // This method only works in debug; fall through to manual execution below.
      console.log('[BackgroundTask] Debug trigger not available, running sync inline.');
    }

    // Production: you cannot force-start a background task. If you need an immediate sync,
    // run the sync logic directly.
    console.log('[BackgroundTask] Running sync inline (manual trigger).');
    const system = new System();
    await system.init();
    console.log('[BackgroundTask] Manual sync completed.');
    return 'manual-run';
  } catch (error) {
    console.error('[BackgroundTask] Failed to start background task:', error);
    throw error;
  }
}

/**
 * Stops the background task with the given ID.
 */
export async function stopBackgroundTask(taskId: string) {
  try {
    // expo-background-task does not support force-stopping a running task.
    // You can unregister the task to prevent future runs, but not stop an in-flight one.
    console.warn('[BackgroundTask] Stopping an in-flight background task is not supported.');
    console.log(`[BackgroundTask] Ignored stop request for task ID: ${taskId}`);
  } catch (error) {
    console.error('[BackgroundTask] Failed to stop background task:', error);
  }
}

/**
 * Registers the background task for periodic execution.
 * This combines expo-background-task with TaskManager for scheduled execution.
 */
export async function registerBackgroundTaskAsync() {
  try {
    // Check if the task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    
    if (!isRegistered) {
      // Register the task for background execution
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, {});
      console.log(`[BackgroundTask] Task "${BACKGROUND_SYNC_TASK_NAME}" registered successfully.`);
    } else {
      console.log(`[BackgroundTask] Task "${BACKGROUND_SYNC_TASK_NAME}" is already registered.`);
    }
  } catch (error) {
    console.error('[BackgroundTask] Failed to register task:', error);
  }
}

/**
 * Triggers a manual background sync using expo-background-task.
 * This can be called when you need immediate sync execution.
 */
export async function triggerManualSync() {
  try {
    const taskId = await startBackgroundTask();
    
    // Optional: Set up a timeout to ensure the task doesn't run indefinitely
    setTimeout(async () => {
      try {
        // No-op: stopping an in-flight task isn't supported. This timeout exists only
        // to mirror previous behavior and for potential future adaptations.
        await stopBackgroundTask(taskId);
      } catch (error) {
        console.warn('[BackgroundTask] Failed to stop task on timeout:', error);
      }
    }, 30000); // 30 seconds timeout
    
    return taskId;
  } catch (error) {
    console.error('[BackgroundTask] Failed to trigger manual sync:', error);
    throw error;
  }
}

/**
 * Sets up a notification handler for the app.
 * This handles both foreground and background notifications, triggering sync when needed.
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: Notifications.Notification) => {
      console.log('[Notifications] Received notification:', JSON.stringify(notification, null, 2));
      
      // For silent push notifications, trigger background sync
      try {
        const taskId = await startBackgroundTask();
        console.log('[Notifications] Started background sync from notification');
        
        // Auto-cleanup after reasonable time
        setTimeout(async () => {
          try {
            await stopBackgroundTask(taskId);
          } catch (error) {
            console.warn('[Notifications] Failed to cleanup background task:', error);
          }
        }, 60000); // 1 minute timeout for notification-triggered sync
        
      } catch (error) {
        console.error('[Notifications] Failed to start background sync:', error);
      }
      
      return {
        shouldShowAlert: false, // Don't show a notification to the user
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false, // Android specific
        shouldShowList: false // Android specific
      };
    },
    handleSuccess: (notificationId: string) => {
      console.log('[Notifications] Handled notification successfully:', notificationId);
    },
    handleError: (notificationId: string, error: Error) => {
      console.error('[Notifications] Error handling notification:', notificationId, error);
    }
  });
  console.log('[Notifications] Background sync handler set up.');
}

/**
 * Utility function to check if background tasks are available.
 */
export async function isBackgroundTaskAvailable(): Promise<boolean> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    return status === BackgroundTask.BackgroundTaskStatus.Available;
  } catch (error) {
    console.error('[BackgroundTask] Error checking availability:', error);
    return false;
  }
}

/**
 * Initializes the background sync system.
 * Call this during app startup.
 */
export async function initializeBackgroundSync() {
  try {
    const isAvailable = await isBackgroundTaskAvailable();
    
    if (!isAvailable) {
      console.warn('[BackgroundTask] Background tasks are not available on this device');
      return false;
    }
    
    await registerBackgroundTaskAsync();
    setupNotificationHandler();
    
    console.log('[BackgroundTask] Background sync system initialized successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundTask] Failed to initialize background sync:', error);
    return false;
  }
}