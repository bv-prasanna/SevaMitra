"use client";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ApiClient } from "@sevamitra/api-client";

const api = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || "",
  () => typeof window !== "undefined" ? localStorage.getItem("sevamitra_token") || undefined : undefined,
);
type Incident = {
  id: string; category: string; title: string; description?: string;
  severity: string; status: string; level: number; reporterId: string;
  assignedToId?: string | null; createdAt: string;
  acknowledgeDueAt?: string | null; resolveDueAt?: string | null;
  nextEscalationAt?: string | null;
  activities?: { id: string; action: string; note?: string | null; createdAt: string; actorId?: string | null }[];
};
type Policy = {
  id: string; name: string; severity: string; category?: string | null;
  acknowledgeMinutes: number; level1Minutes: number; level2Minutes: number; level3Minutes: number;
  businessHoursOnly: boolean; businessStartMinute: number; businessEndMinute: number;
  workingDays: number[]; timezone: string; enabled: boolean;
  approvedAt?: string | null; approvedById?: string | null; createdAt: string;
};
type Holiday = { id: string; date: string; label: string };
type WorkspaceAccess = { admin: boolean; adminPermissions?: string[] };
const statusOptions = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const severityOptions = ["P0", "P1", "P2", "P3"];
const categories = ["SERVICE_ISSUE", "SAFETY", "ACCOUNT", "PROVIDER_ONBOARDING", "OTHER"];
const weekdays = [
  { value: 0, label: "Sun" }, { value: 1, label: "Mon" }, { value: 2, label: "Tue" },
  { value: 3, label: "Wed" }, { value: 4, label: "Thu" }, { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];
const minuteLabel = (value: number) => value === 1440 ? "24:00" : `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not configured";

export default function IncidentAdminPage() {
  const [allowed, setAllowed] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [message, setMessage] = useState("Loading incident workspace…");
  const [busy, setBusy] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    name: "", severity: "P2", category: "", acknowledgeMinutes: "",
    level1Minutes: "", level2Minutes: "", level3Minutes: "",
    businessHoursOnly: true, businessStart: "", businessEnd: "",
    workingDays: [] as number[], timezone: "Asia/Kolkata",
  });
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayLabel, setHolidayLabel] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const workspace = await api.get<WorkspaceAccess>("/auth/workspaces");
      const permitted = workspace.admin && (
        workspace.adminPermissions?.includes("*") ||
        workspace.adminPermissions?.includes("incident.manage")
      );
      setAllowed(Boolean(permitted));
      if (!permitted) {
        setIncidents([]); setPolicies([]); setHolidays([]);
        setMessage("Your account does not have incident management permission.");
        return;
      }
      const suffix = filter === "ALL" ? "" : "?status=" + filter;
      const [cases, policyRows, holidayRows] = await Promise.all([
        api.get<Incident[]>("/incidents/admin" + suffix),
        api.get<Policy[]>("/incidents/admin/sla-policies"),
        api.get<Holiday[]>("/incidents/admin/sla-holidays"),
      ]);
      setIncidents(Array.isArray(cases) ? cases : []);
      setPolicies(Array.isArray(policyRows) ? policyRows : []);
      setHolidays(Array.isArray(holidayRows) ? holidayRows : []);
      setMessage("");
    } catch (error) {
      setAllowed(false); setIncidents([]); setPolicies([]); setHolidays([]);
      setMessage(error instanceof Error ? error.message : "Unable to load incident operations.");
    } finally {
      setBusy(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function openDetails(item: Incident) {
    try {
      const detail = await api.get<Incident>("/incidents/admin/" + item.id);
      setSelected(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load incident details.");
    }
  }

  async function runAction(action: "claim" | "status" | "escalate", item: Incident) {
    let note = "";
    if (action !== "claim") {
      note = window.prompt(action === "status" ? "Add the reason for this status change" : "Add the escalation reason")?.trim() ?? "";
      if (!note) { setMessage("An audit note is required before this action can be submitted."); return; }
    }
    let status: string | undefined;
    if (action === "status") {
      if (item.status === "ACKNOWLEDGED") status = "IN_PROGRESS";
      else if (item.status === "IN_PROGRESS") status = "RESOLVED";
      else if (item.status === "RESOLVED") {
        status = window.confirm("Reopen this resolved incident? Choose Cancel to close it.") ? "IN_PROGRESS" : "CLOSED";
      }
      if (!status) return;
    }
    setBusy(true); setMessage("");
    try {
      if (action === "claim") await api.patch("/incidents/admin/" + item.id + "/claim", {});
      if (action === "status") await api.patch("/incidents/admin/" + item.id + "/status", { status, note });
      if (action === "escalate") await api.post("/incidents/admin/" + item.id + "/escalate", { note });
      setMessage(action === "claim" ? "Incident assigned to you." : action === "escalate" ? "Incident escalation recorded." : "Incident status updated.");
      await load();
      if (selected?.id === item.id) await openDetails(item);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The incident could not be updated. Refresh and verify its current state.");
    } finally {
      setBusy(false);
    }
  }

  function updatePolicy<K extends keyof typeof policyForm>(key: K, value: (typeof policyForm)[K]) {
    setPolicyForm((current) => ({ ...current, [key]: value }));
  }

  async function createPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = policyForm.businessHoursOnly ? policyForm.businessStart : "00:00";
    const end = policyForm.businessHoursOnly ? policyForm.businessEnd : "24:00";
    const toMinute = (value: string) => {
      const [hours, minutes] = value.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const targets = [
      policyForm.acknowledgeMinutes, policyForm.level1Minutes,
      policyForm.level2Minutes, policyForm.level3Minutes,
    ].map(Number);
    if (!policyForm.name.trim() || targets.some((value) => !Number.isInteger(value) || value < 1)) {
      setMessage("Enter a policy name and positive whole-minute targets for acknowledgement and L1/L2/L3.");
      return;
    }
    if (policyForm.businessHoursOnly && (!start || !end || toMinute(start) >= toMinute(end))) {
      setMessage("Choose a valid business-hours start and end time.");
      return;
    }
    const days = policyForm.businessHoursOnly ? policyForm.workingDays : [0, 1, 2, 3, 4, 5, 6];
    if (!days.length) { setMessage("Select at least one working day."); return; }
    setBusy(true); setMessage("");
    try {
      await api.post("/incidents/admin/sla-policies", {
        name: policyForm.name.trim(), severity: policyForm.severity,
        ...(policyForm.category ? { category: policyForm.category } : {}),
        acknowledgeMinutes: targets[0], level1Minutes: targets[1],
        level2Minutes: targets[2], level3Minutes: targets[3],
        businessHoursOnly: policyForm.businessHoursOnly,
        businessStartMinute: toMinute(start), businessEndMinute: toMinute(end),
        workingDays: days, timezone: policyForm.timezone.trim(),
      });
      setPolicyForm((current) => ({
        ...current, name: "", acknowledgeMinutes: "", level1Minutes: "",
        level2Minutes: "", level3Minutes: "",
      }));
      setMessage("Policy saved as disabled. Review its scope and approve it separately to activate it.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save SLA policy.");
    } finally {
      setBusy(false);
    }
  }

  async function approvePolicy(policy: Policy) {
    if (!window.confirm("Approve and activate this policy for " + policy.severity + (policy.category ? " / " + policy.category : " / all categories") + "? The previous active policy for this scope will be disabled.")) return;
    setBusy(true); setMessage("");
    try {
      await api.post("/incidents/admin/sla-policies/" + policy.id + "/approve", {});
      setMessage("SLA policy approved and activated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve SLA policy.");
    } finally {
      setBusy(false);
    }
  }

  async function addHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!holidayDate || !holidayLabel.trim()) { setMessage("Enter both a holiday date and label."); return; }
    setBusy(true); setMessage("");
    try {
      await api.post("/incidents/admin/sla-holidays", { date: holidayDate, label: holidayLabel.trim() });
      setHolidayDate(""); setHolidayLabel("");
      setMessage("Holiday added to the active SLA calendar.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add holiday.");
    } finally {
      setBusy(false);
    }
  }

  return <main><section className="workspace adminHub">
    <div className="workspaceTop">
      <div><div className="pill">Support operations</div><h1>Incident management</h1>
        <p>Review cases, track SLA deadlines and manage approved escalation calendars.</p></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/admin" className="secondary">Back to admin</Link>
        <button className="primary" disabled={busy} onClick={() => void load()}>Refresh workspace</button>
      </div>
    </div>
    {!!message && <p role="status" aria-live="polite">{message}</p>}
    {allowed && <>
      <div className="adminModules">
        <article><h3>{incidents.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length}</h3><p>Open / active cases</p></article>
        <article><h3>{incidents.filter((item) => item.status === "OPEN").length}</h3><p>Awaiting acknowledgement</p></article>
        <article><h3>{policies.filter((item) => item.enabled && item.approvedAt).length}</h3><p>Approved active policies</p></article>
        <article><h3>{holidays.length}</h3><p>Configured holidays</p></article>
      </div>
      <section className="analyticsPanel" style={{ marginTop: 24 }}>
        <div className="workspaceTop"><div><h2>Support case queue</h2><p>Claiming and status transitions are recorded in the activity trail.</p></div>
          <label>Filter cases <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="ALL">All statuses</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}
          </select></label>
        </div>
        <div className="adminModules">
          {incidents.map((item) => <article key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{item.title}</strong><span className="pill">{item.severity} · L{item.level}</span>
            </div>
            <p>{item.category.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")}</p>
            <p>Created {dateLabel(item.createdAt)}</p>
            <p>Acknowledge due: {dateLabel(item.acknowledgeDueAt)} · Resolve due: {dateLabel(item.resolveDueAt)}</p>
            <p>Assigned: {item.assignedToId ? "Owner assigned" : "Unassigned"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button disabled={busy} onClick={() => void openDetails(item)}>View activity</button>
              {item.status === "OPEN" && !item.assignedToId && <button disabled={busy} onClick={() => void runAction("claim", item)}>Claim case</button>}
              {["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"].includes(item.status) && <button disabled={busy} onClick={() => void runAction("status", item)}>{item.status === "ACKNOWLEDGED" ? "Start work" : item.status === "IN_PROGRESS" ? "Resolve case" : "Reopen / close"}</button>}
              {!["RESOLVED", "CLOSED"].includes(item.status) && <button disabled={busy || item.level >= 3} onClick={() => void runAction("escalate", item)}>Escalate</button>}
            </div>
          </article>)}
          {!incidents.length && <article><h3>No cases in this view</h3><p>New customer or provider reports will appear here.</p></article>}
        </div>
      </section>
      {selected && <section className="analyticsPanel" style={{ marginTop: 20 }}>
        <div className="workspaceTop"><div><h2>{selected.title}</h2><p>Case activity and audit trail</p></div><button onClick={() => setSelected(null)}>Close details</button></div>
        <p>{selected.description || "No additional description."}</p>
        <div className="adminModules">{(selected.activities || []).map((activity) => <article key={activity.id}>
          <strong>{activity.action.replaceAll("_", " ")}</strong><p>{activity.note || "No note supplied"}</p>
          <small>{dateLabel(activity.createdAt)} · {activity.actorId ? "Recorded by an authorized user" : "System scheduler"}</small>
        </article>)}</div>
      </section>}
      <section className="analyticsPanel" style={{ marginTop: 24 }}>
        <h2>SLA policy administration</h2>
        <p>Policy targets are business decisions. New policies remain disabled until an authorized operations owner approves them.</p>
        <div className="adminModules">
          {policies.map((policy) => <article key={policy.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{policy.name}</strong><span className="pill">{policy.enabled && policy.approvedAt ? "ACTIVE" : "DISABLED / PENDING APPROVAL"}</span>
            </div>
            <p>{policy.severity} · {policy.category || "All categories"} · {policy.timezone}</p>
            <p>Ack {policy.acknowledgeMinutes}m · L1 {policy.level1Minutes}m · L2 {policy.level2Minutes}m · L3 {policy.level3Minutes}m</p>
            <p>{policy.businessHoursOnly ? `${minuteLabel(policy.businessStartMinute)}–${minuteLabel(policy.businessEndMinute)} · ${policy.workingDays.map((day) => weekdays.find((item) => item.value === day)?.label).filter(Boolean).join(", ")}` : "Elapsed-time calendar"}</p>
            <p>{policy.approvedAt ? "Approved " + dateLabel(policy.approvedAt) : "Not approved"}</p>
            {!policy.enabled && <button disabled={busy} onClick={() => void approvePolicy(policy)}>Approve and activate</button>}
          </article>)}
          {!policies.length && <article><h3>No SLA policies configured</h3><p>Incidents will have no automatic SLA deadlines until an approved policy is created.</p></article>}
        </div>
        <form onSubmit={createPolicy} style={{ display: "grid", gap: 14, maxWidth: 900, marginTop: 24 }}>
          <h3>Create a policy revision</h3>
          <div className="formGrid">
            <label>Policy name<input required maxLength={100} value={policyForm.name} onChange={(event) => updatePolicy("name", event.target.value)} /></label>
            <label>Severity<select value={policyForm.severity} onChange={(event) => updatePolicy("severity", event.target.value)}>{severityOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Category scope<select value={policyForm.category} onChange={(event) => updatePolicy("category", event.target.value)}><option value="">All categories for this severity</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Acknowledgement target (minutes)<input required type="number" min="1" max="525600" value={policyForm.acknowledgeMinutes} onChange={(event) => updatePolicy("acknowledgeMinutes", event.target.value)} /></label>
            <label>L1 target (minutes)<input required type="number" min="1" max="525600" value={policyForm.level1Minutes} onChange={(event) => updatePolicy("level1Minutes", event.target.value)} /></label>
            <label>L2 target (minutes)<input required type="number" min="1" max="525600" value={policyForm.level2Minutes} onChange={(event) => updatePolicy("level2Minutes", event.target.value)} /></label>
            <label>L3 target (minutes)<input required type="number" min="1" max="525600" value={policyForm.level3Minutes} onChange={(event) => updatePolicy("level3Minutes", event.target.value)} /></label>
            <label>Timezone<input required value={policyForm.timezone} onChange={(event) => updatePolicy("timezone", event.target.value)} placeholder="Asia/Kolkata" /></label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" checked={policyForm.businessHoursOnly} onChange={(event) => updatePolicy("businessHoursOnly", event.target.checked)} /> Count only configured business hours</label>
          {policyForm.businessHoursOnly && <>
            <div className="formGrid">
              <label>Business day start<input required type="time" value={policyForm.businessStart} onChange={(event) => updatePolicy("businessStart", event.target.value)} /></label>
              <label>Business day end<input required type="time" value={policyForm.businessEnd} onChange={(event) => updatePolicy("businessEnd", event.target.value)} /></label>
            </div>
            <fieldset><legend>Working days</legend><div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {weekdays.map((day) => <label key={day.value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={policyForm.workingDays.includes(day.value)} onChange={(event) => updatePolicy("workingDays", event.target.checked ? [...policyForm.workingDays, day.value] : policyForm.workingDays.filter((value) => value !== day.value))} />{day.label}
              </label>)}
            </div></fieldset>
          </>}
          <button className="primary" type="submit" disabled={busy}>Save disabled policy</button>
        </form>
      </section>
      <section className="analyticsPanel" style={{ marginTop: 24 }}>
        <h2>Holiday calendar</h2><p>Holiday dates are interpreted in each policy's timezone.</p>
        <div className="adminModules">{holidays.map((holiday) => <article key={holiday.id}><strong>{new Date(holiday.date).toLocaleDateString()}</strong><p>{holiday.label}</p></article>)}</div>
        <form onSubmit={addHoliday} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginTop: 16 }}>
          <label>Holiday date<input required type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} /></label>
          <label>Label<input required maxLength={120} value={holidayLabel} onChange={(event) => setHolidayLabel(event.target.value)} placeholder="Public holiday name" /></label>
          <button disabled={busy} type="submit">Add holiday</button>
        </form>
      </section>
    </>}
  </section></main>;
}
