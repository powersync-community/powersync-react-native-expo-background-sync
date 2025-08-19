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
        this.connector = new SupabaseConnector(this);
        const opSqlite = new OPSqliteOpenFactory({
            dbFilename: 'powersync55226652.db'
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
            clientImplementation: SyncClientImplementation.RUST,
        });

        const l = this.powersync.registerListener({
            initialized: () => { },
            statusChanged: (status) => {
                console.log('PowerSync status changed:', status);

                // if (status!.downloadProgress?.downloadedFraction == 1 && status!.dataFlowStatus!.downloading) {
                //     console.log("Something weird is happening!", JSON.stringify(status, null, 2));
                // }
            }
        });
    }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);


