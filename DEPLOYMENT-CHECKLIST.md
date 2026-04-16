# Quick Deployment Checklist

Use this checklist to track your deployment progress. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Pre-Deployment
- [ ] Domain name purchased and accessible
- [ ] VPS/server provisioned (Oracle Cloud, DigitalOcean, etc.)
- [ ] SSH access to server confirmed
- [ ] Server public IP address noted: `__________________`

## Server Setup
- [ ] Connected to server via SSH
- [ ] System updated (`apt update && apt upgrade`)
- [ ] Node.js 20.x installed
- [ ] nginx installed and running
- [ ] Certbot installed
- [ ] PM2 installed globally
- [ ] Firewall configured (SSH + nginx allowed)

## DNS Configuration
- [ ] A record created pointing to server IP
- [ ] DNS propagation verified (`nslookup yourdomain.com`)

## Application Deployment
- [ ] Code transferred to server (`/var/www/earbud-chat`)
- [ ] Server dependencies installed (`server/npm install`)
- [ ] Client dependencies installed (`client/npm install`)
- [ ] Server `.env` configured with production values
- [ ] Client `.env.production` configured with domain
- [ ] Client built (`npm run build` in client directory)

## nginx Configuration
- [ ] nginx config file created (`/etc/nginx/sites-available/earbud-chat`)
- [ ] Domain name updated in nginx config
- [ ] Config symlinked to sites-enabled
- [ ] nginx config tested (`nginx -t`)
- [ ] nginx reloaded

## SSL Certificate
- [ ] Certbot run for domain
- [ ] HTTPS working on domain
- [ ] Auto-renewal tested (`certbot renew --dry-run`)

## Application Start
- [ ] PM2 started with application (`pm2 start index.js`)
- [ ] PM2 saved (`pm2 save`)
- [ ] PM2 startup configured (`pm2 startup`)
- [ ] Application accessible at `https://yourdomain.com`

## Testing
- [ ] Desktop browser test (Chrome/Firefox)
  - [ ] Join room successful
  - [ ] Microphone access granted
  - [ ] No console errors
- [ ] Mobile test (your phone)
  - [ ] HTTPS site loads
  - [ ] Microphone permission requested
  - [ ] Can join room
- [ ] Two-person test
  - [ ] Both users can join same room
  - [ ] Audio works bidirectionally
  - [ ] Names display correctly
  - [ ] No echo/feedback (with headphones)

## Optional: TURN Server
- [ ] coturn installed
- [ ] turnserver.conf configured
- [ ] coturn service started
- [ ] Client environment updated with TURN credentials
- [ ] Client rebuilt with TURN config
- [ ] Tested on restrictive network (mobile carrier)

## Post-Deployment
- [ ] Bookmarked useful commands (pm2 status, logs, etc.)
- [ ] Documented domain and server details
- [ ] Shared URL with spouse
- [ ] Scheduled regular server updates

---

## Quick Reference

**Your Configuration:**
- Domain: `____________________`
- Server IP: `____________________`
- VPS Provider: `____________________`

**Essential Commands:**
```bash
# Check application status
pm2 status
pm2 logs earbud-server

# Restart application
pm2 restart earbud-server

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# Test nginx config
sudo nginx -t
sudo systemctl reload nginx
```

**Your Application URLs:**
- Production: `https://____________________`
- Server logs: `pm2 logs earbud-server`
