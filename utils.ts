import { LIST_TABLE } from "@/powersync/AppSchema";
import { System } from "@/powersync/System";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

const BACKGROUND_SYNC_TASK = "background-powersync-task";
const MINIMUM_INTERVAL = 15;

export const initializeBackgroundTask = async (
    innerAppMountedPromise: Promise<void>
) => {
    // Note: This needs to be called in the global scope, not in a React component.
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        console.log("Background task started");

        // Delay starting the task until the inner app is mounted
        // await innerAppMountedPromise;

        try {
            const system = new System();
            await system.init();
            const userId = await system.connector.userId();
            await system.powersync.execute(`
             INSERT INTO ${LIST_TABLE} (id, name, owner_id)
             VALUES (uuid(), 'From Inside BG TASK YEYEYE', ?);
           `, [userId]);

            console.log('List inserted');
            console.log('Background sync task completed');

            return BackgroundTask.BackgroundTaskResult.Success;
        } catch (error) {
            console.error("Error in background task:", error);
        }

        console.log("Background task done");
    });

    // Register the task
    if (!(await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK))) {
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: MINIMUM_INTERVAL,
        });
        console.log(
            `Background task with ID: ${BACKGROUND_SYNC_TASK} registered`
        );
    }
};

// class AsyncStorageManager extends EventEmitter {
//   async setItem(key: string, value: string) {
//     await AsyncStorage.setItem(key, value);
//     this.emit("change", key, value);
//     this.emit(`change:${key}`, value);
//   }

//   async getItem(key: string) {
//     return await AsyncStorage.getItem(key);
//   }

//   // ✅ Add Node-style helpers
//   on(event: string, listener: (...args: any[]) => void) {
//     return this.addListener(event, listener);
//   }

//   off(event: string, listener: (...args: any[]) => void) {
//     // RN emitter doesn’t have removeListener, so we remove all for that event
//     // or you can track specific subscriptions (preferred).
//     this.removeAllListeners(event);
//     return this;
//   }
// }

// // ✅ Global storage manager
// const storageManager = new AsyncStorageManager();

// // ✅ App state listener that uses the storage manager
// AppState.addEventListener("change", async (nextAppState) => {
//   console.log("App state changed:", nextAppState);
//   await storageManager.setItem("appState", nextAppState);
// });

// export const initializeBackgroundTask = async (
//   innerAppMountedPromise: Promise<void>
// ) => {
//   TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
//     console.log("[Background PowerSync] Background task started");

//     console.log("[Background PowerSync] Inner app mounting");
//     // Delay starting the task until the inner app is mounted
//     // await innerAppMountedPromise;

//     console.log("[Background PowerSync] Inner app mounted");

//     let system: System | null = null;
//     let shouldStop = false;

//     const appStateChangeListener = async (newValue: string) => {
//       console.log(
//         "[Background PowerSync] Detected app state change in background task:",
//         newValue
//       );
//       if (newValue === "active") {
//         console.log(
//           "[Background PowerSync] App became active, stopping background task"
//         );

//         await system?.disconnect();
//         return BackgroundTask.BackgroundTaskResult.Success;
//       }
//       else{
//         shouldStop = false;
//       }
//     };

//     storageManager.on("change:appState", appStateChangeListener);

//     try {
//       console.log("[Background PowerSync] sync task starting");

//       // Run a check if the app is in background and if there is a network connection
//     //   if(await storageManager.getItem("appState") === "active") {
//     //     console.log("[Background PowerSync] App is in foreground, exiting background task.");
//     //     return BackgroundTask.BackgroundTaskResult.Success;
//     //   }
    
//       system = new System();
//       await system.init();

//       const userId = await system.connector.userId();

//       await system.powersync.execute(
//         `
//           INSERT INTO ${LIST_TABLE} (id, name, owner_id)
//           VALUES (uuid(), 'Mock List', ?);
//         `,
//         [userId]
//       );

//       console.log("[Background PowerSync] Mock List inserted");

//       console.log("[Background PowerSync] Background sync task completed");
//     //   return BackgroundTask.BackgroundTaskResult.Success;
//     } catch (error) {
//       console.error("[Background PowerSync] Error in background task:", error);
//       await system?.disconnect();
//       return BackgroundTask.BackgroundTaskResult.Failed;
//     } 
//     console.log("[Background PowerSync] Background sync task completed");
    
//     return BackgroundTask.BackgroundTaskResult.Success;
//     // await system?.disconnect();
//     // return BackgroundTask.BackgroundTaskResult.Success;
//     // finally {
//     //   // ✅ Use custom .off wrapper
//     //   storageManager.off("change:appState", appStateChangeListener);

//     //   if (system && shouldStop) {
//     //     console.log(
//     //       "[Background PowerSync] Disconnecting system due to app becoming active"
//     //     );
//     //   }
//     // }
//   });

//   if (!(await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK))) {
//     await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
//       minimumInterval: MINIMUM_INTERVAL,
//     });
//     console.log(
//       `[Background PowerSync] Background task with ID: ${BACKGROUND_SYNC_TASK} registered`
//     );
//   }
// };
