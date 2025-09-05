import React from 'react';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { createBaseLogger, LogLevel, PowerSyncDatabase, SyncClientImplementation } from '@powersync/react-native';
import { SupabaseConnector } from '@/supabase/SupabaseConnector';
import { AppSchema } from '@/powersync/AppSchema';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

export class System {
    connector: SupabaseConnector;
    powersync: PowerSyncDatabase;

    constructor() {
        this.connector = new SupabaseConnector();
        const opSqlite = new OPSqliteOpenFactory({
            dbFilename: 'dev.db'
        });

        this.powersync = new PowerSyncDatabase({
            schema: AppSchema,
            database: opSqlite,
            logger: logger
        });
    }

    async init() {
        await this.connector.signInAnonymously();

        await this.powersync.init();

        await this.powersync.connect(this.connector, {
            clientImplementation: SyncClientImplementation.RUST
        });

        await new Promise<void>((resolve) => {
            const unregister = this.powersync.registerListener({
                statusChanged: (status) => {
                    const hasSynced = Boolean(status.lastSyncedAt);
                    const downloading = status.dataFlowStatus?.downloading || false;
                    const uploading = status.dataFlowStatus?.uploading || false;
                    console.log(
                        '[PowerSync] Status changed:',
                        hasSynced ? '✅ Synced' : '⏳ Not yet synced',
                        downloading ? '📥 Downloading' : '✅ Not downloading',
                        uploading ? '📤 Uploading' : '✅ Not uploading'
                    );

                    // Resolve when initial sync is complete
                    if (hasSynced && !uploading) {
                        console.log('[PowerSync] Sync complete ✅');
                        resolve();
                        unregister();
                    }
                },
            });
        });
    }

    async disconnect() {
        await this.powersync.disconnect();
    }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);


