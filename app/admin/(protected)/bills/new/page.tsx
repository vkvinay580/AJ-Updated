import { Suspense } from "react";
import BillForm from "@/components/admin/BillForm";
export default function NewBillPage(){return <Suspense fallback={<div className="loading-state page-loading">Preparing billing…</div>}><BillForm/></Suspense>}
