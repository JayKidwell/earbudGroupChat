# Production Deployment Guide

This guide will walk you through deploying the Earbud Group Chat application to a production Linux server with your domain.

## Prerequisites

- A domain name (you already have this)
- A Linux VPS (Ubuntu 22.04 recommended) - we'll set this up together
- SSH access to your server
- Basic familiarity with terminal commands

---

## Part 1: Server Provisioning

### Option 1: Oracle Cloud (Always Free Tier - Recommended)
Oracle offers always-free VMs suitable for this application.

1. **Sign up** at https://cloud.oracle.com/
2. **Create a VM Instance**:
   - Shape: VM.Standard.E2.1.Micro (always free)
   - Image: Ubuntu 22.04
   - Add your SSH key
   - Note the public IP address

### Option 2: Other VPS Providers
- **DigitalOcean**: $4-6/month - https://digitalocean.com
- **Linode**: $5/month - https://linode.com
- **AWS Lightsail**: $3.50-5/month - https://aws.amazon.com/lightsail/

---

## Part 2: Domain Configuration

1. **Log in to your domain registrar** (GoDaddy, Namecheap, Cloudflare, etc.)

2. **Add DNS A Records**:
   ```
   Type: A
   Name: @ (or your subdomain, like "voice")
   Value: [Your server's public IP]
   TTL: 3600 (or lowest available)
   ```

3. **Wait for DNS propagation** (5-30 minutes)
   - Test with: `nslookup yourdomain.com`

---

## Part 3: Initial Server Setup

### 1. Connect to Your Server
```bash
ssh ubuntu@YOUR_SERVER_IP
# Or: ssh root@YOUR_SERVER_IP (depending on provider)
```

### 2. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

### 4. Install nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 5. Install Certbot (for SSL certificates)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 7. Configure Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Part 4: Deploy Your Application

### 1. Create Application Directory
```bash
sudo mkdir -p /var/www/earbud-chat
sudo chown -R $USER:$USER /var/www/earbud-chat
cd /var/www/earbud-chat
```

### 2. Transfer Your Code to the Server

**Option A: Using Git (Recommended)**
```bash
# On your server
git clone YOUR_GITHUB_REPO_URL .
```

**Option B: Using SCP from your local machine**
```bash
# On your local machine (in the project directory)
scp -r * ubuntu@YOUR_SERVER_IP:/var/www/earbud-chat/
```

### 3. Install Dependencies

**Server:**
```bash
cd /var/www/earbud-chat/server
npm install --production
```

**Client:**
```bash
cd /var/www/earbud-chat/client
npm install
```

### 4. Configure Environment Variables

**Server environment** (`/var/www/earbud-chat/server/.env`):
```bash
nano /var/www/earbud-chat/server/.env
```

Add:
```env
PORT=3001
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
```

**Client environment** (`/var/www/earbud-chat/client/.env.production`):
```bash
nano /var/www/earbud-chat/client/.env.production
```

Add:
```env
VITE_SOCKET_URL=https://yourdomain.com
```

### 5. Build the Client
```bash
cd /var/www/earbud-chat/client
npm run build
```

This creates a `dist` folder with production-ready static files.

---

## Part 5: Configure nginx

### 1. Create nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/earbud-chat
```

### 2. Add This Configuration (replace `yourdomain.com`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve static client files
    location / {
        root /var/www/earbud-chat/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy Socket.io connections to Node.js server
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/earbud-chat /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## Part 6: SSL Certificate (HTTPS)

### 1. Obtain SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 2. Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

Certbot will automatically renew certificates before they expire.

---

## Part 7: Start the Application

### 1. Start the Node.js Server with PM2
```bash
cd /var/www/earbud-chat/server
pm2 start index.js --name "earbud-server"
pm2 save
pm2 startup  # Run the command it outputs to enable auto-start on boot
```

### 2. Verify It's Running
```bash
pm2 status
pm2 logs earbud-server
```

---

## Part 8: Testing

### 1. Test from Your Computer
1. Open browser: `https://yourdomain.com`
2. Enter name and room code
3. Allow microphone access
4. Should see join confirmation

### 2. Test from Your Phone
1. Open Safari (iOS) or Chrome (Android)
2. Go to `https://yourdomain.com`
3. Test with your spouse on their phone (same room code)

**Important**: Both phones should use headphones to avoid audio feedback!

---

## Part 9: Optional - TURN Server Setup

If connections fail on mobile networks (restrictive NAT), you'll need a TURN server for relay.

### 1. Install coturn
```bash
sudo apt install -y coturn
```

### 2. Configure coturn
```bash
sudo nano /etc/turnserver.conf
```

Add:
```conf
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_RANDOM_SECRET_HERE
realm=yourdomain.com
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/yourdomain.com/cert.pem
pkey=/etc/letsencrypt/live/yourdomain.com/privkey.pem
no-stdout-log
```

### 3. Enable and Start coturn
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

### 4. Update Client Environment
Edit `/var/www/earbud-chat/client/.env.production`:
```env
VITE_SOCKET_URL=https://yourdomain.com
VITE_TURN_URL=turn:yourdomain.com:3478
VITE_TURN_USERNAME=user
VITE_TURN_PASSWORD=YOUR_RANDOM_SECRET_HERE
```

### 5. Rebuild and Restart
```bash
cd /var/www/earbud-chat/client
npm run build
pm2 restart earbud-server
```

---

## Useful Commands

### Check Server Status
```bash
pm2 status
pm2 logs earbud-server
pm2 monit  # Real-time monitoring
```

### Restart Application
```bash
pm2 restart earbud-server
```

### View nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Update Application
```bash
cd /var/www/earbud-chat
git pull  # If using git
cd client && npm run build
pm2 restart earbud-server
```

---

## Troubleshooting

### Microphone Not Working on Mobile
- **Cause**: HTTPS is required for getUserMedia on production domains
- **Fix**: Ensure SSL certificate is installed and site uses `https://`

### Can't Hear Other User
- **Cause**: Restrictive NAT/firewall (common on mobile networks)
- **Fix**: Set up TURN server (Part 9 above)

### "Connecting..." Never Resolves
- **Cause**: Socket.io not reaching backend or CORS issues
- **Check**:
  ```bash
  pm2 logs earbud-server  # Check for connection logs
  sudo nginx -t           # Check nginx config
  ```

### SSL Certificate Issues
```bash
sudo certbot certificates  # Check certificate status
sudo certbot renew        # Manually renew if needed
```

---

## Security Notes

1. **Keep server updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use SSH keys** instead of passwords for server access

3. **Enable fail2ban** to prevent brute force attacks:
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   ```

4. **Regular backups** of your server configuration

---

## Cost Summary

- **Domain**: ~$10-15/year
- **VPS**: $0-10/month (Oracle free tier or budget VPS)
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: $10-135/year

---

## Next Steps

Once deployed, you can:
1. Add more features (user lists, room history, speaking indicators)
2. Implement authentication
3. Add analytics/usage tracking
4. Create a mobile app wrapper (PWA or React Native)

---

## Support

If you run into issues during deployment, check:
1. PM2 logs: `pm2 logs earbud-server`
2. nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Browser console for client-side errors
4. Test each component individually (nginx → socket.io → WebRTC)
