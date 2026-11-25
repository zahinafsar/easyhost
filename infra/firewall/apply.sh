#!/bin/sh
set -eu

NPM_CONTAINER="${1:?Usage: apply.sh <nginx proxy manager container name>}"
NETWORK=easyhost
SUBNET=172.30.0.0/16
IP_RANGE=172.30.0.0/17
NPM_IP=172.30.255.254
FORWARD_CHAIN=EASYHOST-APPS
INPUT_CHAIN=EASYHOST-APPS-INPUT

if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  docker network create --subnet "$SUBNET" --ip-range "$IP_RANGE" "$NETWORK" >/dev/null
fi

CURRENT_SUBNET=$(docker network inspect "$NETWORK" -f '{{range .IPAM.Config}}{{.Subnet}}{{end}}')
if [ "$CURRENT_SUBNET" != "$SUBNET" ]; then
  echo "Network $NETWORK uses subnet '$CURRENT_SUBNET', expected $SUBNET."
  echo "Stop the app containers, then run: docker network rm $NETWORK && docker network create --subnet $SUBNET --ip-range $IP_RANGE $NETWORK"
  echo "Start the apps again afterwards (redeploy or restart from the dashboard)."
  exit 1
fi

CURRENT_NPM_IP=$(docker inspect "$NPM_CONTAINER" -f "{{with index .NetworkSettings.Networks \"$NETWORK\"}}{{.IPAddress}}{{end}}")
if [ "$CURRENT_NPM_IP" != "$NPM_IP" ]; then
  if [ -n "$CURRENT_NPM_IP" ]; then
    docker network disconnect "$NETWORK" "$NPM_CONTAINER"
  fi
  docker network connect --ip "$NPM_IP" "$NETWORK" "$NPM_CONTAINER"
fi

BRIDGE="br-$(docker network inspect "$NETWORK" -f '{{.Id}}' | cut -c1-12)"

modprobe br_netfilter
sysctl -q -w net.bridge.bridge-nf-call-iptables=1

iptables -N "$FORWARD_CHAIN" 2>/dev/null || iptables -F "$FORWARD_CHAIN"
iptables -A "$FORWARD_CHAIN" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -A "$FORWARD_CHAIN" -s "$NPM_IP" -d "$SUBNET" -p tcp --dport 3000 -j RETURN
iptables -A "$FORWARD_CHAIN" -s "$SUBNET" -d "$SUBNET" -j DROP
iptables -A "$FORWARD_CHAIN" -s "$SUBNET" -d 169.254.169.254 -j DROP
iptables -A "$FORWARD_CHAIN" -s "$SUBNET" -p tcp --dport 25 -j DROP
iptables -A "$FORWARD_CHAIN" -j RETURN
iptables -C DOCKER-USER -j "$FORWARD_CHAIN" 2>/dev/null || iptables -I DOCKER-USER 1 -j "$FORWARD_CHAIN"

iptables -N "$INPUT_CHAIN" 2>/dev/null || iptables -F "$INPUT_CHAIN"
iptables -A "$INPUT_CHAIN" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -A "$INPUT_CHAIN" -p tcp -m multiport --dports 80,443,5432 -j RETURN
iptables -A "$INPUT_CHAIN" -j DROP
iptables -C INPUT -i "$BRIDGE" -j "$INPUT_CHAIN" 2>/dev/null || iptables -I INPUT 1 -i "$BRIDGE" -j "$INPUT_CHAIN"

echo "Firewall applied: $NETWORK ($SUBNET via $BRIDGE), proxy $NPM_CONTAINER at $NPM_IP"
