# ShareWatching 🎬🍿
### Zero-Delay Co-Watching Platform with Google Meet Voice & Video Conferencing

ShareWatching is a synchronized co-watching platform designed to eliminate video playback delays and buffering. It combines **personal Amazon S3 video portfolios**, **client-side IndexedDB zero-buffer caching**, **5-digit room matching (max 2 viewers)**, and **Google Meet-style real-time audio and video conferencing**.

---

## 🌟 Key Features

1. **Zero-Buffer Local Playback Engine**:
   - Users can pre-upload movies to their private Amazon S3 directory.
   - Either viewer can pre-download the video to their local device with 1 click using browser **IndexedDB blob storage**.
   - When watching, the player plays directly from local memory with **0ms buffering**, completely unaffected by internet speed hiccups!

2. **Google Meet Voice & Video Conferencing**:
   - Located directly below the main cinema screen.
   - WebRTC peer-to-peer camera and microphone feeds.
   - Microphone mute/unmute with speech indicators, camera toggle, screen sharing, and audio visualizers.

3. **5-Digit Room Matching (Max 2 Viewers)**:
   - Host generates a random 5-digit match code (e.g., `58291`).
   - Guest joins with the code.
   - Strict 2-person limit guarantees private bandwidth and synchronization.

4. **Synchronized Video Selection**:
   - After matching, a shared popup displays all videos available in **both** the host's and guest's portfolios.
   - Either participant can pick a video, and the selection syncs live.
   - Clicking **"Watch Now"** launches the synchronized cinema theater and video meet.

5. **Ultra-Low Latency Playback Sync**:
   - Real-time WebRTC DataChannel (sub-10ms) with signaling fallback.
   - When one person pauses, plays, or seeks, both participants react instantly.
   - Continuous timestamp drift detection automatically realigns playback if time diverges by > 0.35s.

6. **Personal Amazon S3 Video Portfolios**:
   - Strict user-folder segregation: `users/{userId}/videos/...`.
   - AWS S3 presigned PUT URLs for secure, direct browser-to-S3 uploads with progress tracking.
   - Built-in local upload fallback so the app functions out-of-the-box even before AWS keys are added.

7. **JWT Authentication**:
   - Landing page accessible publicly.
   - Secure login & registration using JWT cookies and bcrypt password hashing.
   - Pre-seeded 1-click demo accounts (`Alex (Host)` & `Sam (Guest)`) for instant testing across 2 browser tabs.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3.4 (Cinema dark theme, glassmorphism)
- **Database**: MongoDB with Mongoose (with built-in high-performance local store fallback)
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs`
- **Cloud Storage**: Amazon S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Real-Time Video & Audio**: WebRTC (`RTCPeerConnection`, `RTCDataChannel`, STUN servers)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configurable variables:
```env
# MongoDB (Optional - falls back automatically to local store if not running)
MONGODB_URI=mongodb://localhost:27017/sharewatching

# JWT Secret
JWT_SECRET=super_secret_jwt_key_sharewatching_2026_default

# Amazon S3 (Optional - falls back to local server upload if credentials are blank)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing the 2-Person Experience (In 2 Browser Tabs)

1. **Tab 1 (Host - Alex)**:
   - Go to [http://localhost:3000/login](http://localhost:3000/login).
   - Click the **Alex (Host)** 1-click demo button and sign in.
   - On the Dashboard, click **Watch Together** -> **Host a Watch Party**.
   - Note the **5-digit code** (e.g. `40120`).

2. **Tab 2 (Guest - Sam)** (Incognito or second window):
   - Go to [http://localhost:3000/login](http://localhost:3000/login).
   - Click the **Sam (Guest)** 1-click demo button and sign in.
   - Click **Watch Together** -> **Join with 5-Digit Code** -> enter the 5-digit code.

3. **Synchronized Video Selection**:
   - Both tabs will instantly see each other and display the shared video list from both portfolios!
   - Select a video (e.g., *Tears of Steel* or *Big Buck Bunny*) and click **Watch Now**.

4. **Co-Watching Theater & Google Meet Feeds**:
   - The synchronized player opens.
   - Dual camera video tiles are displayed below the movie.
   - Click Play/Pause or Seek on either screen: both screens react in real time without lag!
   - Click **"Download to Device (0s Buffer)"** to cache the movie into local IndexedDB for completely bufferless local playback.

