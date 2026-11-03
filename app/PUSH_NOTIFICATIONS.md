# Enabling club push notifications

The app now includes an opt-in panel under **Club → Club notifications**. Push delivery requires a OneSignal account and is intentionally not active until the club configures it.

## One-time setup by a club admin

1. Create a OneSignal account and a Web Push app. Configure its website origin as the exact HTTPS origin where this app is hosted (for example `https://bigedd9990.github.io`). Check the OneSignal dashboard's GitHub Pages/subdirectory guidance for the app's `/Results/app/` path.
2. In OneSignal, configure the site name, icon and web push settings. Keep the REST API key private; it is not needed in this client app.
3. Copy the **public OneSignal App ID** into `ONESIGNAL_APP_ID` in `app/push-notifications.js`, replacing `PASTE_PUBLIC_ONESIGNAL_APP_ID_HERE`. The public App ID is intended for the client; never paste a REST API key into repository files.
4. Publish the feature branch to HTTPS. Ensure GitHub Pages/workflow is serving the updated app and service worker.
5. Test Android in Chrome. On iPhone/iPad, use Safari's **Share → Add to Home Screen**, launch the installed web app, then tap **Enable notifications** in Club. Users must explicitly grant permission.
6. Send a test notification to opted-in subscribers from the OneSignal dashboard. Club announcements can be sent from that dashboard; editing a page by itself does not send a notification.

## Technical notes

- `app/service-worker.js` imports OneSignal's v16 worker and keeps the existing app-shell/offline behavior in the same service worker scope.
- `app/push-notifications.js` adds the opt-in/opt-out controls and initializes the SDK only after the public App ID is configured.
- The user must opt in on each device. A browser/app update is not itself a push notification.
- Push credentials and subscriber records are managed by OneSignal; no REST API secret or subscriber list is stored in this repository.
- For iOS/iPadOS, web push requires a supported OS and a Home Screen-installed web app. Android/browser behavior depends on browser support and permission.
- Test service-worker registration and OneSignal's configured worker path/scope on the actual deployed URL; GitHub Pages project sites are hosted in a path below the origin, which must be reflected in the provider setup.
