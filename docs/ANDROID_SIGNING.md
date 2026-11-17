# Android release signing

A release keystore gives MUSE APKs a stable signing identity. Keep the keystore and passwords private: anyone who obtains them can sign an app update that Android treats as coming from the same publisher.

## 1. Create the keystore once

On a computer with Java installed, run:

```bash
keytool -genkeypair -v \
  -keystore muse-release.keystore \
  -alias muse \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Choose strong passwords and keep a secure offline backup of the keystore and its passwords. Do not regenerate it for later releases. If it is lost, future APKs cannot be signed with the same identity.

## 2. Add GitHub Actions secrets

In the repository, open **Settings → Secrets and variables → Actions → New repository secret**.

Create these four secrets:

- `MUSE_ANDROID_KEYSTORE_BASE64`: the keystore file encoded as one Base64 string.
- `MUSE_ANDROID_KEYSTORE_PASSWORD`: the keystore password.
- `MUSE_ANDROID_KEY_ALIAS`: the alias, for example `muse`.
- `MUSE_ANDROID_KEY_PASSWORD`: the key password.

To encode the keystore:

Linux:
```bash
base64 -w 0 muse-release.keystore
```

macOS:
```bash
base64 < muse-release.keystore | tr -d '\\n'
```

Windows PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("muse-release.keystore"))
```

Paste the resulting Base64 text into the first secret. Never paste the keystore or passwords into a chat, issue, commit, or public repository.

## 3. Build future APKs

Run **Actions → Build MUSE Android APK → Run workflow**. When all four secrets are present, the workflow creates a signed release APK and uploads the artifact named `MUSE-Android-APK`. If the secrets are not configured, it creates a debug APK named `MUSE-Android-APK-debug` for testing.

Keep the same `applicationId` (`com.wxolesto.muse`) and the same keystore for every update. Android can then install later signed builds over the earlier release without uninstalling the app, preserving app-private data in normal update scenarios.

## Important

The first stable release-signed APK must be installed before later release-signed updates can replace it. A debug-signed APK and a release-signed APK have different signing identities; switching between them may require uninstalling the earlier app. Back up MUSE data before changing signing identities or reinstalling.
