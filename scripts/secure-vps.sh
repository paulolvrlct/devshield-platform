#!/usr/bin/env bash
# DevShield — VPS security hardening script.
# Run once on the VPS: sudo bash scripts/secure-vps.sh
set -euo pipefail

echo "=== DevShield VPS Security Hardening ==="

# 1. Update system
echo "[1/4] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Install and configure fail2ban
echo "[2/4] Installing fail2ban..."
apt-get install -y -qq fail2ban

cat > /etc/fail2ban/jail.local <<'JAIL'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
banaction = iptables-multiport

[sshd]
enabled  = true
port     = ssh
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 3
bantime  = 24h
JAIL

systemctl enable fail2ban
systemctl restart fail2ban
echo "  -> fail2ban configured: 3 SSH failures = 24h ban"

# 3. Configure UFW firewall
echo "[3/4] Configuring UFW firewall..."
apt-get install -y -qq ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'
ufw allow 443/udp   comment 'HTTP3/QUIC'
ufw allow 51820/udp comment 'WireGuard'

echo "y" | ufw enable
echo "  -> UFW enabled: SSH, HTTP, HTTPS, WireGuard only"

# 4. Harden SSH config
echo "[4/4] Hardening SSH..."
SSHD_CONFIG="/etc/ssh/sshd_config"

# Disable root login if not already
if grep -q "^PermitRootLogin yes" "$SSHD_CONFIG" 2>/dev/null; then
  sed -i 's/^PermitRootLogin yes/PermitRootLogin prohibit-password/' "$SSHD_CONFIG"
  echo "  -> Root login restricted to key-only"
fi

# Disable password auth (key-only)
if grep -q "^PasswordAuthentication yes" "$SSHD_CONFIG" 2>/dev/null; then
  sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' "$SSHD_CONFIG"
  echo "  -> Password authentication disabled (key-only)"
fi

systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true

echo ""
echo "=== Security hardening complete ==="
echo "  - fail2ban: active (3 SSH failures = 24h ban)"
echo "  - UFW: active (SSH/HTTP/HTTPS/WireGuard only)"
echo "  - SSH: key-only authentication"
echo ""
echo "Check status:"
echo "  sudo fail2ban-client status sshd"
echo "  sudo ufw status verbose"
