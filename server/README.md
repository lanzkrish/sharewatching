# ShareWatching Real-Time Signaling & Sync Server

This is the standalone real-time backend for **ShareWatching**, designed to run on a **DigitalOcean Droplet**.

It provides:
- **Instant WebRTC Signaling** (SDP Offers, Answers, ICE Candidates relayed with <10ms latency via Socket.IO)
- **Zero-Buffer Video Playback Sync** (Play, Pause, Seek, and Switch Video across all viewers)
- **Live Room Chat** & Peer Presence Tracking
- **STUN / TURN Server Configuration** for traversing NAT and corporate firewalls

---

## 🚀 Quick Local Run

```bash
cd server
npm install
npm run dev
```

The server will listen on `http://localhost:5001`.

---

## 🌊 Deploying to a DigitalOcean Droplet (Step-by-Step)

### Step 1: Create a DigitalOcean Droplet
1. Go to [DigitalOcean](https://cloud.digitalocean.com/) -> **Create** -> **Droplets**.
2. **Image**: Ubuntu 24.04 LTS (x64)
3. **Plan**: Basic -> Regular ($4 or $6/month is plenty for WebRTC signaling).
4. **Datacenter Region**: Choose Bangalore (BLR1) or whichever is closest to you.
5. **Authentication**: SSH Key (recommended) or Password.
6. Click **Create Droplet** and copy your Droplet's Public IP (e.g., `165.22.123.45`).

---

### Step 2: SSH into Your Droplet & Install Node.js
```bash
ssh root@YOUR_DROPLET_IP
```

Inside the droplet:
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git ufw

npm install -g pm2
```

---

### Step 3: Upload or Clone the Server Code
You can clone your Git repository or copy the `server` folder:

```bash
mkdir -p /var/www/sharewatching-server
cd /var/www/sharewatching-server
```

If copying files directly from your computer:
```bash
# On your local machine:
scp -r ./server/* root@YOUR_DROPLET_IP:/var/www/sharewatching-server/
```

Then on the droplet:
```bash
cd /var/www/sharewatching-server
npm install --omit=dev
```

---

### Step 4: Start the Server with PM2 (Auto-Restart on Reboot)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### Step 5: Configure Nginx as a Reverse Proxy with WebSocket Support

Create `/etc/nginx/sites-available/sharewatching`:
```bash
nano /etc/nginx/sites-available/sharewatching
```

Paste the following configuration (replace `your-domain.com` with your domain or Droplet IP):
```nginx
server {
    listen 80;
    server_name your-domain.com; # or your Droplet IP if no domain

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/sharewatching /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

### Step 6: Enable Free SSL (HTTPS & WSS) with Let's Encrypt (If you have a domain)
WebRTC camera and microphone access requires HTTPS:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

### Step 7: (Optional) Install Coturn (Your own FREE TURN server on the same Droplet)
If you want guaranteed 100% video connectivity even on restrictive cellular / corporate networks:
```bash
apt install -y coturn

# Edit configuration:
nano /etc/turnserver.conf
```
Add:
```ini
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=your_super_secret_turn_key
realm=your-domain.com
```
Restart coturn:
```bash
systemctl restart coturn
```
Then add to `/var/www/sharewatching-server/.env`:
```env
TURN_URL=turn:your-domain.com:3478
TURN_USERNAME=sharewatching
TURN_PASSWORD=your_super_secret_turn_key
```
And restart PM2:
```bash
pm2 restart all
```
