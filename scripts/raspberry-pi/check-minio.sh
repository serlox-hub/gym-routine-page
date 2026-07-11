#!/bin/bash
# /usr/local/bin/check-minio.sh
# Monitoriza /mnt/videos (mount + I/O real) + container minio + /health/live.
# Auto-reparación:
#   - Nivel 1: si el disco está presente pero el mount quedó fantasma / con I/O
#     error -> stop minio, umount, fsck -y, mount -a, start minio.
#   - Nivel 2: si el disco desapareció del bus USB -> reset del puerto USB
#     (unbind/bind del hub por sysfs) y, si reaparece, Nivel 1.
# Siempre notifica por ntfy. Rate-limit para no entrar en bucle de reinicios.
# NO puede recuperar un cable/adaptador físicamente muerto (avisa para intervención).

set -u

STATE_DIR=/var/lib/minio-monitor
STATE_FILE=$STATE_DIR/state
USB_CACHE=$STATE_DIR/usb_path
REPAIR_LOG=$STATE_DIR/repairs
LOG_FILE=/var/log/minio-monitor.log
CONFIG_FILE=/etc/default/minio-monitor
MOUNT_POINT=/mnt/videos
CONTAINER=minio
HEALTH_URL=http://127.0.0.1:9000/minio/health/live
AUTO_REPAIR=1
MAX_REPAIRS_PER_HOUR=3

mkdir -p "$STATE_DIR"
[ -f "$CONFIG_FILE" ] && . "$CONFIG_FILE"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

notify() {
  local title="$1" body="$2"
  log "NOTIFY: $title — $body"
  if [ -n "${NTFY_TOPIC:-}" ]; then
    curl -sf -m 10 -H "Title: $title" -H "Priority: high" -H "Tags: warning" \
      -d "$body" "https://ntfy.sh/${NTFY_TOPIC}" >/dev/null 2>&1 || log "ntfy POST failed"
  fi
}

# UUID del disco de videos (desde fstab)
VIDEOS_UUID=$(grep -i "$MOUNT_POINT" /etc/fstab 2>/dev/null | grep -oE 'UUID=[^ ]+' | cut -d= -f2)

run_checks() {
  local f="" canary st http
  if ! mountpoint -q "$MOUNT_POINT"; then
    mount -a 2>>"$LOG_FILE" || true
    sleep 1
  fi
  if ! mountpoint -q "$MOUNT_POINT"; then
    f="${f}mount_missing "
  else
    canary="$MOUNT_POINT/.minio-monitor-canary"
    if ! ( echo ok > "$canary" && sync && cat "$canary" >/dev/null && rm -f "$canary" ) 2>>"$LOG_FILE"; then
      f="${f}io_error "
    fi
  fi
  st=$(docker inspect "$CONTAINER" --format '{{.State.Status}}' 2>/dev/null || echo absent)
  [ "$st" != "running" ] && f="${f}container=$st "
  http=$(curl -sf -o /dev/null -m 5 -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || echo 0)
  [ "$http" != "200" ] && f="${f}health_http=$http "
  echo "$f"
}

# Cachea la ruta USB del disco cuando está sano (para poder resetearlo si desaparece)
cache_usb_path() {
  local dev base link usbid
  dev=$(blkid -U "$VIDEOS_UUID" 2>/dev/null) || return 0
  [ -z "$dev" ] && return 0
  base=$(basename "$dev" | sed 's/p\?[0-9]*$//')
  link=$(readlink -f "/sys/block/$base" 2>/dev/null)
  usbid=$(echo "$link" | grep -oE '[0-9]+-[0-9]+(\.[0-9]+)+' | tail -1)
  [ -n "$usbid" ] && echo "$usbid" > "$USB_CACHE"
  return 0
}

repairs_last_hour() {
  local now cutoff n=0 ts
  now=$(date +%s); cutoff=$((now - 3600))
  [ -f "$REPAIR_LOG" ] || { echo 0; return; }
  while read -r ts; do
    [ -n "$ts" ] && [ "$ts" -ge "$cutoff" ] 2>/dev/null && n=$((n + 1))
  done < "$REPAIR_LOG"
  echo "$n"
}

record_repair() {
  local now cutoff tmp
  now=$(date +%s); cutoff=$((now - 3600)); tmp="$REPAIR_LOG.tmp"
  echo "$now" >> "$REPAIR_LOG"
  awk -v c="$cutoff" '$1 >= c' "$REPAIR_LOG" > "$tmp" 2>/dev/null && mv "$tmp" "$REPAIR_LOG"
}

usb_reset() {
  local usbid hub
  usbid=$(cat "$USB_CACHE" 2>/dev/null)
  [ -z "$usbid" ] && { log "usb_reset: sin ruta USB cacheada, no se puede resetear"; return 1; }
  hub=$(echo "$usbid" | sed 's/\.[0-9]*$//')
  log "usb_reset: unbind/bind del hub $hub (device $usbid)"
  echo "$hub" > /sys/bus/usb/drivers/usb/unbind 2>>"$LOG_FILE" || true
  sleep 3
  echo "$hub" > /sys/bus/usb/drivers/usb/bind 2>>"$LOG_FILE" || true
  sleep 6
  return 0
}

repair() {
  local dev
  dev=$(blkid -U "$VIDEOS_UUID" 2>/dev/null)
  if [ -z "$dev" ]; then
    log "repair: disco AUSENTE del bus -> Nivel 2 (reset USB)"
    usb_reset
    dev=$(blkid -U "$VIDEOS_UUID" 2>/dev/null)
    if [ -z "$dev" ]; then
      log "repair: el disco NO reapareció tras el reset USB"
      return 1
    fi
    log "repair: disco reapareció como $dev tras el reset USB"
  fi
  log "repair: Nivel 1 sobre $dev (stop minio, umount, fsck, mount, start minio)"
  docker stop "$CONTAINER" >>"$LOG_FILE" 2>&1 || true
  umount "$MOUNT_POINT" 2>>"$LOG_FILE" || umount -l "$MOUNT_POINT" 2>>"$LOG_FILE" || true
  if ! mountpoint -q "$MOUNT_POINT"; then
    fsck -y "$dev" >>"$LOG_FILE" 2>&1 || true
  fi
  mount -a 2>>"$LOG_FILE" || true
  docker start "$CONTAINER" >>"$LOG_FILE" 2>&1 || true
  sleep 4
  return 0
}

# ---------------- principal ----------------
fail=$(run_checks)
notified=""

if [ -n "$fail" ] && [ "${AUTO_REPAIR:-1}" = "1" ]; then
  n=$(repairs_last_hour)
  if [ "$n" -ge "$MAX_REPAIRS_PER_HOUR" ]; then
    log "auto-repair: rate-limit ($n/$MAX_REPAIRS_PER_HOUR en 1h), NO se repara"
    notify "MinIO DOWN (auto-repair pausado)" "Fallos: $fail. Rate-limit alcanzado; requiere intervención manual."
    notified="yes"
  else
    record_repair
    log "auto-repair: iniciando (fallo: $fail; intento $((n + 1))/$MAX_REPAIRS_PER_HOUR)"
    repair
    fail_after=$(run_checks)
    if [ -z "$fail_after" ]; then
      notify "MinIO AUTO-REPARADO" "Incidencia '$fail' resuelta automáticamente."
      notified="yes"
      fail=""
    else
      notify "MinIO DOWN (auto-repair falló)" "Sigue fallando: $fail_after. Posible cable/adaptador USB muerto -> intervención física."
      notified="yes"
      fail="$fail_after"
    fi
  fi
fi

# Cachea ruta USB si el disco está sano (para futuros Nivel 2)
[ -z "$fail" ] && cache_usb_path

new_state="OK"; [ -n "$fail" ] && new_state="FAIL"
prev_state=""; [ -f "$STATE_FILE" ] && prev_state=$(cat "$STATE_FILE")

if [ "$new_state" != "$prev_state" ]; then
  if [ -z "$notified" ]; then
    if [ "$new_state" = "FAIL" ]; then
      notify "MinIO storage DOWN" "Fallos: $fail"
    elif [ -n "$prev_state" ]; then
      notify "MinIO storage RECOVERED" "Todos los checks vuelven a estar OK"
    fi
  fi
  echo "$new_state" > "$STATE_FILE"
  log "STATE: ${prev_state:-INIT} -> $new_state${fail:+ ($fail)}"
fi
