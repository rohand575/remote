# Live Reactions for Presentations

Real-time audience reactions for your talks and presentations. Like Instagram Live, but for conferences.

## How It Works

1. **Audience** opens https://remote.rohan-dhanawade.de on their phones
2. **Presenter** runs the overlay app on their laptop
3. Both enter the same **room code**
4. Audience taps emojis → they float up on the presenter's screen!

## Setup

### 1. Firebase Setup (One-time, 5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (name: "live-reactions" or similar)
3. Go to **Realtime Database** → **Create Database** → **Start in test mode**
4. Go to **Project Settings** → **Your apps** → **Add web app**
5. Copy the config and paste it into `firebase-config.js`

### 2. Install Presenter Overlay

```bash
cd presenter-overlay
npm install
```

## Usage

### Before Your Presentation

```bash
cd presenter-overlay
npm start
```

1. The overlay window appears (transparent, click-through)
2. Enter your room code (e.g., "myTalk2024")
3. Tell your audience to go to **remote.rohan-dhanawade.de**
4. They enter the same room code
5. Start presenting!

### Available Reactions

- 👏 Applause
- 🔥 Excited
- 🤯 Mind-blown
- ❓ Confused
- ❤️ Love
- 😂 Funny

## Project Structure

```
remote/
├── audience-app/          # GitHub Pages frontend
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js
│       ├── firebase-client.js
│       └── animations.js
│
├── presenter-overlay/     # Electron desktop app
│   ├── package.json
│   └── src/
│       ├── main/          # Electron main process
│       ├── renderer/      # Overlay UI
│       └── preload/       # Context bridge
│
└── firebase-config.js     # Your Firebase config (fill this in!)
```

## Deployment

### Audience App (GitHub Pages)

The `audience-app/` folder is deployed to GitHub Pages at `remote.rohan-dhanawade.de`.

To deploy changes:
1. Push to the `main` branch
2. GitHub Pages will automatically update

### Presenter Overlay

Run locally with `npm start` or build a standalone executable:

```bash
cd presenter-overlay
npm run build
```

This creates a Windows `.exe` in the `dist/` folder.

## Tech Stack

- **Frontend**: Vanilla JS + CSS (no build step)
- **Desktop**: Electron
- **Real-time**: Firebase Realtime Database
- **Hosting**: GitHub Pages (free)
