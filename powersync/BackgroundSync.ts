import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { System } from './system'; // your PowerSync wrapper

const TASK_NAME = 'powersync-background-task';

// Define the background task
TaskManager.defineTask(TASK_NAME, async ({ data, error, executionInfo }) => {
  try {
    if (error) {
      console.error('[BackgroundTask] Error:', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    await runBackgroundSync();
    console.log('[BackgroundTask] Success');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.error('[BackgroundTask] Failed:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundTask() {
  try {
    // Check if background tasks are available
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      console.warn('[BackgroundTask] Background tasks are restricted');
      return false;
    }

    // Register the background task
    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15, // 15 minutes
    });
    
    console.log('[BackgroundTask] Registered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundTask] Registration failed:', error);
    return false;
  }
}

export async function unregisterBackgroundTask() {
  try {
    await BackgroundTask.unregisterTaskAsync(TASK_NAME);
    console.log('[BackgroundTask] Unregistered');
  } catch (error) {
    console.error('[BackgroundTask] Unregistration failed:', error);
  }
}

async function runBackgroundSync() {
  console.log('[BackgroundSync] Starting job…');
  
  const timeout = 25000; // 25 seconds
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const system = new System();

  try {
    // Set up abort listener
    signal.addEventListener('abort', () => {
      console.log('[BackgroundSync] Aborted due to timeout');
      system.disconnect();
    });

    // Initialize PowerSync
    await system.init();
    console.log('[BackgroundSync] System initialized');

    // Download phase - wait for first sync
    console.log('[BackgroundSync] Waiting for first sync...');
    await system.powersync.waitForFirstSync();
    console.log('[BackgroundSync] First sync completed');

    // Upload phase - process all pending CRUD operations
    let batch;
    let batchCount = 0;
    
    while ((batch = await system.powersync.getCrudBatch()) && batch.crud.length > 0) {
      if (signal.aborted) {
        console.log('[BackgroundSync] Stopping upload due to abort signal');
        break;
      }
      
      batchCount++;
      console.log(`[BackgroundSync] Uploading batch ${batchCount} with ${batch.crud.length} operations`);
      
      try {
        await system.connector.uploadData(system.powersync);
        console.log(`[BackgroundSync] Batch ${batchCount} uploaded successfully`);
      } catch (uploadError) {
        console.error(`[BackgroundSync] Failed to upload batch ${batchCount}:`, uploadError);
        // Continue with next batch or break depending on your error handling strategy
        break;
      }
    }

    console.log(`[BackgroundSync] Finished - processed ${batchCount} batches`);
    
  } catch (error) {
    console.error('[BackgroundSync] Error during sync:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    try {
      await system.disconnect();
      console.log('[BackgroundSync] System disconnected');
    } catch (disconnectError) {
      console.error('[BackgroundSync] Error during disconnect:', disconnectError);
    }
  }
}