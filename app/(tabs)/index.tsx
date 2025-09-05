import { LIST_TABLE, ListRecord, TODO_TABLE } from '@/powersync/AppSchema';
import { useSystem } from '@/powersync/System';
import { useQuery, useStatus } from '@powersync/react-native';
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from 'react';
import { Button, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { initializeBackgroundTask } from '../../utils';
import * as BackgroundTask from "expo-background-task";

TaskManager.getRegisteredTasksAsync().then((tasks) => {
  console.log(tasks.length);
});

// Declare a variable to store the resolver function
let resolver: (() => void) | null;

// Create a promise and store its resolve function for later
const promise = new Promise<void>((resolve) => {
  resolver = resolve;
});

// Pass the promise to the background task, it will wait until the promise resolves
initializeBackgroundTask(promise);

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export default function HomeScreen() {
  const system = useSystem();
  const status = useStatus();

  useEffect(() => {
    // system.init();
    resolver?.();
  }, []);

  const { data: listRecords } = useQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(`
    SELECT
      ${LIST_TABLE}.*, 
      COUNT(${TODO_TABLE}.id) AS total_tasks, 
      SUM(CASE WHEN ${TODO_TABLE}.completed = true THEN 1 ELSE 0 END) as completed_tasks
    FROM
      ${LIST_TABLE}
    LEFT JOIN ${TODO_TABLE}
      ON  ${LIST_TABLE}.id = ${TODO_TABLE}.list_id
    GROUP BY
      ${LIST_TABLE}.id
    ORDER BY ${LIST_TABLE}.created_at DESC;
  `);

  // const insertList = async () => {
  //   await system.powersync.execute(`
  //     INSERT INTO ${LIST_TABLE} (id, name, owner_id)
  //     VALUES (uuid(), 'New List', ?);
  //   `, [await system.connector.userId()]);
  // };

  // console.log("List Records:", listRecords);

  // Calculate sync percentage
  const downloadProgress = status.downloadProgress;
  const syncPercentage = downloadProgress?.downloadedFraction
    ? Math.round(downloadProgress.downloadedFraction * 100)
    : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Todo Counts Per List
        </Text>

        {/* <View>
          <TouchableOpacity style={{
            backgroundColor: '#007AFF',
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
            alignItems: 'center'
          }} onPress={insertList}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Insert List</Text>
          </TouchableOpacity>
        </View> */}

        <View>
          <Button title="Trigger BG Task" onPress={async () => {
            await BackgroundTask.triggerTaskWorkerForTestingAsync();
          }} />
        </View>

        <TouchableOpacity
          onPress={async () => {
            await system.powersync.disconnectAndClear();
          }}
          style={{
            backgroundColor: '#007AFF',
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Disconnect and Clear</Text>
        </TouchableOpacity>

        {/* Sync Progress Indicator */}
        {status.dataFlowStatus?.downloading && downloadProgress && (
          <View style={{
            marginBottom: 20,
            padding: 15,
            backgroundColor: '#e3f2fd',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#2196f3'
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#1976d2',
              marginBottom: 5
            }}>
              Syncing...
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#1976d2'
            }}>
              {syncPercentage !== null ? `${syncPercentage}% complete` : 'Syncing...'}
            </Text>
            {downloadProgress && (
              <Text style={{
                fontSize: 12,
                color: '#1976d2',
                marginTop: 2
              }}>
                Downloaded {downloadProgress.downloadedOperations} out of {downloadProgress.totalOperations}
              </Text>
            )}

            {/* Progress Bar */}
            {downloadProgress && downloadProgress.totalOperations > 0 && (
              <View style={{
                marginTop: 10,
                height: 8,
                backgroundColor: '#bbdefb',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <View style={{
                  height: '100%',
                  backgroundColor: '#2196f3',
                  width: `${(downloadProgress.downloadedOperations / downloadProgress.totalOperations) * 100}%`,
                  borderRadius: 4
                }} />
              </View>
            )}
          </View>
        )}

        <FlatList
          data={listRecords}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={{ color: '#999', fontStyle: 'italic' }}>No lists found</Text>
          }
          renderItem={({ item: list }) => (
            <View style={{
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 15,
              backgroundColor: '#f9f9f9'
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
                {list.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                {description(list.total_tasks ?? 0, list.completed_tasks ?? 0)}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}