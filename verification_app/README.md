# Aryan Verification

Android application for admin-created TE accounts. A branch manager assigns a customer from billing; the TE sees customer address/contact details and the requesting BM's name/mobile, records a home visit with multiple photos, an optional compressed video, references and an authentication person, and submits **Verified** or **Could not be verified**. Results and protected evidence appear in customer KYC. The requesting BM receives an in-app result notification.

## Build and distribute

Use Flutter 3.44.8, Android SDK 36, and JDK 17:

```sh
flutter pub get
flutter analyze
flutter test
flutter build apk --release --dart-define=API_BASE=https://aryangold.in/api
```

Copy `build/app/outputs/flutter-apk/app-release.apk` to `../public/downloads/aryan-verification.apk`. Deploy the web/API changes, run `npm run db:setup`, and restart the Node application before distributing the APK. It is linked under **Android apps** on `/login`, in branch billing, and Admin → Verification & TEs. Production URL: `https://aryangold.in/downloads/aryan-verification.apk`.

The Android package ID is `in.aryangold.aryan_verification`. This initial sideload build uses the local Android debug signing key; retain that key for compatible updates, or configure a backed-up release signing key before broad distribution. Never commit signing keys or credentials.

## Notifications

The default build uses WorkManager to check for new assignments with a requested 15-minute interval and Android local notifications. Grant notification permission and allow background activity. Android may defer work due to battery restrictions, force-stop, or unavailable connectivity. Open the app and refresh to fetch assignments immediately.

For instant FCM push, register `in.aryangold.aryan_verification` in Firebase, place the downloaded `google-services.json` at `android/app/google-services.json`, enable Firebase Cloud Messaging HTTP v1, and configure the backend environment with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. The config file is intentionally ignored by Git. A normal release build then reads the public Android Firebase configuration through the Google services Gradle plugin:

```sh
flutter build apk --release --dart-define=API_BASE=https://aryangold.in/api
```

For non-Android builds or CI environments without `google-services.json`, the same public values can still be supplied using the `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, and `FIREBASE_SENDER_ID` Dart defines. The service-account private key belongs only on the server, never in the app or repository. See the [notification plugin setup](https://pub.dev/packages/flutter_local_notifications) for Android platform requirements.

## Workflow and storage

- Admin creates TE user ID/password and can enable or disable access.
- BM can assign a TE while registering a new customer or later from billing, and supplies a contact mobile/instructions. Customer registration and its optional initial assignment are committed together. Only one active request is allowed per customer; billing is not blocked.
- TE signs in, opens an assignment, calls customer/BM if needed, and starts the visit.
- Verified requires at least two photos, one reference with a valid mobile, and authentication person's name/mobile. Up to 12 photos and 10 references are accepted; images are limited to 8 MB each. Could-not-verify requires a reason.
- One optional visit video can be recorded from the camera for up to two minutes. The app compresses it to 640×480 at 24 fps before upload; the compressed MP4 is limited to 25 MB and all evidence in one submission is limited to 40 MB. The API independently validates MP4/H.264 format, duration, resolution, and size with the bundled ffprobe binary.
- Completed requests cannot be resubmitted. Photos and videos are stored privately in `storage/verification`; company-authenticated administrators can play the video and see the result, references and evidence under KYC.
- TE sessions expire after 30 days and are invalidated when admin disables the account or resets its password.

The backend endpoints are `/api/verification/login`, `/session`, `/device`, and `/requests` under `/api/verification`. They use TE bearer credentials and scope assignments to the logged-in TE. Schema lives in `../database/schema.sql`.
