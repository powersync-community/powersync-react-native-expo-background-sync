import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { createBaseLogger, LogLevel, PowerSyncDatabase, SyncClientImplementation } from '@powersync/react-native';
import { System } from './system';
import { AppSchema, LIST_TABLE } from './AppSchema';
import { SupabaseConnector } from '@/supabase/SupabaseConnector';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import axios from 'axios';

export const BACKGROUND_SYNC_TASK = 'background-sync-task';

export async function registerBackgroundTaskAsync() {
  return BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK);
}

// TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
//   try {
//     console.log('Background sync task starting TEST 22');

//     let connector: SupabaseConnector;
//     try {
//       connector = new SupabaseConnector();
//       console.log('Connector created');
//     } catch (err) {
//       console.error('❌ Failed to create connector:', err);
//       return BackgroundTask.BackgroundTaskResult.Failed;
//     }

//     // try {
//     //   await connector.signInAnonymously();
//     //   console.log('Connector signed in');
//     // } catch (err) {
//     //   console.error('❌ Failed to sign in anonymously:', err);
//     //   return BackgroundTask.BackgroundTaskResult.Failed;
//     // }

//     console.log('connector', connector);

//     let opSqlite;
//     try {
//       opSqlite = new OPSqliteOpenFactory({ dbFilename: 'powersync55226652.db' });
//       console.log('OPSQLite created');
//     } catch (err) {
//       console.error('❌ Failed to create OPSqlite:', err);
//       return BackgroundTask.BackgroundTaskResult.Failed;
//     }

//     let powersync;
//     try {
//       const logger = createBaseLogger();
//       logger.useDefaults();
//       logger.setLevel(LogLevel.DEBUG);

//       powersync = new PowerSyncDatabase({
//         schema: AppSchema,
//         database: opSqlite,
//         logger: logger,
//       });
//       console.log('PowerSync created');
//     } catch (err) {
//       console.error('❌ Failed to create PowerSync:', err);
//       return BackgroundTask.BackgroundTaskResult.Failed;
//     }

//     try {
//       await powersync.connect(connector, { clientImplementation: SyncClientImplementation.RUST });
//       console.log('PowerSync connected');
//     } catch (err) {
//       console.error('❌ Failed to connect PowerSync:', err);
//       return BackgroundTask.BackgroundTaskResult.Failed;
//     }

//     // const userId = await connector.userId();
//     const userId = 'ed437b99-7ec0-4e14-bcbe-1534e55efecb';
//     console.log('User ID:', userId);

//     try {
//       await powersync.execute(`
//         INSERT INTO ${LIST_TABLE} (id, name, owner_id)
//         VALUES (uuid(), 'From Inside BG TASK Test', ?);
//       `, [userId]);
//       console.log('List inserted');
//     } catch (err) {
//       console.error('❌ Failed to insert row:', err);
//       return BackgroundTask.BackgroundTaskResult.Failed;
//     }

//     console.log('✅ Background sync task completed');
//     return BackgroundTask.BackgroundTaskResult.Success;

//   } catch (error) {
//     console.error('❌ Unexpected error in background task:', error);
//     return BackgroundTask.BackgroundTaskResult.Failed;
//   }
// });


TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Background sync task starting TEST');

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
      VALUES (uuid(), 'From Inside BG TASK TTT', ?);
    `, [userId]);

    console.log('List inserted');
    console.log('Background sync task completed');

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error('❌ Background sync task failed:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});