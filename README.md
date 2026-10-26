# Vector Technical — Maintenance Portal

The Vector Technical operations portal (job dispatch, rota, clock-in logs, contractor payouts, alerts and Comms Hub) as **installable apps for phones and computers**, with the same black-and-gold design as the web version.

Every version reads and writes the **same Firebase database**, so a job dispatched from a PC appears on the technician's phone within a second or two, and a clock-in on a phone shows up on the admin's laptop straight away.

| Platform | What you install | Where it comes from |
|---|---|---|
| **Windows 10 / 11** | `Vector_1.0.0_x64-setup.exe` (or the `.msi`) | `npm run desktop:build` on a Windows PC, or GitHub Actions |
| **macOS** (Apple Silicon + Intel) | `Vector_1.0.0_universal.dmg` | GitHub Actions (macOS apps can only be built on a Mac) |
| **Linux** | `.AppImage`, `.deb`, `.rpm` | GitHub Actions |
| **Android 7+** | `app-universal-release.apk` | `npm run android:build`, or GitHub Actions |
| **iPhone / iPad** | Built with Xcode | Needs a Mac and an Apple Developer account — see [iPhone](#iphone--ipad) |
| **Web / PWA** | Any browser | `npm run build`, then host the `dist/` folder |

The native apps are built with [Tauri](https://tauri.app) (a Rust core wrapped around the existing React app), so they're small, fast, and run the exact same screens as the web version.

---

## How sync works

- All versions use the Firestore database configured in `firebase-applet-config.json`.
- Every device keeps a **local copy** of the data. The app opens instantly from it, keeps working without signal (an **Offline Mode** notice appears under the header), and uploads anything done offline as soon as the connection returns.
- Notifications (new jobs, rota changes, messages, payroll) appear as real system notifications on Windows, macOS, Linux and Android. On computers they keep arriving while the app is minimised. Phones pause apps that aren't on screen, so there they arrive while the app is open. Alerts that reach a phone even when the app is closed would need Firebase Cloud Messaging plus a small server function, which is a possible next step.

---

## Installing the apps

### Windows
Run `Vector_…_x64-setup.exe`. Because the installer isn't code-signed yet, Windows SmartScreen may say *"Windows protected your PC"* — click **More info → Run anyway**. Installing a newer version over the top upgrades it in place.

### macOS
Open the `.dmg` and drag **Vector** into **Applications**. The first time, macOS will refuse to open it because it isn't notarised by Apple: open **System Settings → Privacy & Security**, scroll down and click **Open Anyway**. (Signing with an Apple Developer ID removes this step — see [Signing](#code-signing-optional).)

### Android
Send the `.apk` to the phone (email, WhatsApp, Google Drive…), tap it, and allow *Install unknown apps* for that app when asked. The app asks for permission to show notifications on first launch.
To update, install the newer APK over the old one. **Updates only install if they're signed with the same key** — see [Android signing key](#android-signing-key).

### iPhone / iPad
Apple only allows apps from the App Store, TestFlight, or devices registered to a developer account, so you need:
1. A Mac with Xcode installed, and an [Apple Developer account](https://developer.apple.com/programs/) ($99/year).
2. On the Mac, in this project: `npm install`, then `npm run tauri ios init` (once).
3. Set your team ID in `src-tauri/tauri.conf.json` → `bundle.iOS.developmentTeam`.
4. `npm run ios:build`, then distribute through TestFlight or the App Store.

Until then, iPhone users can use the web version: open it in Safari → **Share → Add to Home Screen**. It gets the Vector icon, runs full-screen and syncs the same way. (The web version must be hosted somewhere first, for example with Firebase Hosting.)

---

## Building the apps yourself

### Tools you need

| For | Install |
|---|---|
| Everything | [Node.js 20+](https://nodejs.org) and [Rust](https://rustup.rs) |
| Windows apps | *Microsoft C++ Build Tools* ("Desktop development with C++") — WebView2 is already part of Windows 10/11 |
| macOS / iOS apps | Xcode (and `xcode-select --install`) |
| Linux apps | `sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf` |
| Android apps | [Android Studio](https://developer.android.com/studio) with the SDK and the **NDK (Side by side)**; Rust Android targets: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`; and the environment variables `ANDROID_HOME` (your SDK folder) and `NDK_HOME` (`%ANDROID_HOME%\ndk\<version>`) |

Then run `npm install` once. If an Android build complains about Java, point `JAVA_HOME` at the JDK that comes with Android Studio (`C:\Program Files\Android\Android Studio\jbr` on Windows).

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Web version at http://localhost:3000 |
| `npm run desktop:dev` | Desktop app window with live reload |
| `npm run desktop:build` | Installers in `src-tauri/target/release/bundle/` (`nsis/` and `msi/` on Windows, `dmg/` on macOS) |
| `npm run android:dev` | Runs on a connected phone or emulator with live reload |
| `npm run android:build` | APK in `src-tauri/gen/android/app/build/outputs/apk/universal/release/` |
| `npm run ios:dev` / `npm run ios:build` | iPhone builds (Mac only, after `npm run tauri ios init`) |
| `npm run build` | Web/PWA version in `dist/` |

For the Google Play Store, build an app bundle instead of an APK: `npm run tauri android build -- --aab`.

### Building every platform with GitHub Actions

`.github/workflows/build-apps.yml` builds Windows, macOS, Linux and Android installers on GitHub's servers, so you don't need a Mac for the macOS version.

1. Push this repository to GitHub.
2. Open **Actions → Build apps → Run workflow**.
3. When it finishes (about 15–25 minutes), download the installers from the **Artifacts** section of the run.

On a private repository these builds count against your GitHub Actions minutes, and macOS minutes count 10× (public repositories are free).

Pushing a version tag (`git tag v1.0.1` then `git push origin v1.0.1`) also attaches all installers to a draft **GitHub Release**, which you can publish as a download page for staff.

### Releasing a new version

Bump `version` in `src-tauri/tauri.conf.json` (for example `1.0.0` → `1.0.1`) before building. Android refuses to install an update unless its version is higher than the one already on the phone.

---

## Android signing key

Android apps are signed with a private key, and every update must be signed with the **same** key.

- On the PC that set this project up, the key is `C:\Users\HP\.vector-signing\vector-release.jks`, and its password is in `src-tauri/gen/android/keystore.properties`. Neither file is committed to git.
- **Back up both somewhere safe** (a password manager or company drive). If the key is lost, phones won't accept updates over the installed app; everyone would have to uninstall and reinstall.
- To let GitHub Actions sign with the same key, add two repository secrets (**Settings → Secrets and variables → Actions**):
  - `ANDROID_KEYSTORE_BASE64`: the key file as base64. In PowerShell:
    `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.vector-signing\vector-release.jks")) | Set-Clipboard`
  - `ANDROID_KEYSTORE_PASSWORD`: the `password=` value from `keystore.properties`.

Without these secrets, GitHub Actions still produces an APK, but signs it with a temporary key. That's fine for testing, but it can't be installed as an update over the real one.

## Code signing (optional)

The Windows and macOS builds work unsigned, but show the warnings described above. To remove them:
- **Windows:** buy a code-signing certificate and follow [Tauri's Windows signing guide](https://v2.tauri.app/distribute/sign/windows/).
- **macOS:** with an Apple Developer account, follow [Tauri's macOS signing guide](https://v2.tauri.app/distribute/sign/macos/) (Developer ID + notarisation).

---

## Security

### What this version fixes

The original app stored every password as plain text in the database, and its database rules let anyone on the internet read and change everything. This version:

- **Signs people in with Firebase Authentication.** People still sign in with their **surname and the same password**. At the owner's request, the CEO (Super Admin) can still see everyone's password in Team Management: a copy is kept in a locked `staffPasswords` collection that only the Super Admin can read (other managers can set passwords but not read them). Anyone who gets into the CEO's account can see every password, so keep that password strong and private.
- **Enforces every role on Firebase's servers** (`firestore.rules`), so it holds even against someone who bypasses the app:
  - Technicians see only their own jobs, shifts, clock logs, balance and alerts. They can only move their own jobs forward one step, and can't edit their pay, role or timesheet approvals.
  - Direct messages are private to the two people in them (admins included); everyone shares the General channel.
  - Pay owed lives in a separate `balances` collection that only the person and payroll (CEO, Finance) can read.
  - Only the CEO and Head of Procurement manage people; only the CEO can create or change a super-admin.
- **Pays each job exactly once.** Before, re-marking a job "Complete" paid the technician again, and two updates at the same time could lose money.
- **Cuts off old passwords immediately**: resetting someone's password signs out every device still using the old one.
- **Clears the offline copy of the data on sign-out**, so the next person on a shared phone or tablet can't see it.

### Switching over (do this once, in this order)

1. **Turn on Email/Password sign-in.** Firebase console → your project → **Authentication** → **Get started** (if shown) → **Sign-in method** → **Email/Password** → Enable → Save.
2. **Install this version** on the CEO's computer or phone (or open the updated web version).
3. **Secure the accounts.** The CEO signs in as usual → Admin Panel → **Team Management** → **Account Security** → **Secure all accounts**. Everyone gets a protected sign-in with their current password, and the plain-text passwords are removed from the staff list (the CEO-only copy keeps them visible in Team Management). The panel lists anyone who still needs a password (for example two people sharing a surname) and anyone whose password is weak.
4. **Publish the new rules straight away.** Either:
   - in the Firebase console: **Firestore Database** → choose the database **`ai-studio-2b14b9be-c901-4cd5-9b45-60bb8c6e2664`** → **Rules** → replace everything with the contents of `firestore.rules` → **Publish**; or
   - from this folder: `npx firebase-tools login`, then `npx firebase-tools deploy --only firestore:rules`.
5. Click **Sign in again** and sign in with the same password. In Team Management → Modify, set passwords for anyone listed under "No sign-in yet", and **replace every weak or publicly known password**.
6. **Update everyone's app.** After step 4, older versions can no longer reach the database.

Do steps 3 and 4 back to back. Publishing the rules *before* step 3 would lock everyone out (if that happens, temporarily re-publish the old rules, run step 3, then publish again).

> **Change the CEO's password.** The old demo data in this repository (`src/data.ts`, now deleted but still in the git history on GitHub) contained the CEO's password and several "0000" PINs. Treat those as public. The switch-over flags them, and they should be reset at step 5.

### Good to know

- New and reset passwords need at least 6 characters. Existing shorter PINs keep working until they're changed.
- The first sign-in on a device needs internet; after that the app also opens offline.
- `npm run test:rules` checks every rule against Firebase's rules emulator (needs the Firebase CLI from npm, `npm i -g firebase-tools`, and Java 11+).
- Extra hardening for later: turn on [Firebase App Check](https://firebase.google.com/docs/app-check), and in Google Cloud console restrict the API key to the Firebase APIs.

---

## Project layout

| Path | What it is |
|---|---|
| `src/` | The React app shared by every platform |
| `src/auth.ts` | Sign-in, account management (create, reset password, remove) and the one-time switch-over |
| `src/platform.ts` | Native notifications, dialogs and file saving in the installed apps, with the original browser behaviour on the web |
| `firestore.rules` | Who may read and change what (enforced by Firebase); `tests/` checks it |
| `src-tauri/` | The native app shell (Rust): window settings, icons, permissions, desktop/mobile plugins |
| `src-tauri/gen/android/` | The Android Studio project |
| `src-tauri/icons/source/` | Icon sources; regenerate every app icon with `npm run tauri icon src-tauri/icons/source/icon-manifest.json` |
| `.github/workflows/build-apps.yml` | Builds all platforms on GitHub |

*Originally built in Google AI Studio: https://ai.studio/apps/2b14b9be-c901-4cd5-9b45-60bb8c6e2664*
