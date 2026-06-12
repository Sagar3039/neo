# Firebase Google Auth Setup for Electron

## Error: "Firebase: Error (auth/unauthorized-domain)"

This error occurs when Firebase doesn't recognize your app's domain. For Electron desktop apps, you need to authorize localhost and your computer's hostname.

## Quick Fix

### 1. Go to Firebase Console
- Open [Firebase Console](https://console.firebase.google.com/)
- Select your project: **neeo-8be19**
- Go to **Authentication** → **Settings** → **Authorized domains**

### 2. Add Your Local Domains
Add these domains to the authorized list:

```
localhost
127.0.0.1
<your-computer-name>
```

**Finding your computer name:**
- On Windows: Right-click "This PC" → Properties → Look for "Device name"
- Or open PowerShell and run: `$env:COMPUTERNAME`
- Or in Command Prompt: `echo %COMPUTERNAME%`

### 3. Add OAuth Redirect URIs (Optional but Recommended)
In **Authentication** → **Settings** → **Authorized redirect URIs**, add:

```
http://localhost:3000/
http://localhost:5173/
http://<your-computer-name>/
```

## How It Works Now

### For Web Users (Browser):
- Uses Google popup authentication
- Standard OAuth flow

### For Electron Users (Desktop):
- Uses Google redirect authentication
- Opens browser, then returns to app
- More compatible with desktop app restrictions

## Verification

After adding the domains:

1. Rebuild the app: `npm start`
2. Try Google Sign-In again
3. You should see the Google login prompt

If you still get errors:
- Clear browser cache in DevTools (Ctrl+Shift+I)
- Restart the app
- Check that the domain name is exactly correct (case-sensitive on some systems)

## Production Deployment

When deploying to production:
- Add your production domain: `yourdomain.com`
- Remove `localhost` for security
- Use only HTTPS URLs
- Add the production OAuth redirect URIs

## Troubleshooting

**Still getting unauthorized-domain error?**
- Wait 5-10 minutes after adding the domain (Firebase may cache settings)
- Hard refresh the app (Ctrl+Shift+R in DevTools)
- Check Firebase Console to confirm domain was actually saved
- Make sure there are no typos in the domain name

**Google popup doesn't appear?**
- Check browser console for errors (DevTools)
- Disable popup blockers
- For Electron, the flow redirects to browser - check if browser opened

**Redirect doesn't return to app?**
- This is normal for Electron desktop apps
- The OAuth token is handled in the background
- Watch the app UI - it should update after successful auth
