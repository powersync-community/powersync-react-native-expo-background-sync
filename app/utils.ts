import { AppSchema, LIST_TABLE } from "@/powersync/AppSchema";
import { SupabaseConnector } from "@/supabase/SupabaseConnector";
import { OPSqliteOpenFactory } from "@powersync/op-sqlite";
import { createBaseLogger, LogLevel, PowerSyncDatabase, SyncClientImplementation } from "@powersync/react-native";
import axios from "axios";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_SYNC_TASK = 'background-sync-task';

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
            console.log('Background sync task starting TES NEW NEWT');

            // const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
            // console.log('Response:', response);

            // const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');

            // console.log('✅ Axios response:', response);

            const connector = new SupabaseConnector();
            // await connector.signInAnonymously();
            // console.log('connector signed in');

            const opSqlite = new OPSqliteOpenFactory({
                dbFilename: 'dev.db'
            });

            const logger = createBaseLogger();
            logger.useDefaults();
            logger.setLevel(LogLevel.DEBUG);

            const powersync = new PowerSyncDatabase({
                schema: AppSchema,
                database: opSqlite,
                logger: logger
            });

            console.log('powersync created');

            const userId = await connector.signInAnonymously();
            console.log('connector signed in');

            await powersync.connect(connector, {
                clientImplementation: SyncClientImplementation.RUST,
            });

            console.log('powersync connected');

            console.log('userId', userId);

            await powersync.execute(`
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