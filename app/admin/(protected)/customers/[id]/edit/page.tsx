"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Customer = { id:number; name:string; phone:string; email?:string; address?:string; city?:string; state?:string; gstin?:string; stateCode?:string; placeOfSupply?:string; postalCode?:string };

export default function EditCustomerPage() {
  const { id } = useParams<{id:string}>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customer, setCustomer] = useState<Customer|null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(()=>{fetch(`/api/admin/customers/${id}`).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load customer.");setCustomer(data.customer)}).catch(caught=>setError(caught instanceof Error?caught.message:"Unable to load customer."))},[id]);
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setError("");const response=await fetch(`/api/admin/customers/${id}`,{method:"PATCH",body:new FormData(event.currentTarget)});const data=await response.json();if(!response.ok){setError(data.error||"Unable to update customer.");setSaving(false);return}const requested=searchParams.get("returnTo");const returnTo=requested?.startsWith("/admin/")?requested:`/admin/customers/${id}`;router.push(returnTo);router.refresh()}
  if(!customer)return <div className="loading-state page-loading">{error||"Loading customer…"}</div>;
  return <div className="admin-page narrow-page"><div className="page-title"><div><Link href={`/admin/customers/${id}`} className="back-link"><ArrowLeft/> Customer profile</Link><p>Customer record</p><h1>Edit customer</h1><span>Update contact and invoice details for {customer.name}.</span></div></div><form onSubmit={save} className="registration-form"><section className="panel form-panel"><div className="form-section-heading"><span>01</span><div><h2>Customer details</h2><p>KYC records remain unchanged.</p></div></div><div className="form-grid"><label className="full">Full name *<input name="name" required maxLength={120} defaultValue={customer.name}/></label><label>Mobile number *<input name="phone" required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} defaultValue={customer.phone}/></label><label>Email address<input name="email" type="email" maxLength={150} defaultValue={customer.email||""}/></label><label>Postal code<input name="postalCode" inputMode="numeric" maxLength={10} defaultValue={customer.postalCode||""}/></label><label className="full">Address<textarea name="address" rows={3} maxLength={400} defaultValue={customer.address||""}/></label><label>City<input name="city" maxLength={80} defaultValue={customer.city||""}/></label><label>State<input name="state" maxLength={80} defaultValue={customer.state||""}/></label><label>GSTIN/UIN<input name="gstin" maxLength={15} className="uppercase" defaultValue={customer.gstin||""}/></label><label>State code<input name="stateCode" inputMode="numeric" maxLength={2} defaultValue={customer.stateCode||""}/></label><label className="full">Place of supply<input name="placeOfSupply" maxLength={80} defaultValue={customer.placeOfSupply||""}/></label></div></section>{error&&<p className="form-error sticky-error">{error}</p>}<div className="form-actions"><Link className="admin-secondary" href={`/admin/customers/${id}`}>Cancel</Link><button className="admin-primary" disabled={saving}>{saving?"Saving…":"Save customer"}<Check/></button></div></form></div>;
}
