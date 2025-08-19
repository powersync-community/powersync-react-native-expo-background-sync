# PowerSync React Native Expo Background Sync

To be able to use background push notifications on iOS, the remote-notification value needs to be present in the UIBackgroundModes array in your app's Info.plist file.

in app.json:
```json
[
  "expo-notifications",
  {
    "enableBackgroundRemoteNotifications": true
  }
]
```

and "backgroundModes": ["processing"]
