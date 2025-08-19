import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { PowerSyncContext } from '@powersync/react-native';
import { useSystem } from '@/powersync/system';
import { useMemo, useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerBackgroundTask } from '@/powersync/BackgroundSync';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const system = useSystem();
  const db = useMemo(() => {
    return system.powersync;
  }, [system]);

  useEffect(() => {
    // Register the background sync task that is triggered by a silent notification.
    registerBackgroundTask();

    // Request notification permissions for iOS.
    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted.');
        // You might want to display a message to the user here.
        return;
      }
      console.log('Notification permissions granted.');
    }

    requestPermissions();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <PowerSyncContext.Provider value={db}>
      <SafeAreaView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaView>
    </PowerSyncContext.Provider>
  );
}
