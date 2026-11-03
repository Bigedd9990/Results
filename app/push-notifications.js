/*
 * Club push notifications (OneSignal Web SDK v16).
 * Add the public OneSignal App ID from the OneSignal dashboard below.
 * Never put the OneSignal REST API key or any other secret in this file.
 */
const ONESIGNAL_APP_ID = 'PASTE_PUBLIC_ONESIGNAL_APP_ID_HERE';
const SETUP_PLACEHOLDER = 'PASTE_PUBLIC_ONESIGNAL_APP_ID_HERE';

function addNotificationPanel() {
  const clubScreen = document.getElementById('screen-club');
  if (!clubScreen) return;
  const panel = document.createElement('section');
  panel.className = 'info-card notification-panel';
  panel.setAttribute('aria-labelledby', 'notifications-title');
  panel.innerHTML = `
    <span class="info-icon" aria-hidden="true">🔔</span>
    <div class="notification-copy">
      <h2 id="notifications-title">Club notifications</h2>
      <p>Opt in to receive important player information and club announcements on this device.</p>
      <button id="notificationOptIn" class="notification-button" type="button">Enable notifications</button>
      <button id="notificationOptOut" class="notification-button secondary" type="button" hidden>Turn off notifications</button>
      <p id="notificationStatus" class="notification-status" role="status" aria-live="polite"></p>
    </div>`;
  const resources = clubScreen.querySelector('.app-shortcuts');
  if (resources) clubScreen.insertBefore(panel, resources);
  else clubScreen.append(panel);
}

function isIOSHomeScreenApp() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  return isIOS && !isStandalone;
}

function showNotificationStatus(message) {
  const status = document.getElementById('notificationStatus');
  if (status) status.textContent = message;
}

async function setupClubNotifications() {
  addNotificationPanel();
  const optInButton = document.getElementById('notificationOptIn');
  const optOutButton = document.getElementById('notificationOptOut');
  if (!optInButton || !optOutButton) return;

  if (ONESIGNAL_APP_ID === SETUP_PLACEHOLDER) {
    optInButton.disabled = true;
    showNotificationStatus('Notifications are not configured yet. A club admin must create a OneSignal app and add its public App ID.');
    return;
  }
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !window.isSecureContext) {
    optInButton.disabled = true;
    showNotificationStatus('Push notifications are not supported in this browser or page context. Open the app over HTTPS on a supported device.');
    return;
  }
  if (isIOSHomeScreenApp()) {
    showNotificationStatus('On iPhone or iPad, first use Share → Add to Home Screen, then open Esquina from its new Home Screen icon to enable notifications.');
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  const oneSignalReady = new Promise((resolve, reject) => {
    window.OneSignalDeferred.push(async OneSignal => {
      try {
        const workerPath = new URL('./service-worker.js', window.location.href).pathname;
        const appScope = new URL('./', window.location.href).pathname;
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: workerPath,
          serviceWorkerParam: { scope: appScope },
          notifyButton: { enable: false }
        });
        resolve(OneSignal);
      } catch (error) { reject(error); }
    });
    const sdk = document.createElement('script');
    sdk.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    sdk.defer = true;
    sdk.onerror = () => reject(new Error('Could not load the push notification service.'));
    document.head.append(sdk);
  });

  optInButton.addEventListener('click', async () => {
    optInButton.disabled = true;
    showNotificationStatus('Requesting notification permission…');
    try {
      if (isIOSHomeScreenApp()) throw new Error('Add this app to your Home Screen and reopen it before enabling notifications.');
      const OneSignal = await oneSignalReady;
      await OneSignal.User.PushSubscription.optIn();
      showNotificationStatus('Notifications enabled on this device. You can turn them off here at any time.');
      optInButton.hidden = true;
      optOutButton.hidden = false;
    } catch (error) {
      showNotificationStatus(error.message || 'Could not enable notifications. Please check your browser permission settings and try again.');
      optInButton.disabled = false;
    }
  });
  optOutButton.addEventListener('click', async () => {
    optOutButton.disabled = true;
    try {
      const OneSignal = await oneSignalReady;
      await OneSignal.User.PushSubscription.optOut();
      showNotificationStatus('Notifications turned off for this device.');
      optOutButton.hidden = true;
      optInButton.hidden = false;
    } catch (error) {
      showNotificationStatus(error.message || 'Could not turn notifications off.');
    } finally { optOutButton.disabled = false; }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupClubNotifications);
else setupClubNotifications();
