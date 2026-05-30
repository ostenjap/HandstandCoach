# Run Handstand Coach on Your Android Phone

## Prerequisites (one-time)

| What | Command / Action |
|------|-----------------|
| Expo account | Sign up at https://expo.dev |
| EAS CLI | `npm install -g eas-cli` |
| Log in | `eas login` |
| Link project | `eas init` (run once in project root, ties repo to your Expo account) |
| Enable USB debugging | Phone → Settings → About → tap Build Number 7× → Developer Options → USB Debugging ON |
| MoveNet model | See `assets/models/README.md` — download `.tflite` and place it there |

---

## Step 1 — Build the dev client (one-time, ~10 min in the cloud)

```powershell
eas build --profile development --platform android
```

- Builds on EAS Linux servers (no local C++ needed).
- When done, EAS prints a QR code / download link.
- Download the `.apk` and install it on your phone (allow "Install unknown apps" if prompted).

> Rebuild the dev client only when you add/remove native packages. For JS-only changes, skip straight to Step 2.

---

## Step 2 — Start the JS bundler on your machine

```powershell
npx expo start --dev-client
```

Your terminal shows a QR code and a local URL like `exp+handstand-coach://...`

---

## Step 3 — Connect your phone

**Option A — Same Wi-Fi (easiest)**
1. Open the **Expo Dev Client** app you installed in Step 1.
2. Tap **Scan QR code** and scan the code in your terminal.

**Option B — USB (more reliable on spotty Wi-Fi)**
```powershell
# Forward Metro's port over USB
adb reverse tcp:8081 tcp:8081
```
Then open the dev client, tap **Enter URL manually**, and type:
```
http://localhost:8081
```

---

## Daily workflow (after the dev client is installed)

```powershell
# 1. Start the bundler
npx expo start --dev-client

# 2. Open the app on your phone — it hot-reloads on every save
```

Shake the phone (or press `j` in the terminal) to open the dev menu.

---

## Useful one-liners

| Task | Command |
|------|---------|
| Check connected devices | `adb devices` |
| Stream phone logs | `adb logcat *:E` |
| Clear Metro cache | `npx expo start --dev-client --clear` |
| Rebuild native (after package changes) | `eas build --profile development --platform android` |
| Install a local APK via USB | `adb install path\to\file.apk` |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Unable to connect to Metro" | Run `adb reverse tcp:8081 tcp:8081` and retry |
| App crashes immediately | Check `adb logcat` — likely missing `movenet-lightning.tflite` model |
| Camera black screen | Confirm Camera permission granted in Phone Settings → Apps → handstand-coach |
| Stale build after adding a package | `eas build --profile development --platform android` again |
| Metro stuck / weird errors | `npx expo start --dev-client --clear` |
