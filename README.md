# reelx-mobile

Welcome to your Expo app! This project was created with `create-expo-app` and uses Expo Router for file-based routing.

## 🚀 Get Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or Yarn
*   Expo Go app on your mobile device (optional, for testing on device)

### 1. Install Dependencies

Install the project dependencies using npm:

```bash
npm install
```

### 2. Configure Firebase

This project uses Firebase for backend services. To get started with Firebase:

1.  **Create a Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click "Add project" and follow the instructions to create a new project.

2.  **Add Apps to the Production Firebase Project:**
    *   **Android App:** Register `com.reelx.app`. Download `google-services.json` and place it in the project root directory (`./google-services.json`).
    *   **iOS App:** Register `com.reelx.app`. Download `GoogleService-Info.plist` and place it in the project root directory (`./GoogleService-Info.plist`).

    *Note: This repository only uses the production Firebase project, `reelx-backend`. Local, preview, development, and production builds all connect to production data and services.*

3.  **Add Firebase Configuration to your Project:**
    Create a file named `constants/firebaseConfig.ts` and add your Firebase configuration:

    ```typescript
    // constants/firebaseConfig.ts
    import { initializeApp } from 'firebase/app';
    // import { getAuth } from 'firebase/auth'; // if using Firebase Auth
    // import { getFirestore } from 'firebase/firestore'; // if using Firestore
    // import { getStorage } from 'firebase/storage'; // if using Firebase Storage

    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID",
      measurementId: "YOUR_MEASUREMENT_ID" // Optional
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    // export const auth = getAuth(app); // if using Firebase Auth
    // export const db = getFirestore(app); // if using Firestore
    // export const storage = getStorage(app); // if using Firebase Storage
    ```
    *Note: You will need to install specific Firebase modules (e.g., `firebase/auth`, `firebase/firestore`) depending on the services you use: `npm install firebase`*

4.  **Initialize Firebase in your App:**
    Ensure your Firebase app is initialized at an appropriate entry point, like `app/_layout.tsx` or a dedicated initialization file. The `initializeApp` call from the previous step handles this.

### 3. Start the Development Server

Once dependencies are installed and Firebase is configured, start the Expo development server:

```bash
npm run start
```

Local development builds use the production app identity and Firebase project. App Check debug tokens must be registered against `reelx-backend` and supplied through an untracked local or EAS environment variable.

This will open a new tab in your browser with the Expo Dev Tools. You can then:

*   Open the app in a [development build](https://docs.expo.dev/develop/development-builds/introduction/)
*   Run on an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
*   Run on an [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
*   Scan the QR code with the [Expo Go app](https://expo.dev/go) on your phone.

You can start developing by editing the files inside the **app** directory.

## ♻️ Get a Fresh Project (Reset Starter Code)

If you wish to reset the project to a blank state and start fresh, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## 📚 Learn More

To learn more about developing your project with Expo, refer to the following resources:

*   [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
*   [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## 👋 Join the Community

Join our community of developers creating universal apps.

*   [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
*   [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
