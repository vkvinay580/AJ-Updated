import { ArrowRight, Flame, Layers3, Scale, Sparkles } from "lucide-react";
import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { rows } from "@/lib/db";

const grams = (mg: unknown) => `${(Number(mg || 0) / 1000).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} g`;

export default async function MeltingReportPage() {
  const groups = await rows<RowDataPacket>(`SELECT mg.id,mg.gatti_id AS gattiId,DATE_FORMAT(mg.melt_date,'%Y-%m-%d') AS meltDate,mg.status,
    mg.audited_total_weight_mg AS auditedTotalWeightMg,mg.input_weight_mg AS inputWeightMg,
    mg.output_gatti_weight_mg AS outputWeightMg,mg.matti_weight_mg AS mattiWeightMg,mg.purity,mg.completed_at AS completedAt,
    creator.name AS createdBy,melter.name AS completedBy,COUNT(mgi.id) AS itemCount,COUNT(DISTINCT ti.bill_id) AS billCount,
    COUNT(DISTINCT gt.branch_id) AS branchCount FROM melt_groups mg JOIN head_office_users creator ON creator.id=mg.created_by
    LEFT JOIN head_office_users melter ON melter.id=mg.completed_by LEFT JOIN melt_group_items mgi ON mgi.melt_group_id=mg.id
    LEFT JOIN branch_gold_transfer_items ti ON ti.id=mgi.transfer_item_id LEFT JOIN branch_gold_transfers gt ON gt.id=ti.transfer_id
    GROUP BY mg.id ORDER BY mg.melt_date DESC,mg.id DESC`);
  const completed = groups.filter(group => group.status === "completed");
  const totalOutput = completed.reduce((sum, group) => sum + Number(group.outputWeightMg || 0), 0);
  const totalMatti = completed.reduce((sum, group) => sum + Number(group.mattiWeightMg || 0), 0);
  return <div className="admin-page melting-report-page"><div className="page-title"><div><p>HEAD OFFICE PRODUCTION</p><h1>Melting report</h1><span>Gatti-wise traceability from branch packet and bill through final melt output.</span></div></div>
    <div className="metric-grid melting-metrics"><article><div><span>Total Gatti groups</span><strong>{groups.length}</strong></div><Layers3/></article><article><div><span>Completed</span><strong>{completed.length}</strong></div><Sparkles/></article><article><div><span>Total Gatti output</span><strong>{grams(totalOutput)}</strong></div><Flame/></article><article><div><span>Total Matti</span><strong>{grams(totalMatti)}</strong></div><Scale/></article></div>
    <section className="panel list-panel"><div className="panel-heading"><div><h2>Gatti register</h2><p>Select a Gatti ID to view every ornament, originating bill, customer, and branch.</p></div><span>{groups.length} records</span></div><div className="responsive-table"><table><thead><tr><th>Gatti ID</th><th>Date</th><th>Source</th><th>Audited input</th><th>Gatti output</th><th>Matti</th><th>Purity</th><th>Status</th><th/></tr></thead><tbody>{groups.length ? groups.map(group => <tr key={Number(group.id)}><td><strong>{group.gattiId}</strong><small>Created by {group.createdBy}</small></td><td>{group.meltDate}</td><td>{group.itemCount} ornaments<small>{group.billCount} bills · {group.branchCount} branches</small></td><td>{grams(group.auditedTotalWeightMg)}</td><td>{group.status === "completed" ? grams(group.outputWeightMg) : "—"}</td><td>{group.status === "completed" ? grams(group.mattiWeightMg) : "—"}</td><td>{group.purity ? `${Number(group.purity).toFixed(3)}%` : "—"}</td><td><span className={`melting-status ${group.status}`}>{group.status}</span></td><td><Link className="row-action" href={`/admin/melting-report/${group.id}`}>View Gatti <ArrowRight/></Link></td></tr>) : <tr><td colSpan={9}><div className="empty-inline"><Flame/><h3>No Gatti groups yet</h3><p>Groups created by the Head Office auditor will appear here.</p></div></td></tr>}</tbody></table></div></section>
  </div>;
}
