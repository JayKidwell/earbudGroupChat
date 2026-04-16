#!/bin/bash

# Earbud Group Chat - Server Setup Script
# This script automates the initial server setup on Ubuntu 22.04
# Run this on your VPS after connecting via SSH

set -e  # Exit on error

echo "=================================="
echo "Earbud Group Chat - Server Setup"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo "Please don't run as root. Run as ubuntu or your regular user."
   exit 1
fi

echo "This script will install and configure:"
echo "  - Node.js 20.x"
echo "  - nginx"
echo "  - Certbot (for SSL certificates)"
echo "  - PM2 (process manager)"
echo "  - Firewall rules"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "Step 1: Updating system packages..."
sudo apt update
sudo apt upgrade -y

echo ""
echo "Step 2: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

echo ""
echo "Step 3: Installing nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo "nginx already installed"
fi

echo ""
echo "Step 4: Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "Certbot already installed"
fi

echo ""
echo "Step 5: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "PM2 already installed: $(pm2 --version)"
fi

echo ""
echo "Step 6: Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo ""
echo "Step 7: Creating application directory..."
sudo mkdir -p /var/www/earbud-chat
sudo chown -R $USER:$USER /var/www/earbud-chat

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Clone or upload your code to /var/www/earbud-chat"
echo "2. Install dependencies (npm install in server/ and client/)"
echo "3. Configure .env files"
echo "4. Build the client (npm run build in client/)"
echo "5. Configure nginx (see DEPLOYMENT.md)"
echo "6. Get SSL certificate with certbot"
echo "7. Start the app with PM2"
echo ""
echo "See DEPLOYMENT.md for detailed instructions."
echo ""
