#!/usr/bin/env bash
# provision-alb-frontend.sh — Story 2.2 (09-platform-infra frontend-vercel-to-cloudrun, Sprint 2).
#
# Stands up the GCP external ALB in front of Cloud Run `miyagi-web`: a static IP, a serverless
# NEG, a self-managed SSL cert (from a Cloudflare Origin CA cert — NOT Google-managed), a Cloud
# Armor policy allowlisting only Cloudflare's published IP ranges, and the backend
# service/url-map/proxy/forwarding-rule stack that wires it all together. No Cloud CDN — Cloudflare
# is the only CDN/edge layer this migration uses.
#
# Idempotent: every resource is create-if-absent by name (`describe || create`), so a re-run is
# safe and only fills gaps. `backend-services add-backend` and the Cloud Armor per-CIDR rules are
# the two exceptions with their own idempotency guards (see inline comments) since neither has a
# natural "describe the sub-resource" command.
#
#   CF_ORIGIN_CERT_FILE=/path/to/origin.pem CF_ORIGIN_KEY_FILE=/path/to/origin.key \
#     bash infra/gcp/provision-alb-frontend.sh
#
# The cert/key come from the Cloudflare dashboard (SSL/TLS → Origin Server → Create Certificate),
# covering miyagisanchez.com + *.miyagisanchez.com + the SSL-for-SaaS fallback origin hostname (all
# as SANs on ONE cert). NEVER commit the private key — pass it by path, gitignored.
#
# `ssl-certificates` is an IMMUTABLE resource — there is no `update`. To rotate: bump CERT_NAME
# (defaults to today's date), re-run, then `target-https-proxies update --ssl-certificates=<new>`,
# then delete the old cert once verified live.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
RUN_SERVICE="${RUN_SERVICE:-miyagi-web}"
P=(--project="$PROJECT_ID")   # per-call, no global `gcloud config set project`

IP_NAME="miyagi-web-lb-ip"
NEG_NAME="miyagi-web-neg"
CERT_NAME="${CERT_NAME:-miyagi-web-origin-cert-$(date +%Y%m%d)}"
ARMOR_POLICY="miyagi-web-armor-policy"
BACKEND_NAME="miyagi-web-backend"
URLMAP_NAME="miyagi-web-url-map"
PROXY_NAME="miyagi-web-https-proxy"
FWD_RULE_NAME="miyagi-web-fwd-rule"

echo "▶ Provisioning ALB for $RUN_SERVICE ($PROJECT_ID, region $REGION)"

# --- 1 · reserve the static global IP (Cloudflare's stable origin target) --------------------
gcloud compute addresses describe "$IP_NAME" --global "${P[@]}" >/dev/null 2>&1 || \
gcloud compute addresses create "$IP_NAME" \
  --global \
  --ip-version=IPV4 \
  "${P[@]}"
STATIC_IP="$(gcloud compute addresses describe "$IP_NAME" --global "${P[@]}" --format='value(address)')"
echo "  = static IP: $STATIC_IP"

# --- 2 · serverless NEG pointing at miyagi-web (regional) --------------------------------------
gcloud compute network-endpoint-groups describe "$NEG_NAME" --region="$REGION" "${P[@]}" >/dev/null 2>&1 || \
gcloud compute network-endpoint-groups create "$NEG_NAME" \
  --region="$REGION" \
  --network-endpoint-type=serverless \
  --cloud-run-service="$RUN_SERVICE" \
  "${P[@]}"
echo "  = serverless NEG: $NEG_NAME → $RUN_SERVICE"

# --- 3 · self-managed SSL cert from the Cloudflare Origin CA cert ------------------------------
CERT_FILE="${CF_ORIGIN_CERT_FILE:?path to the Cloudflare Origin CA cert PEM (apex + wildcard + SaaS-fallback SANs)}"
KEY_FILE="${CF_ORIGIN_KEY_FILE:?path to the matching private key PEM — never commit this}"

gcloud compute ssl-certificates describe "$CERT_NAME" --global "${P[@]}" >/dev/null 2>&1 || \
gcloud compute ssl-certificates create "$CERT_NAME" \
  --global \
  --certificate="$CERT_FILE" \
  --private-key="$KEY_FILE" \
  "${P[@]}"
echo "  = SSL cert: $CERT_NAME"

# --- 4 · Cloud Armor policy: allow Cloudflare's published ranges, default-deny everything else -
gcloud compute security-policies describe "$ARMOR_POLICY" --global "${P[@]}" >/dev/null 2>&1 || {
  gcloud compute security-policies create "$ARMOR_POLICY" \
    --global \
    --description="Allow only Cloudflare edge IPs; deny everything else (miyagi-web ALB)" \
    "${P[@]}"
  # New policies default their rule at priority 2147483647 to `allow` — flip to deny so the
  # policy becomes allowlist-only (everything below is an explicit Cloudflare-CIDR allow).
  gcloud compute security-policies rules update 2147483647 \
    --security-policy="$ARMOR_POLICY" \
    --action=deny-403 \
    "${P[@]}"
}

CF_RANGES="$(printf '%s\n%s\n' \
  "$(curl -fsSL https://www.cloudflare.com/ips-v4)" \
  "$(curl -fsSL https://www.cloudflare.com/ips-v6)" \
  | grep -v '^$' | sort)"   # deterministic order → stable priority assignment across re-runs

PRIORITY=1000
while IFS= read -r CIDR; do
  gcloud compute security-policies rules describe "$PRIORITY" \
    --security-policy="$ARMOR_POLICY" "${P[@]}" >/dev/null 2>&1 || \
  gcloud compute security-policies rules create "$PRIORITY" \
    --security-policy="$ARMOR_POLICY" \
    --action=allow \
    --src-ip-ranges="$CIDR" \
    --description="cloudflare:${CIDR}" \
    "${P[@]}"
  PRIORITY=$((PRIORITY + 1))
done <<< "$CF_RANGES"
echo "  = Cloud Armor policy: $ARMOR_POLICY ($(printf '%s\n' "$CF_RANGES" | grep -c .) Cloudflare CIDRs allowed)"

# --- 5 · backend service (global, serverless-NEG backend, NO Cloud CDN) -----------------------
# Gotcha (found live, 09-platform-infra frontend-vercel-to-cloudrun S2.2): `gcloud ... create
# --protocol=HTTPS` client-side auto-fills portName="https" on the resource, but a Serverless NEG
# backend rejects ANY portName at all ("Port name is not supported for a backend service with
# Serverless network endpoint groups") — `add-backend` then fails. `gcloud ... update
# --port-name=""` is treated as a no-op (gcloud won't apply an empty string), so the only way to
# actually clear the field is a raw REST PATCH with an explicit JSON null.
if ! gcloud compute backend-services describe "$BACKEND_NAME" --global "${P[@]}" >/dev/null 2>&1; then
  gcloud compute backend-services create "$BACKEND_NAME" \
    --global \
    --load-balancing-scheme=EXTERNAL \
    --protocol=HTTPS \
    --no-enable-cdn \
    "${P[@]}"
fi
# A raw-PATCH `{"portName": null}` doesn't clear the field to empty — the API resets it to a
# harmless "http" default that (confirmed live) add-backend DOES accept for a serverless NEG.
# Only "https" (gcloud's own auto-fill from --protocol=HTTPS at create time) is rejected.
if [ "$(gcloud compute backend-services describe "$BACKEND_NAME" --global "${P[@]}" --format='value(portName)')" = "https" ]; then
  curl -s -X PATCH \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    "https://compute.googleapis.com/compute/v1/projects/${PROJECT_ID}/global/backendServices/${BACKEND_NAME}" \
    -d '{"portName": null}' >/dev/null
  # The PATCH is async — a mutating call against the resource errors "not ready" for a beat.
  for _ in $(seq 1 30); do
    [ "$(gcloud compute backend-services describe "$BACKEND_NAME" --global "${P[@]}" --format='value(portName)')" != "https" ] && break
    sleep 2
  done
fi

# add-backend is not idempotent by itself — check membership via the parent describe first.
if ! gcloud compute backend-services describe "$BACKEND_NAME" --global "${P[@]}" \
      --format='value(backends[].group)' | grep -q "/networkEndpointGroups/${NEG_NAME}\$"; then
  gcloud compute backend-services add-backend "$BACKEND_NAME" \
    --global \
    --network-endpoint-group="$NEG_NAME" \
    --network-endpoint-group-region="$REGION" \
    "${P[@]}"
fi

gcloud compute backend-services update "$BACKEND_NAME" \
  --global \
  --security-policy="$ARMOR_POLICY" \
  "${P[@]}" >/dev/null
echo "  = backend service: $BACKEND_NAME (no-enable-cdn, Armor: $ARMOR_POLICY)"

# --- 6 · URL map (global, single default service — Host passthrough is automatic ALB behavior) -
gcloud compute url-maps describe "$URLMAP_NAME" --global "${P[@]}" >/dev/null 2>&1 || \
gcloud compute url-maps create "$URLMAP_NAME" \
  --global \
  --default-service="$BACKEND_NAME" \
  "${P[@]}"
echo "  = URL map: $URLMAP_NAME"

# --- 7 · target HTTPS proxy (global, self-managed cert attached) -------------------------------
gcloud compute target-https-proxies describe "$PROXY_NAME" --global "${P[@]}" >/dev/null 2>&1 || \
gcloud compute target-https-proxies create "$PROXY_NAME" \
  --global \
  --url-map="$URLMAP_NAME" \
  --ssl-certificates="$CERT_NAME" \
  "${P[@]}"
echo "  = target HTTPS proxy: $PROXY_NAME"

# --- 8 · global forwarding rule (port 443, bound to the reserved static IP) --------------------
gcloud compute forwarding-rules describe "$FWD_RULE_NAME" --global "${P[@]}" >/dev/null 2>&1 || \
gcloud compute forwarding-rules create "$FWD_RULE_NAME" \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --address="$IP_NAME" \
  --target-https-proxy="$PROXY_NAME" \
  --ports=443 \
  "${P[@]}"
echo "  = forwarding rule: $FWD_RULE_NAME → $STATIC_IP:443"

echo ""
echo "▶ Done. Static IP for the Cloudflare DNS record (gcp.miyagisanchez.com, proxied): $STATIC_IP"
echo ""
echo "Deliberate scope notes:"
echo "  - miyagi-web's Cloud Run ingress stays --allow-unauthenticated (public *.run.app URL kept"
echo "    reachable for Sprint 1's shadow-soak testing) — Cloud Armor only locks the ALB path."
echo "  - No port-80 listener — Cloudflare terminates 443 and always connects to this origin over"
echo "    HTTPS (Full/strict), so there's no plaintext leg to redirect."
