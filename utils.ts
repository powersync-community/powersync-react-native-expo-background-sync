import { LIST_TABLE } from "@/powersync/AppSchema";
import { System } from "@/powersync/System";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";

const BACKGROUND_SYNC_TASK = "background-powersync-task";
const MINIMUM_INTERVAL = 15;

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  console.log("[Background Task] Background task started");
  try {
    const system = new System();
    await system.init();
    const userId = await system.connector.userId();

    // Simulate uploading data that was in ps_crud
    await system.powersync.execute(`
            INSERT INTO ${LIST_TABLE} (id, name, owner_id)
            VALUES (uuid(), 'From Inside BG', ?);
        `, [userId]);
    console.log('[Background Task] Mock List inserted');

    console.log('[Background Task] Background sync task completed');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[Background Task] Error in background task:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Initializes and manages the background task based on app state changes.
 */
export const initializeBackgroundTask = async (innerAppMountedPromise: Promise<void>) => {
  // Delay registering the task until the inner app is mounted
  await innerAppMountedPromise;
  // This listener will manage task registration and unregistration
  AppState.addEventListener("change", async (nextAppState) => {
    console.log("App state changed:", nextAppState);

    if (nextAppState === "active") {
      // App is in the foreground, kill the background task
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isTaskRegistered) {
        console.log("App is active. Unregistering background task.");
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      }
    } else if (nextAppState === "background") {
      // App is in the background, register the task to run
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (!isTaskRegistered) {
        console.log("App is in background. Registering background task.");
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: MINIMUM_INTERVAL,
        });
      }
    }
  });

  // Run an initial check in case the app starts in the background (e.g., from a deep link)
  const initialAppState = AppState.currentState;
  if (initialAppState === "background") {
    (async () => {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (!isTaskRegistered) {
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: MINIMUM_INTERVAL,
        });
      }
    })();
  }
};