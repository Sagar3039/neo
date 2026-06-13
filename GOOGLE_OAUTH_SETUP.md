# Google OAuth Setup for Electron App

## Current Status
✅ Browser opens when you click "Sign in with Google"
❌ Getting "Error 401: invalid_client" - OAuth credentials not fully configured

## What You Need to Do

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **neeo-8be19**
3. Go to **APIs & Services** → **Credentials**

### Step 2: Create/Configure OAuth 2.0 Client

If you don't have an OAuth client for your Firebase app:

1. Click **Create Credentials** → **OAuth 2.0 Client ID**
2. Choose **Web application**
3. Name it something like "Sagar Streaming App"

### Step 3: Add Authorized Redirect URIs

In the OAuth client settings, find **Authorized redirect URIs** and add:

```
http://localhost:5173/
http://localhost:5173/__/auth/handler
http://127.0.0.1:5173/
http://127.0.0.1:5173/__/auth/handler
```

### Step 4: Save Client ID and Secret

- Copy your **Client ID** (looks like: `123456789-xxxxx.apps.googleusercontent.com`)
- You'll need the Client Secret too

### Step 5: Configure Firebase to Use OAuth Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select **neeo-8be19**
3. Go to **Authentication** → **Sign-in method** → **Google**
4. Enable it if not already enabled
5. Make sure your OAuth Client ID from Google Cloud Console is set here

### Step 6: Verify Authorized Domains (in Firebase)

Go to **Authentication** → **Settings** → **Authorized domains** and confirm:

```
localhost
127.0.0.1
<your-computer-name>
neeo-8be19.firebaseapp.com
neeo-8be19.web.app
```

## How It Works

When you click "Sign in with Google":

1. ✅ Your default browser opens
2. You see Google's login page
3. After signing in, browser redirects back to `http://localhost:5173/__/auth/handler`
4. Firebase catches the redirect and completes the authentication
5. App automatically detects you're logged in

## Troubleshooting

**Still getting "invalid_client" error?**
- Check that Client ID is set in Firebase Authentication → Google Sign-in
- Verify redirect URIs are exactly as shown above (including the `/__/auth/handler` part)
- Clear browser cache and try again
- Wait a few minutes for Google Cloud to propagate changes

**Browser opens but won't redirect back?**
- Make sure `localhost` is in your authorized domains in Firebase
- Check that you're using the correct redirect URI format

**Getting "Authorized domain not found" error?**
- Add `localhost` and `127.0.0.1` to Firebase authorized domains

## Quick Checklist

- [ ] OAuth 2.0 Client ID created in Google Cloud Console
- [ ] Redirect URIs added to Google Cloud Console OAuth client
- [ ] Firebase Authentication has Google provider enabled
- [ ] Firebase has correct Client ID configured
- [ ] Authorized domains in Firebase include localhost and 127.0.0.1
- [ ] Browser opens and shows Google login page

Once all steps are complete, you should be able to sign in with Google successfully!
