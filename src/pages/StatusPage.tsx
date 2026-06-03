import { useEffect, useState } from "react";
import { listContacts } from "@/lib/contactStorage";
import { getQueueItems } from "@/lib/indexeddb";

export function StatusPage() {
  const [status, setStatus] = useState<string>("Loading…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listContacts(), getQueueItems()])
      .then(([contacts, queue]) => {
        setStatus(
          JSON.stringify(
            {
              mode: "client-only",
              storage: "IndexedDB",
              contacts: contacts.length,
              queue: queue.length,
              online: typeof navigator !== "undefined" ? navigator.onLine : true,
            },
            null,
            2,
          ),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed");
        setStatus("Failed");
      });
  }, []);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>App status</h1>
      <pre
        style={{
          background: "#1e1e1e",
          color: "#d4d4d4",
          padding: "1rem",
          borderRadius: "8px",
          overflowX: "auto",
        }}
      >
        {error ? `Error: ${error}` : status}
      </pre>
    </div>
  );
}
