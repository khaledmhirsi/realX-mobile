# reelx-mobile

Welcome to your Expo app! This project was created with `create-expo-app` and uses Expo Router for file-based routing.

## 🚀 Get Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Node.js (LTS version recommended)
*   pnpm 10 for the mobile app
*   npm for `functions/`
*   Expo Go app on your mobile device (optional, for testing on device)

### 1. Install Dependencies

Install the mobile dependencies using pnpm:

```bash
pnpm install
```

### 2. Configure Firebase

This project uses React Native Firebase and the production `reelx-backend` project.

1.  **Add Apps to the Production Firebase Project:**
    *   **Android App:** Register `com.reelx.app`. Download `google-services.json` and place it in the project root directory (`./google-services.json`).
    *   **iOS App:** Register `com.reelx.app`. Download `GoogleService-Info.plist` and place it in the project root directory (`./GoogleService-Info.plist`).

    *Note: This repository only uses the production Firebase project, `reelx-backend`. Local, preview, development, and production builds all connect to production data and services.*

2.  **Configure App Check:**
    Register local debug tokens against `reelx-backend` and supply them through an untracked
    environment file or EAS environment variable.

### 3. Start the Development Server

Once dependencies are installed and Firebase is configured, start the Expo development server:

```bash
pnpm start
```

Local development builds use the production app identity and Firebase project. App Check debug tokens must be registered against `reelx-backend` and supplied through an untracked local or EAS environment variable.

This will open a new tab in your browser with the Expo Dev Tools. You can then:

*   Open the app in a [development build](https://docs.expo.dev/develop/development-builds/introduction/)
*   Run on an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
*   Run on an [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
*   Scan the QR code with the [Expo Go app](https://expo.dev/go) on your phone.

You can start developing by editing the files inside the **app** directory.

## Clear Generated Output

To clear Expo caches and generated build output without deleting source files, run:

```bash
pnpm reset-project
```

Firebase validation is manual. Use the checklist in
[`docs/manual-firebase-validation.md`](docs/manual-firebase-validation.md) before deployment.

## 📚 Learn More

To learn more about developing your project with Expo, refer to the following resources:

*   [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
*   [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## 👋 Join the Community

Join our community of developers creating universal apps.

*   [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
*   [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
