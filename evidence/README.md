# Evidence Index

## Phase 2

- `phase-2-check.md`: saved command outputs for live and failure-path `fiber-doctor check` testing
- `phase-2-channels.md`: saved command output for live `fiber-doctor channels` testing
- `phase-2-report.md`: saved command outputs for live `fiber-doctor report` testing in text and JSON modes
- `phase-2-explain.md`: saved command outputs for `fiber-doctor explain` using real and fixture-backed error patterns
- `phase-2-desktop.png`: desktop screenshot captured during Phase 2 work

## Reusable Example Inputs

- `examples/failed-payment.json`
- `examples/failed-channel.json`
- `examples/invalid-invoice.txt`
- `examples/invoice-not-found.json`
- `examples/no-route.txt`
- `examples/insufficient-capacity.txt`
- `examples/node-info.json`
- `examples/list-peers.json`
- `examples/empty-channels.json`
- `examples/list-payments.json`
- `examples/payment-succeeded.json`
- `examples/payment-inflight.json`
- `examples/list-payments-succeeded.json`
- `examples/list-payments-inflight.json`
- `examples/method-not-found.json`
- `examples/no-peers.txt`
- `examples/no-active-channels.txt`
- `examples/no-outbound-liquidity.txt`
- `examples/no-inbound-liquidity.txt`
- `examples/graph-nodes-sample.json`
- `examples/graph-channels-sample.json`
- `examples/list-payments-failed.json`

## Notes

- The markdown evidence files are the most faithful record of command behavior.
- Desktop screenshots can be captured from this environment, but they reflect the active desktop view rather than a controlled scripted terminal frame.
- For submission-quality screenshots of exact command output, the fastest path is usually:
  1. open the relevant evidence file or rerun the command in your terminal
  2. take a manual screenshot from VS Code or the terminal window
- The passing test run is also a useful evidence artifact for weekly reporting because it shows the diagnostic rules are now covered by automated checks.
- The current passing test run now includes CLI smoke coverage in addition to pure diagnostic logic coverage.

## Screenshot-Ready Commands

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- check --rpc http://127.0.0.1:8227
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- check --rpc http://127.0.0.1:9999
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- channels --rpc http://127.0.0.1:8227
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- report --rpc http://127.0.0.1:8227
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- report --rpc http://127.0.0.1:8227 --json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/list-payments.json --json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/payment-succeeded.json --json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/payment-inflight.json --json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/method-not-found.json --json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/no-peers.txt --json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain "Bech32 error: missing human-readable separator, \"1\""
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/failed-payment.json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/failed-payment.json --json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run dev -- explain ./examples/failed-channel.json
```

```bash
cd /home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor
npm run test
```

```bash
cd /home/abyahaya/CKBBuilder/.tmp/fiber-node-testnet
env FIBER_SECRET_KEY_PASSWORD=testpass RUST_LOG=info ./fnn -c config.yml -d .
```
