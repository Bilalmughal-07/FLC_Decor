"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventRow = { id: string; aggregateId: string; eventType: string; state: string; attempts: number; createdAt: string };

export function NotificationQueueClient({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function post(path: string, operation: string) {
    setBusy(operation); setMessage(""); setError("");
    try {
      const response = await fetch(path, { method: "POST" });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "The operation failed."); return; }
      setMessage(operation === "process" ? `Processed ${data.completed ?? 0}; retrying ${data.retried ?? 0}; dead ${data.dead ?? 0}.` : "Notification event queued for retry.");
      router.refresh();
    } catch { setError("The notification service is unavailable."); }
    finally { setBusy(null); }
  }
  return <><div className="admin-session-toolbar"><span>Development provider sends no external messages.</span><button className="button button-outline" type="button" disabled={busy !== null} onClick={() => post("/api/admin/notifications/process", "process")}>Process test queue</button></div>{message ? <p className="form-success" role="status">{message}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<section className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Outbox</p><h2>Delivery events</h2></div></div>{events.length ? events.map((event) => <div className="admin-row" key={event.id}><div><strong>{event.eventType}</strong><small>{event.aggregateId} · {new Date(event.createdAt).toLocaleString("en-PK")}</small></div><span className="status-pill">{event.state}</span><span>Attempts {event.attempts}</span>{["DEAD", "RETRY"].includes(event.state) ? <button type="button" className="remove-button" disabled={busy !== null} onClick={() => post(`/api/admin/notifications/${encodeURIComponent(event.id)}/retry`, event.id)}>Retry</button> : null}</div>) : <p className="empty-copy">No notification outbox events.</p>}</section></>;
}
