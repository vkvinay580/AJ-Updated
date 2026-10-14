import { ArrowRight, Banknote, Building2, Coins, DoorOpen, FileCheck2, Flame, Landmark, ReceiptText, UserPlus } from "lucide-react";
import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { requireSession } from "@/lib/auth";
import { one, rows } from "@/lib/db";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
const weight = (mg: number) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(mg / 1000)} g`;

export default async function DashboardPage() {
  const session = await requireSession();
  const rawStats = await one<RowDataPacket & { stock:number; branchGold:number; headOfficeGold:number; gattiGold:number; branchCash:number; openBranches:number }>(`SELECT
    (SELECT COALESCE(SUM(CASE b.transaction_type WHEN 'purchase' THEN bi.weight_mg ELSE -bi.weight_mg END),0) FROM bill_items bi JOIN bills b ON b.id=bi.bill_id WHERE b.company_id=? AND bi.metal='gold') +
      (SELECT COALESCE(SUM(CASE movement WHEN 'add' THEN weight_mg ELSE -weight_mg END),0) FROM stock_adjustments WHERE company_id=? AND metal='gold') AS stock,
    (SELECT COALESCE(SUM(CASE direction WHEN 'in' THEN weight_mg ELSE -weight_mg END),0) FROM branch_stock_ledger) AS branchGold,
    (SELECT COALESCE(SUM(COALESCE(hoa.audited_weight_mg,bgti.sent_weight_mg)),0)
      FROM branch_gold_transfer_items bgti JOIN branch_gold_transfers bgt ON bgt.id=bgti.transfer_id AND bgt.status='received'
      LEFT JOIN head_office_ornament_audits hoa ON hoa.transfer_item_id=bgti.id
      LEFT JOIN melt_group_items mgi ON mgi.transfer_item_id=bgti.id WHERE mgi.id IS NULL) AS headOfficeGold,
    (SELECT COALESCE(SUM(mg.output_gatti_weight_mg),0) FROM melt_groups mg LEFT JOIN gatti_sales gs ON gs.melt_group_id=mg.id
      WHERE mg.status='completed' AND gs.id IS NULL) AS gattiGold,
    (SELECT COALESCE(SUM(CASE direction WHEN 'credit' THEN amount_paise ELSE -amount_paise END),0) FROM branch_fund_ledger) AS branchCash,
    (SELECT COUNT(DISTINCT branch_id) FROM branch_sessions WHERE expires_at>UTC_TIMESTAMP()) AS openBranches
  `, [session.companyId, session.companyId]);
  const stats = { stock: Number(rawStats?.stock || 0), branchGold: Number(rawStats?.branchGold || 0), headOfficeGold: Number(rawStats?.headOfficeGold || 0), gattiGold: Number(rawStats?.gattiGold || 0), branchCash: Number(rawStats?.branchCash || 0), openBranches: Number(rawStats?.openBranches || 0) };
  const recent = await rows<RowDataPacket & {id:number;billNumber:string;transactionType:string;billDate:string;totalPaise:number;customerName:string}>(`SELECT b.id, b.bill_number AS billNumber, b.transaction_type AS transactionType, DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS billDate,
    b.total_paise AS totalPaise, c.name AS customerName FROM bills b JOIN customers c ON c.id=b.customer_id
    WHERE b.company_id=? ORDER BY b.id DESC LIMIT 6`, [session.companyId]);
  const cards = [
    { label: "Recorded stock", value: weight(stats.stock), icon: Coins },
    { label: "Gold in branches", value: weight(stats.branchGold), icon: Building2 },
    { label: "Gold in Head Office", value: weight(stats.headOfficeGold), icon: Landmark },
    { label: "Unsold Gatti in HO", value: weight(stats.gattiGold), icon: Flame },
    { label: "Cash in branches", value: money(stats.branchCash), icon: Banknote },
    { label: "Branches open now", value: stats.openBranches.toLocaleString("en-IN"), icon: DoorOpen },
  ];
  return <div className="admin-page">
    <div className="page-title"><div><p>Overview</p><h1>Good day, {session.adminName.split(" ")[0]}</h1><span>Here is what is happening at {session.companyName}.</span></div><Link href="/admin/customers/new" className="admin-primary"><UserPlus/> New transaction</Link></div>
    <div className="metric-grid dashboard-metrics">{cards.map(({label,value,icon:Icon})=><article key={label}><div><span>{label}</span><strong>{value}</strong></div><Icon/></article>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Recent bills</h2><p>Latest company transactions</p></div><Link href="/admin/bills">View all <ArrowRight/></Link></div>
      {recent.length ? <div className="responsive-table"><table><thead><tr><th>Bill</th><th>Customer</th><th>Type</th><th>Date</th><th className="right">Amount</th></tr></thead><tbody>{recent.map((bill)=><tr key={bill.id}><td><Link className="table-link" href={`/admin/bills/${bill.id}`}>{bill.billNumber}</Link></td><td>{bill.customerName}</td><td><span className={`status ${bill.transactionType}`}>{bill.transactionType}</span></td><td>{bill.billDate}</td><td className="right strong">{money(bill.totalPaise)}</td></tr>)}</tbody></table></div> : <div className="empty-inline"><ReceiptText/><h3>No bills yet</h3><p>Start by adding a customer and creating their first bill.</p></div>}
    </section><aside className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common operator tasks</p></div></div><Link href="/admin/customers/new"><span><UserPlus/></span><div><strong>Add customer</strong><small>Phone check, KYC & registration</small></div><ArrowRight/></Link><Link href="/admin/bills/new"><span><ReceiptText/></span><div><strong>Create bill</strong><small>Sale or gold purchase</small></div><ArrowRight/></Link><Link href="/admin/customers"><span><FileCheck2/></span><div><strong>Find KYC</strong><small>Search customer documents</small></div><ArrowRight/></Link></aside></div>
  </div>;
}
