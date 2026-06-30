#!/bin/bash
# ERP'den token alır ve bildirim panelini otomatik açar.
# Kullanım: bash scripts/get-token.sh

set -euo pipefail

ERP="https://api.bkns-software.com/api/v1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HTML="$SCRIPT_DIR/notification-panel.html"

echo "Giriş yapılıyor..."

response=$(curl -s -X POST "$ERP/iam/login" \
  -H "Content-Type: application/json" \
  -d '{"userNameOrEmail":"superadmin","password":"SuperAdmin123!"}')

token=$(echo "$response" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  print(d.get('data',{}).get('accessToken',''))
except: print('')
" 2>/dev/null)

refresh=$(echo "$response" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  print(d.get('data',{}).get('refreshToken',''))
except: print('')
" 2>/dev/null)

username=$(echo "$response" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  u = d.get('data',{}).get('user',{})
  print(u.get('userName') or u.get('firstName') or 'superadmin')
except: print('superadmin')
" 2>/dev/null)

if [ -z "$token" ]; then
  echo ""
  echo "HATA: Token alinamadi. Sunucu yaniti:"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  exit 1
fi

# Token'lari base64'e cevir (standart base64; panel hash'i elle parse edip + / = korur)
AT_B64=$(printf '%s' "$token"   | base64 | tr -d '\n')
RT_B64=$(printf '%s' "$refresh" | base64 | tr -d '\n')
U_B64=$(printf '%s'  "$username" | base64 | tr -d '\n')

URL="file://${HTML}#at=${AT_B64}&rt=${RT_B64}&u=${U_B64}"

echo "Oturum acildi: $username"
echo "Panel aciliyor..."

# DIKKAT: macOS'ta `open "file://...#fragment"` URL'nin # sonrasini (fragment)
# tarayiciya iletmeden siler. Panel token'lari fragment'ten okudugu icin bu durumda
# hep bos hash'le acilip login ekraninda kalir. AppleScript'in `open location`
# komutu ise fragment'i korur. Bu yuzden varsayilan tarayiciyi bulup ona yolluyoruz.
LS_PLIST="$HOME/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist"
BROWSER_ID=$(plutil -convert json -o - "$LS_PLIST" 2>/dev/null | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  for h in d.get('LSHandlers', []):
    if h.get('LSHandlerURLScheme') == 'https':
      print(h.get('LSHandlerRoleAll') or h.get('LSHandlerRoleViewer') or '')
      break
except: pass
" 2>/dev/null)
BROWSER_ID="${BROWSER_ID:-com.apple.safari}"

if ! osascript -e "tell application id \"$BROWSER_ID\" to open location \"$URL\"" 2>/dev/null; then
  # Son care: en azindan sayfayi acalim (oturum tasinmaz, kullanici komutu tekrar gorur)
  echo "UYARI: Tarayici AppleScript ile acilamadi, sayfa oturumsuz aciliyor."
  open "$HTML"
fi
