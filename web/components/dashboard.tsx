"use client";

import { useMemo, useState } from "react";

import { fixturePresets, fixtureSamples } from "../lib/fixtures";
import { runChannels, runCheck, runExplain, runReport } from "../lib/api";
import type {
  CheckResult,
  ChannelsResult,
  ExplainResult,
  ReportResult,
  TabKey,
} from "../lib/types";
import ResultsCard from "./results-card";

const tabs: Array<{ key: TabKey; label: string; description: string }> = [
  { key: "check", label: "Check", description: "Reachability and identity" },
  { key: "channels", label: "Channels", description: "Liquidity and readiness" },
  { key: "report", label: "Report", description: "Node, channel, and payment summary" },
  { key: "explain", label: "Explain", description: "Failure and fixture interpreter" },
];

type TabResult = CheckResult | ChannelsResult | ExplainResult | ReportResult | null;
type FixtureTab = TabKey;

function statusLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClass(value: string): string {
  if (value === "pass" || value === "ready" || value === "succeeded") {
    return "pass";
  }

  if (value === "warn" || value === "degraded" || value === "inflight") {
    return "warn";
  }

  return "fail";
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("report");
  const [rpcUrl, setRpcUrl] = useState("http://127.0.0.1:8227");
  const [configPath, setConfigPath] = useState("");
  const [useFixture, setUseFixture] = useState(true);
  const [checkFixture, setCheckFixture] = useState<string>("");
  const [channelsFixture, setChannelsFixture] = useState<string>("");
  const [reportFixture, setReportFixture] = useState<string>("");
  const [explainInput, setExplainInput] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<Record<FixtureTab, string>>({
    check: "",
    channels: "",
    explain: "",
    report: "",
  });
  const [result, setResult] = useState<TabResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isExplainTab = activeTab === "explain";
  const presetsEnabled = isExplainTab || useFixture;
  const liveModeEnabled = !isExplainTab && !useFixture;

  const activeFixture = useMemo(() => {
    switch (activeTab) {
      case "check":
        return checkFixture;
      case "channels":
        return channelsFixture;
      case "report":
        return reportFixture;
      case "explain":
        return explainInput;
    }
  }, [activeTab, channelsFixture, checkFixture, explainInput, reportFixture]);

  async function handleRun() {
    if (isExplainTab && !activeFixture.trim()) {
      setError("Enter an error message or JSON payload before running Explain.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseBody = useFixture
        ? { configPath: configPath.trim() || undefined, fixture: parseFixture(activeFixture, activeTab) }
        : { configPath: configPath.trim() || undefined, rpcUrl: rpcUrl.trim() || undefined };

      switch (activeTab) {
        case "check": {
          const response = await runCheck(baseBody);
          setResult(response);
          break;
        }
        case "channels": {
          const response = await runChannels(baseBody);
          setResult(response);
          break;
        }
        case "report": {
          const response = await runReport(baseBody);
          setResult(response);
          break;
        }
        case "explain": {
          const response = await runExplain({
            input: activeFixture,
          });
          setResult(response);
          break;
        }
      }
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : String(runtimeError));
    } finally {
      setLoading(false);
    }
  }

  function loadSample(tab: TabKey) {
    if (!presetsEnabled) {
      return;
    }

    const preset = fixturePresets[tab].find((entry) => entry.key === selectedPreset[tab]);
    if (!preset) {
      return;
    }

    applyPreset(tab, preset.value);
  }

  function applyPreset(tab: TabKey, value: string) {
    switch (tab) {
      case "check":
        setCheckFixture(value);
        break;
      case "channels":
        setChannelsFixture(value);
        break;
      case "report":
        setReportFixture(value);
        break;
      case "explain":
        setExplainInput(value);
        break;
    }
  }

  function renderResult() {
    if (!result) {
      return <p className="muted">Run a check to see the diagnostics here.</p>;
    }

    if (activeTab === "check") {
      const check = result as CheckResult;
      return (
        <div className="stack">
          <div className="summary-box">
            <h3>{check.node.status}</h3>
            <p>{check.node.network}</p>
            <div className="stat-row">
              <div className="stat">
                <span>Pubkey</span>
                <strong>{check.node.pubkey ?? "unknown"}</strong>
              </div>
              <div className="stat">
                <span>Peers</span>
                <strong>{check.node.connectedPeers}</strong>
              </div>
              <div className="stat">
                <span>Channels</span>
                <strong>{check.node.reportedChannelCount}</strong>
              </div>
            </div>
          </div>
          <DiagnosticList diagnostics={check.diagnostics} />
          <pre>{prettyJson(check)}</pre>
        </div>
      );
    }

    if (activeTab === "channels") {
      const channels = result as ChannelsResult;
      return (
        <div className="stack">
          <div className="summary-box">
            <h3>{channels.diagnosis}</h3>
            <p>{channels.suggestions.length > 0 ? channels.suggestions[0] : "No suggestions generated."}</p>
            <div className="stat-row">
              <div className="stat">
                <span>Active</span>
                <strong>{channels.channels.active}</strong>
              </div>
              <div className="stat">
                <span>Send ready</span>
                <strong>{channels.channels.sendReady}</strong>
              </div>
              <div className="stat">
                <span>Receive ready</span>
                <strong>{channels.channels.receiveReady}</strong>
              </div>
            </div>
          </div>
          <DiagnosticList diagnostics={channels.diagnostics} />
          <pre>{prettyJson(channels)}</pre>
        </div>
      );
    }

    if (activeTab === "report") {
      const report = result as ReportResult;
      return (
        <div className="stack">
          <div className="summary-box">
            <h3>{statusLabel(report.readiness.overallHealth)} health</h3>
            <p>{report.diagnosis}</p>
            <div className="stat-row">
              <div className="stat">
                <span>Send</span>
                <strong>{report.readiness.send}</strong>
              </div>
              <div className="stat">
                <span>Receive</span>
                <strong>{report.readiness.receive}</strong>
              </div>
              <div className="stat">
                <span>Payments</span>
                <strong>{report.payments.total}</strong>
              </div>
            </div>
          </div>
          <DiagnosticList diagnostics={report.diagnostics} />
          {report.blockers.length > 0 ? (
            <div className="summary-box">
              <h3>Blockers</h3>
              <ul>
                {report.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <pre>{prettyJson(report)}</pre>
        </div>
      );
    }

    const explain = result as ExplainResult;
    return (
      <div className="stack">
        <div className="summary-box">
          <h3>{explain.category}</h3>
          <p>{explain.diagnosis}</p>
        </div>
        {explain.suggestions.length > 0 ? (
          <div className="summary-box">
            <h3>Suggested fixes</h3>
            <ul>
              {explain.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <pre>{prettyJson(explain)}</pre>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="container">
        <section className="hero">
          <div className="eyebrow">Fiber Doctor UI</div>
          <h1 className="title">Fiber diagnostics in the browser.</h1>
          <p className="subtitle">
            The same readiness checks, channel signals, report synthesis, and error explanations as the CLI, now in a browser interface that supports live RPC and offline fixtures.
          </p>
        </section>

        <section className="controls">
          <div className="control">
            <label htmlFor="rpc-url">RPC URL</label>
            <input
              id="rpc-url"
              onChange={(event) => setRpcUrl(event.target.value)}
              placeholder="http://127.0.0.1:8227"
              value={rpcUrl}
            />
          </div>
          <div className="control">
            <label htmlFor="config-path">Config path</label>
            <input
              id="config-path"
              onChange={(event) => setConfigPath(event.target.value)}
              placeholder="fiber-doctor.config.json"
              value={configPath}
            />
          </div>
          <div className="control">
            <label htmlFor="mode">Mode</label>
            <input
              id="mode"
              onChange={(event) => setUseFixture(event.target.checked)}
              checked={useFixture}
              type="checkbox"
            />
          </div>
        </section>

        <section className="toolbar">
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                className="tab"
                data-active={tab.key === activeTab}
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setError(null);
                  setResult(null);
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="actions">
            <label className={`control ${presetsEnabled ? "" : "control-disabled"}`} style={{ minWidth: "16rem" }}>
              <span className="section-label">{isExplainTab ? "Example" : "Preset"}</span>
              <select
                className="control-select"
                disabled={!presetsEnabled}
                onChange={(event) => {
                  const presetKey = event.target.value;
                  setSelectedPreset((current) => ({ ...current, [activeTab]: presetKey }));
                  const preset = fixturePresets[activeTab].find((entry) => entry.key === presetKey);
                  if (preset) {
                    applyPreset(activeTab, preset.value);
                  }
                }}
                value={selectedPreset[activeTab]}
              >
                <option value="">{presetsEnabled ? "Choose a saved sample" : "Fixture mode only"}</option>
                {fixturePresets[activeTab].map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button secondary" disabled={!presetsEnabled} onClick={() => loadSample(activeTab)} type="button">
              {isExplainTab ? "Load example" : "Reload preset"}
            </button>
            <button className="button" onClick={handleRun} type="button">
              {loading ? "Running..." : isExplainTab ? "Explain input" : `Run ${activeTab}`}
            </button>
          </div>
        </section>

        <section className="main-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
                <p>{tabs.find((tab) => tab.key === activeTab)?.description}</p>
              </div>
              <span className={`pill ${isExplainTab ? "pass" : useFixture ? "warn" : "pass"}`}>
                {isExplainTab ? "Manual input" : liveModeEnabled ? "Live mode" : "Fixture mode"}
              </span>
            </div>

            <div className="mode-banner">
              <strong>
                {isExplainTab
                  ? "Manual error classification"
                  : useFixture
                    ? "Offline fixture testing"
                    : "Live RPC testing"}
              </strong>
              <p>
                {isExplainTab
                  ? "Paste an error string or saved JSON response here, then classify it directly."
                  : useFixture
                    ? "Pick a saved sample to populate the panel, then run the command without needing a node."
                    : "Presets are disabled in live mode. This tab will call the backend route and then the Fiber RPC endpoint you provide."}
              </p>
            </div>

            <div className="control">
              <label htmlFor="fixture-input">{isExplainTab ? "Error input" : "Fixture input"}</label>
              <textarea
                id="fixture-input"
                placeholder={
                  isExplainTab
                    ? "Paste a live error message or saved JSON response here"
                    : useFixture
                      ? "Choose a preset or paste fixture JSON"
                      : "Enable fixture mode to edit this sample input"
                }
                readOnly={!isExplainTab && !useFixture}
                aria-disabled={!isExplainTab && !useFixture}
                onChange={(event) => {
                  const value = event.target.value;
                  if (activeTab === "check") {
                    setCheckFixture(value);
                  } else if (activeTab === "channels") {
                    setChannelsFixture(value);
                  } else if (activeTab === "report") {
                    setReportFixture(value);
                  } else {
                    setExplainInput(value);
                  }
                }}
                rows={18}
                value={activeFixture}
              />
              <p className="muted">
                {isExplainTab
                  ? "This tab only classifies the text or JSON you paste here."
                  : fixturePresets[activeTab].find((preset) => preset.key === selectedPreset[activeTab])?.description ??
                    (useFixture ? "No sample selected yet." : "Live mode ignores this field.")}
              </p>
            </div>

            {error ? (
              <div className="summary-box" style={{ marginTop: "1rem" }}>
                <h3>Request error</h3>
                <p>{error}</p>
              </div>
            ) : null}
          </div>

          <div className="results-grid">
            <ResultsCard title="Results" subtitle="Readable output and the underlying response payload.">
              {renderResult()}
            </ResultsCard>
          </div>
        </section>
      </main>
    </div>
  );
}

function DiagnosticList({ diagnostics }: { diagnostics: Array<{ details?: string; status: string; title: string }> }) {
  return (
    <ul className="diagnostic-list">
      {diagnostics.map((diagnostic) => (
        <li className="diagnostic" key={diagnostic.title}>
          <strong>
            <span className={`pill ${statusClass(diagnostic.status)}`}>{diagnostic.status}</span>
            {diagnostic.title}
          </strong>
          {diagnostic.details ? <p>{diagnostic.details}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function parseFixture(value: string, activeTab: TabKey): Record<string, unknown> | undefined {
  if (activeTab === "explain") {
    return undefined;
  }

  if (!value.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    throw new Error("Fixture input must be valid JSON for Check, Channels, and Report.");
  }
}
