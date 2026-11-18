# Android builds

The Expo app in `app/` builds as an Android application with package ID
`com.huyphuoc.noitu`. Both build profiles connect to the existing HTTPS server
at `https://noi-tu-server-sg.onrender.com`.

## APK for device testing

Run from `app/`:

```powershell
npm ci
npx expo-doctor
npx tsc --noEmit
npx expo lint
npx eas-cli@latest build -p android --profile preview
```

Download the APK from the build's artifact URL. With USB debugging enabled:

```powershell
adb devices -l
adb -s DEVICE_SERIAL install -r PATH_TO_APK
adb -s DEVICE_SERIAL shell am start -n com.huyphuoc.noitu/.MainActivity
```

The preview APK contains its JavaScript and assets; Metro is not required.
Multiplayer gameplay still needs an internet connection to the server.
EAS manages the existing signing credentials. Keep using the same credentials
for updates; do not commit keystores or credentials into this repository.

## AAB after device testing is approved

```powershell
npx eas-cli@latest build -p android --profile production
```

This profile produces an AAB and increments the remotely managed Android
version code. Building does not submit or publish the app to Google Play.

Before store submission, separately review Play Billing for Ruby purchases,
privacy disclosures, account deletion, content rating and store assets.

## Native adaptations

- `Image.native.ts` uses Expo Image and converts URL-encoded SVG data URIs
  to UTF-8 base64 for Android's base64-only data loader. This restores preset
  portraits, customized characters and generated game artwork. The web
  implementation continues to use React Native Web Image.
- Portraits fall back to a generated character if an uploaded photo fails,
  with an animal placeholder visible while the image loads or fails.
- `sound.native.ts` uses Expo Audio and remembers mute preferences in
  AsyncStorage. Audio players are released when the app leaves the foreground.
- `scripts/generate-native-sounds.cjs` renders the recipes in `src/sound.ts`
  into the 33 bundled WAV effects. After changing a recipe, run
  `node scripts/generate-native-sounds.cjs` and rebuild the APK.
- Native invitation sharing uses the Android share sheet with a public web
  room link. Opening that link in the installed app is not configured yet.
- Native layouts use device dimensions and allow the window to resize for
  the keyboard. Android's `KeyboardFrame` measures the outer frame and reserves
  only the part overlapped by the keyboard, avoiding a feedback loop between
  keyboard avoidance and content measurements. It shares the actual remaining
  viewport with game screens and sheets. Native word-chain controls stay in
  the bottom action area. Chat keeps its input at the top and hides
  sticker/emoji pickers while typing.
- `useKeyboardLift` only runs on web. Native host views can expose browser-like
  measurement methods without DOM styling APIs; native keyboard avoidance is
  handled by `KeyboardFrame`.
- `viewMeasurements.ts` measures native avatars, game targets and effect
  layers with `measureInWindow`. It refreshes mounted targets while the app
  is active, allowing chat bubbles, throws and hit effects to use the same
  relative-coordinate animations as the web version.
- The 12 Chu Lay text stickers use bundled PNGs on native because Android's
  SVG image decoder does not render their SVG text. Regenerate them with
  `node scripts/generate-native-stickers.cjs` after installing the dependencies
  in `e2e/` and Chrome. The web version keeps its original SVG stickers.
- Native mirror effects animate the app container. Native dice support tap
  and swipe throws and animate positions from the server's physics frames;
  their faces use the existing 2D dice renderer rather than browser CSS 3D.

## Device test checklist

Verified on a USB-connected Samsung Galaxy A14 (Android 14), 2026-11-13:
chat and word-chain typing remain visible above the Samsung keyboard, Chu Lay
sticker cards render, and a sent sticker bubble appears below the avatar.
The final preview APK also passed a word-chain typing retest without new
ReactNativeJS or AndroidRuntime errors. Typecheck and lint passed.

- Launch, enter a name, create a room, and join from another device/browser.
- Play Vietnamese/English word chain, Bau Cua and Ty Phu.
- Check keyboard visibility, portrait/landscape layout, avatars and stickers.
- Check sound, mute/unmute, vibrations, invitation sharing and reconnecting
  after backgrounding the app.
- Check login and photo selection with a test account.
- Verify chat bubbles and targeted flying effects after scrolling the avatar
  strip and after opening/closing the keyboard.
