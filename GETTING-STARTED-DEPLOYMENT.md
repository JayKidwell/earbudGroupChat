# Getting Started with Deployment

**Your goal**: Access this voice chat app from your phones using your domain name.

This guide will walk you through the process in the right order.

---

## Overview

You're going from:
- ✅ Working app on localhost
- ❌ Not accessible from phones

To:
- ✅ Working app on your domain (https://yourdomain.com)
- ✅ Accessible from anywhere, including mobile phones
- ✅ Secure with HTTPS
- ✅ Reliable with automatic restart

**Time estimate**: 1-2 hours (first time)

---

## What You Have

- ✅ A working voice chat app
- ✅ A domain name
- ✅ A Windows Server with IIS (which we won't use for this project)

## What You Need

- [ ] A Linux VPS (we'll set this up)
- [ ] Your domain pointed to the VPS
- [ ] SSL certificate (we'll get this free)

---

## Your Path Forward

### Phase 1: Get a Linux Server (15-30 minutes)

**Option 1 - Oracle Cloud (Recommended - FREE):**
1. Sign up at https://cloud.oracle.com/
2. Create "Always Free" VM instance
3. Choose Ubuntu 22.04
4. Add your SSH key
5. Note the public IP address

**Option 2 - Other providers ($5-10/month):**
- DigitalOcean: https://digitalocean.com (simple, popular)
- Linode: https://linode.com (good docs)
- Vultr: https://vultr.com (cheap options)

**What to choose:**
- OS: Ubuntu 22.04 LTS
- Size: 1GB RAM minimum (Oracle free tier = 1GB, perfect)
- Location: Closest to you

➡️ **When done, you'll have**: A Linux server IP address

---

### Phase 2: Point Your Domain (5-15 minutes)

1. Log in to your domain registrar (where you bought the domain)
2. Find DNS settings
3. Add A record:
   - Type: `A`
   - Name: `@` (or your subdomain like `voice`)
   - Value: `Your VPS IP address`
   - TTL: `3600` or automatic

4. Wait 5-30 minutes for DNS to propagate

**Test it:**
```bash
nslookup yourdomain.com
```

Should show your server's IP address.

➡️ **When done, you'll have**: Domain pointing to your server

---

### Phase 3: Run the Setup Script (10-15 minutes)

1. **Connect to your server:**
   ```bash
   ssh ubuntu@YOUR_SERVER_IP
   # Or: ssh root@YOUR_SERVER_IP
   ```

2. **Download the setup script:**
   ```bash
   cd ~
   wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy-setup.sh
   chmod +x deploy-setup.sh
   ```

3. **Run it:**
   ```bash
   ./deploy-setup.sh
   ```

   This installs: Node.js, nginx, Certbot, PM2, and configures firewall.

➡️ **When done, you'll have**: Server ready for your app

---

### Phase 4: Deploy Your Code (15-20 minutes)

**Option A - Using Git (Recommended):**

1. **Push your code to GitHub** (if not already done):
   ```bash
   # On your local machine
   cd "c:\Git\Earbud Group Chat"
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Clone on server:**
   ```bash
   # On your VPS
   cd /var/www/earbud-chat
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
   ```

**Option B - Using SCP:**

```bash
# On your local machine
cd "c:\Git\Earbud Group Chat"
scp -r * ubuntu@YOUR_SERVER_IP:/var/www/earbud-chat/
```

**Then install dependencies:**
```bash
# On your VPS
cd /var/www/earbud-chat/server
npm install --production

cd /var/www/earbud-chat/client
npm install
```

➡️ **When done, you'll have**: Code on your server

---

### Phase 5: Configure for Production (10 minutes)

1. **Create server .env:**
   ```bash
   nano /var/www/earbud-chat/server/.env
   ```

   Add:
   ```env
   PORT=3001
   NODE_ENV=production
   CLIENT_URL=https://yourdomain.com
   ```

2. **Create client .env.production:**
   ```bash
   nano /var/www/earbud-chat/client/.env.production
   ```

   Add:
   ```env
   VITE_SOCKET_URL=https://yourdomain.com
   ```

3. **Build the client:**
   ```bash
   cd /var/www/earbud-chat/client
   npm run build
   ```

➡️ **When done, you'll have**: App configured for your domain

---

### Phase 6: Configure nginx (10 minutes)

1. **Create nginx config:**
   ```bash
   sudo nano /etc/nginx/sites-available/earbud-chat
   ```

2. **Paste this** (replace `yourdomain.com`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           root /var/www/earbud-chat/client/dist;
           try_files $uri $uri/ /index.html;
       }

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

3. **Enable it:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/earbud-chat /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

➡️ **When done, you'll have**: nginx serving your app

---

### Phase 7: Get SSL Certificate (5 minutes)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts:
- Enter your email
- Agree to terms
- Redirect HTTP to HTTPS: **Yes**

➡️ **When done, you'll have**: HTTPS enabled

---

### Phase 8: Start the Application (5 minutes)

```bash
cd /var/www/earbud-chat/server
pm2 start index.js --name "earbud-server"
pm2 save
pm2 startup
# Copy and run the command it outputs
```

➡️ **When done, you'll have**: App running!

---

### Phase 9: Test! (10 minutes)

1. **From your computer:**
   - Open `https://yourdomain.com`
   - Join a room
   - Should work!

2. **From your phone:**
   - Open `https://yourdomain.com`
   - Allow microphone access
   - Join same room as computer

3. **From your wife's phone:**
   - Join same room
   - Use headphones!
   - You should hear each other

---

## When Things Don't Work

### Can't access the site
```bash
# Check if nginx is running
sudo systemctl status nginx

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Site loads but can't join room
```bash
# Check if Node.js server is running
pm2 status

# Check server logs
pm2 logs earbud-server
```

### Can join but no audio on mobile
- This means you need a TURN server
- See DEPLOYMENT.md Part 9
- This is common on mobile carrier networks

---

## Quick Reference

**Your Info:**
- Domain: `____________________`
- Server IP: `____________________`
- SSH command: `ssh ubuntu@____________________`

**Useful Commands:**
```bash
# Check app status
pm2 status
pm2 logs earbud-server

# Restart app
pm2 restart earbud-server

# Update app
cd /var/www/earbud-chat
git pull
cd client && npm run build
pm2 restart earbud-server
```

---

## Next Steps After Deployment

Once working:

1. **Optional: Set up TURN server** for better mobile support
   - See DEPLOYMENT.md Part 9
   - Takes ~15 minutes
   - Highly recommended if using on mobile carrier networks

2. **Share with your wife**
   - Send her the URL
   - Test together
   - Use headphones to avoid feedback

3. **Bookmark important pages**
   - Your domain
   - PM2 dashboard
   - Server SSH access

4. **Set up monitoring** (optional)
   - PM2 has built-in monitoring: `pm2 monit`
   - Or use external services like UptimeRobot

---

## Cost Summary

- Domain: $10-15/year (already have ✅)
- Linux VPS: $0-10/month (Oracle free tier or budget VPS)
- SSL: Free (Let's Encrypt)
- **Total: $10-135/year**

---

## Help & Support

- **Detailed instructions**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Track your progress**: Use [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)
- **Technical reference**: See [README.md](./README.md)

---

## Ready to Start?

1. Read through this document once more
2. Print the DEPLOYMENT-CHECKLIST.md to track progress
3. Start with Phase 1 (get a Linux server)
4. Work through each phase in order
5. Don't skip steps!

**You've got this! Each phase is straightforward, and you'll have a working voice chat app accessible from your phones within 1-2 hours.**

Good luck! 🚀
