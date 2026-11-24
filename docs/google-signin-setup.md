# Setting up "Continue with Google"

Flowboard signs in with Google through Auth.js's Google provider. It needs one Google Cloud project with a published consent screen and a Web OAuth client. "Continue with Google" appears only where `AUTH_GOOGLE_ID` is set, so an environment without it simply has no Google button.

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project (or pick the existing Flowboard one).
2. Go to **APIs & Services → OAuth consent screen** (shown as **Google Auth Platform** in newer consoles).

## 2. Consent screen and Branding

- **User type:** External.
- **Branding:**
  - App name: Flowboard
  - User support email: the Flowboard support address
  - App home page: `https://flowboard-app-five.vercel.app`
  - App privacy policy link: `https://flowboard-app-five.vercel.app/privacy`
  - App terms of service link: `https://flowboard-app-five.vercel.app/terms`
  - Authorised domains: `flowboard-app-five.vercel.app`
  - Developer contact email: yours
- **Data access (scopes):** only the defaults, `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. These are non-sensitive, so Google doesn't need to review the app.
- **Audience → Publish app**, so it's "In production". While it's in "Testing", only the test users you list can sign in.

The privacy and terms pages must be live before you publish: Google's reviewers and users follow those links.

## 3. OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**:

- Application type: **Web application**
- Name: Flowboard
- Authorised redirect URIs, exactly these two:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://flowboard-app-five.vercel.app/api/auth/callback/google`

Copy the **Client ID** and **Client secret**.

## 4. Where the two variables go

| Variable             | Value                                           |
| -------------------- | ----------------------------------------------- |
| `AUTH_GOOGLE_ID`     | The client ID (ends in `.apps.googleusercontent.com`) |
| `AUTH_GOOGLE_SECRET` | The client secret                               |

- **Local:** your `.env`. Restart `pnpm dev` after adding them.
- **Vercel:** Project → Settings → Environment Variables, scope **Production** only.
- **Not Preview.** Preview URLs change with every branch, and Google allows neither wildcards nor unregistered redirect URIs, so a Google sign-in there would fail. Leaving the variables out of Preview hides the button instead.

Redeploy Production after adding them: environment variables apply to new deployments only.

## 5. How Flowboard treats Google accounts

- New Google users count as having a confirmed email and skip the 6-digit code.
- A Google email Google hasn't verified is refused.
- A verified Google email that matches an existing account links to it automatically. If that account had never confirmed its email, its password is removed and its other sessions end, because someone else could have registered the address first.
- GitHub keeps its own rule: no automatic linking.

The full rules are in `docs/plan/01-product-and-flows.md` ("Google sign-in") and `src/server/auth/oauthSignIn.service.ts`.

## Troubleshooting

- **`redirect_uri_mismatch`:** the address you're on isn't one of the two redirect URIs. Use `http://localhost:3000` locally (not another port), or Production.
- **"Access blocked: app not verified" or only test users can sign in:** the consent screen is still in Testing. Publish it.
- **No Google button:** `AUTH_GOOGLE_ID` isn't set in this environment, or the server wasn't restarted after setting it.
