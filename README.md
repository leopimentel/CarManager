Run the App
- npx expo start 

Upgrade expo SDK
- expo upgrade
- npx expo install expo@latest

npx expo install --check #check compatibility and packages which need to be updated
npx expo install --fix #update invalid package version
npx expo start --reset-cache
npx expo install react-native-simple-toast
npx expo uninstall react-native-tiny-toast

Android Play Store build (generates .aab file to upload on Android Play Store)
- eas build -p android --profile production
- eas build -p android --profile preview
- expo build:android -t app-bundle (old, do not use)

Publish OTA
- eas update
- eas update --channel production --message "Testando eas update" -p android
- expo publish (old, do not use)

Show Lint
yarn lint

Updates eas
- npm install -g eas-cli


https://docs.expo.dev/versions/latest/sdk/sqlite/#getallasynctsource-params
https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
https://expo.dev/changelog/2024/05-07-sdk-51
https://expo.dev/changelog/2024/01-18-sdk-50
https://daily.dev/blog/understanding-javascript-for-of-with-index#:~:text=for...of%20loop%20makes,and%20value%20of%20each%20item.



