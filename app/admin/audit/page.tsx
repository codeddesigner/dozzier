"use client";
import Link from "next/link";
import { Loading, useLoad } from "@/components/ui";
import { adminRpc } from "@/lib/admin";

type Row = { id: string; admin_email: string; action: string; target: string | null; detail: Record<string, unknown> | null; at: string };
const UUID = /^[0-9a-f-]{36}$/;

export default function AdminAudit() {
  const { data, loading } = useLoad(async () => ({ log: await adminRpc<Row[]>("admin_audit_list", { p_limit: 300 }), admins: await adminRpc<{ email: string; added_at: string }[]>("admin_list_admins") }), []);
  if (loading && !data) return <Loading />;
  return (
    <>
      <div className="adm-head"><h1>Admin log</h1><span className="caption muted">Every change made from this admin area. Admins: {data?.admins.map((a) => a.email).join(", ")}</span></div>
      <div className="adm-card" style={{ padding: "0 18px" }}>
        <table className="table">
          <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {!data?.log.length && <tr><td colSpan={4} className="table-empty">No admin actions yet.</td></tr>}
            {data?.log.map((r) => (
              <tr key={r.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{new Date(r.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td>{r.admin_email}</td>
                <td className="medium">{r.action.replace(/_/g, " ")}</td>
                <td className="caption">{r.target && UUID.test(r.target) && !r.action.startsWith("support") && !r.action.startsWith("report") ? <Link className="link" href={`/admin/users/${r.target}`}>Account</Link> : null}
                  {r.detail ? ` ${Object.entries(r.detail).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(", ")}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
