Run the App
- npx expo start 

Upgrade expo SDK
- expo upgrade

Android Play Store build (generates .aab file to upload on Android Play Store)
- eas build -p android --profile production
- expo build:android -t app-bundle (old, do not use)

Publish OTA
- eas update
- expo publish (old, do not use)







