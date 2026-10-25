import { isTauri } from '@tauri-apps/api/core';
import { confirm as nativeConfirm, message as nativeMessage, save as nativeSave } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

// True inside the installed desktop/mobile app, false in a normal browser tab.
// Every helper below keeps the original browser behaviour when this is false.
export const isNativeApp = isTauri();

let nativeNotificationsAllowed = false;

// Ask for permission to show system notifications
export async function initNotifications() {
  if (isNativeApp) {
    try {
      nativeNotificationsAllowed = await isPermissionGranted();
      if (!nativeNotificationsAllowed) {
        nativeNotificationsAllowed = (await requestPermission()) === 'granted';
      }
    } catch (err) {
      console.warn('Notification permission request failed:', err);
    }
    return;
  }

  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
  // Register a dummy service worker to allow push notifications on Android Chrome
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service Worker registration failed:', err);
    });
  }
}

// Trigger an OS-level notification (Windows/macOS/Linux notification centre, phone notification shade)
export function showSystemNotification(title: string, body: string) {
  if (isNativeApp) {
    if (nativeNotificationsAllowed) {
      try {
        sendNotification({ title, body });
      } catch (e) {}
    }
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.svg' });
    } catch (e) {
      // Fallback for Android Chrome which requires ServiceWorkerRegistration.showNotification()
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, { body, icon: '/favicon.svg' });
        });
      }
    }
  }
}

// Replacement for window.confirm(), which is unreliable inside app webviews (iOS silently returns false)
export async function confirmAction(text: string): Promise<boolean> {
  if (isNativeApp) {
    try {
      return await nativeConfirm(text, { kind: 'warning' });
    } catch (err) {
      console.warn('Native confirm dialog failed:', err);
    }
  }
  return window.confirm(text);
}

// Replacement for window.alert()
export async function showAlert(text: string): Promise<void> {
  if (isNativeApp) {
    try {
      await nativeMessage(text, { kind: 'warning' });
      return;
    } catch (err) {
      console.warn('Native message dialog failed:', err);
    }
  }
  window.alert(text);
}

// Save a JSON export. Browsers download it straight away; the installed app opens a native
// "Save as" dialog because app webviews ignore <a download>. Resolves false if the dialog is cancelled.
export async function saveJsonFile(fileName: string, contents: string): Promise<boolean> {
  if (isNativeApp) {
    try {
      const path = await nativeSave({
        defaultPath: fileName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!path) return false;
      await writeTextFile(path, contents);
      return true;
    } catch (err) {
      console.warn('Native save failed, falling back to browser download:', err);
    }
  }

  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}
