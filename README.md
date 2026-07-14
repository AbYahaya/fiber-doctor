# Fiber Doctor

Fiber Doctor is a diagnostic tool for Fiber Network nodes.

It helps developers, operators, and judges answer three practical questions:

1. Is the node reachable?
2. Is the node ready to send or receive payments?
3. If something fails, what is the likely cause and what should I try next?

The project focuses on diagnostics, observability, and actionable suggestions. It is not a wallet, checkout flow, or general Fiber SDK.

## What’s In The Repo

Fiber Doctor has two user-facing entry points:

- a CLI for terminal-based diagnostics
- a Next.js web UI for judge-friendly browser testing

Both surfaces reuse the same diagnostic logic.

The web UI includes a small backend inside Next.js route handlers. In practice that means:

- the browser app and the backend ship together
- Vercel can host the UI and its API routes together
- live mode works only when the Fiber RPC endpoint is publicly reachable from the deployed backend
- fixture mode works without a live node and is the safest demo path

## Core Commands

CLI commands:

- `fiber-doctor check`
- `fiber-doctor channels`
- `fiber-doctor report`
- `fiber-doctor explain`

Web UI panels:

- Check
- Channels
- Report
- Explain

## Repository Layout

```text
fiber-doctor/
├── src/                 # shared CLI diagnostics, RPC client, config, formatting
├── web/                 # Next.js UI and API routes
├── examples/            # saved fixtures and sample payloads
├── evidence/            # saved outputs and screenshots
├── docs/                # testing and demo guides
├── tests/               # CLI and logic tests
├── README.md
└── package.json
```

## Quick Start

Install dependencies for the CLI and shared code:

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm install
```

Install dependencies for the web UI:

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/web
npm install
```

## Development

### CLI

Run the CLI in development mode:

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- --help
```

Build the CLI:

```bash
npm run build
```

Typecheck the CLI:

```bash
npm run check
```

Run the automated tests:

```bash
npm run test
```

### Web UI

Run the Next.js UI locally:

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/web
npm run dev
```

Build the UI:

```bash
npm run build
```

Start the production UI locally:

```bash
npm run start
```

The root package also exposes shortcuts:

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run ui:dev
npm run ui:build
npm run ui:start
```

## Configuration

### Default RPC URL

By default Fiber Doctor assumes:

```text
http://127.0.0.1:8227
```

You can override that with `--rpc` or with a local config file for the CLI.

Example config file:

```json
{
  "rpcUrl": "http://127.0.0.1:8227"
}
```

See [fiber-doctor.config.example.json](/home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/fiber-doctor.config.example.json).

### Web UI Modes

The web UI has two important modes:

- Fixture mode: use saved examples and manual pasted inputs. This does not require a running Fiber node.
- Live mode: call the Next.js API routes, which then call the Fiber RPC endpoint you provide.

Explain is intentionally a manual input tool. It classifies the text or JSON you paste into the box.

## CLI Reference

### `check`

Checks whether the Fiber RPC is reachable and whether the node is returning core identity and connectivity information.

Example:

```bash
npm run dev -- check --rpc http://127.0.0.1:8227
```

### `channels`

Inspects channel readiness, liquidity signals, and recent failed channel attempts.

Example:

```bash
npm run dev -- channels --rpc http://127.0.0.1:8227
```

### `report`

Combines node, channel, and recent payment diagnostics into one operator-friendly report with explicit readiness and blocker summaries.

Example:

```bash
npm run dev -- report --rpc http://127.0.0.1:8227
```

JSON mode:

```bash
npm run dev -- report --rpc http://127.0.0.1:8227 --json
```

### `explain`

Explains a raw error string or a saved JSON response.

Examples:

```bash
npm run dev -- explain "Bech32 error: missing human-readable separator, \"1\""
```

```bash
npm run dev -- explain ./examples/failed-payment.json
```

```bash
npm run dev -- explain ./examples/failed-channel.json
```

```bash
npm run dev -- explain ./examples/list-payments.json --json
```

```bash
npm run dev -- explain ./examples/payment-succeeded.json --json
```

```bash
npm run dev -- explain ./examples/payment-inflight.json --json
```

```bash
npm run dev -- explain ./examples/method-not-found.json --json
```

```bash
npm run dev -- explain ./examples/no-peers.txt --json
```

## Web UI Reference

The UI has four tabs that mirror the CLI:

- Check
- Channels
- Report
- Explain

### Check

Shows node reachability and identity information.

What it renders:

- RPC status
- node pubkey
- network label
- peer count
- channel count
- diagnostic items

### Channels

Shows channel readiness and liquidity signals.

What it renders:

- active, pending, and closed channel counts
- outbound and inbound liquidity readiness
- latest failed or pending channel attempt
- diagnosis and suggested actions

### Report

Combines node, channel, and payment data into one operator summary.

What it renders:

- overall health
- send readiness
- receive readiness
- blockers
- latest failed payment explanation
- a machine-readable payload for inspection

### Explain

Classifies a pasted error string or JSON payload.

What it renders:

- category
- likely meaning
- suggested fixes
- raw parsed input or classified explanation

## Vercel Deployment

The intended hackathon deployment is the Next.js app in `web/`.

Recommended setup:

1. Create a separate Vercel project from [web/](/home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/web).
2. Set the framework to Next.js.
3. Build command: `npm run build`
4. Output is handled by Next.js automatically.
5. Add environment variables if you want to support a custom live RPC endpoint.

Important deployment notes:

- Fixture mode works without a live node and is the safest default for judges.
- Live mode only works if the Fiber RPC endpoint is reachable from Vercel or from whatever network the deployed backend can reach.
- A local node on your laptop is not reachable from Vercel unless you expose it publicly or tunnel it.
- The backend is not a separate service; it is part of the Next.js deployment.

Suggested hackathon flow:

- deploy the web app to Vercel
- use fixture mode for the demo
- switch to live mode only if you have a publicly reachable Fiber RPC URL

## Testing And Evidence

Run the CLI test suite:

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run test
```

Build the web UI:

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/web
npm run build
```

For manual verification, see:

- [docs/testing-guide.md](/home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/docs/testing-guide.md)
- [docs/demo-script.md](/home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/docs/demo-script.md)
- [evidence/README.md](/home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/evidence/README.md)

## Example Output

Example `report` output:

```text
Fiber Doctor Report

RPC URL: http://127.0.0.1:8227

✓ Fiber RPC reachable
✓ Node info fetched successfully
✓ Node identity available
✓ Connected peers detected
⚠ No active channels found
✗ No outbound liquidity detected
⚠ No inbound liquidity detected
⚠ Recent failed channel attempts detected

Diagnosis:
Your node is reachable, but it is not currently payment-ready because no active channels were found and at least one recent channel opening attempt failed.

Suggested actions:
- Open a channel with a reachable peer.
- Fund or rebalance a channel before attempting to send payments.
- Increase inbound liquidity if you want this node to receive payments.
- Inspect the latest failed channel attempt and verify your CKB funding capacity.
```

## Known Limitations

- The explainer covers the verified error patterns currently encoded in the diagnostics.
- Live mode depends on a reachable Fiber RPC endpoint.
- The UI is intentionally opinionated toward demo and judge workflows rather than deep node administration.

## Next Steps

- expand the explainer pattern set
- add more saved live fixtures
- deepen payment-aware reporting as more live payment states are observed
- polish the Vercel demo flow and add more screenshots if needed
