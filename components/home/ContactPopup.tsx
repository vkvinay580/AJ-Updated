"use client";

import Image from "next/image";
import { ArrowRight, Check, CheckCircle2, IndianRupee, LoaderCircle, Scale, ShieldCheck, X } from "lucide-react";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import styles from "./ContactPopup.module.css";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function ContactPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [mobile, setMobile] = useState("");
  const [consent, setConsent] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => setIsOpen(true), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => nameRef.current?.focus(), 180);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function openPopup() {
    setSubmitState("idle");
    setMessage("");
    setIsOpen(true);
  }

  function closePopup() {
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const weight = String(formData.get("weight") ?? "").trim();

    if (!/^\d{10}$/.test(mobile)) {
      setSubmitState("error");
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!consent) {
      setSubmitState("error");
      setMessage("Please authorize Aryan Gold to contact you.");
      return;
    }

    setSubmitState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, weight, consent }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "We could not send your request. Please try again.");
      }

      setSubmitState("success");
      setMessage("Thank you. An Aryan Gold specialist will contact you shortly.");
      form.reset();
      setMobile("");
      setConsent(true);
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "We could not send your request. Please try again.");
    }
  }

  return (
    <>
      <button className={styles.launcher} type="button" onClick={openPopup} aria-haspopup="dialog">
        <span className={styles.launcherIcon}><IndianRupee aria-hidden="true" /></span>
        <span><small>Know your gold&apos;s value</small><strong>Get a free callback</strong></span>
      </button>

      {isOpen && (
        <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && closePopup()}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <button className={styles.close} type="button" onClick={closePopup} aria-label="Close enquiry form">
              <X aria-hidden="true" />
            </button>

            <div className={styles.visual}>
              <Image
                src="/images/contact-popup-gold-cash.png"
                alt="Gold jewellery, gold bars and Indian currency"
                fill
                sizes="(max-width: 720px) 100vw, 390px"
                priority
              />
              <div className={styles.visualShade} />
              <div className={styles.visualCopy}>
                <span><ShieldCheck aria-hidden="true" /> Trusted gold valuation</span>
                <h3>Your gold.<br /><em>Its true value.</em></h3>
                <p>Transparent evaluation, professional guidance, and a prompt callback.</p>
              </div>
            </div>

            <div className={styles.content}>
              {submitState === "success" ? (
                <div className={styles.success} aria-live="polite">
                  <span><CheckCircle2 aria-hidden="true" /></span>
                  <p>Request received</p>
                  <h2 id={titleId}>We&apos;ll call you shortly.</h2>
                  <div>{message}</div>
                  <button type="button" onClick={closePopup}>Done</button>
                </div>
              ) : (
                <>
                  <div className={styles.heading}>
                    <span><Scale aria-hidden="true" /> Free valuation callback</span>
                    <h2 id={titleId}>Tell us about your gold.</h2>
                    <p id={descriptionId}>Share a few details and our team will get in touch.</p>
                  </div>

                  <form className={styles.form} onSubmit={handleSubmit}>
                    <label>
                      <span>Your name</span>
                      <input ref={nameRef} name="name" type="text" autoComplete="name" minLength={2} maxLength={80} placeholder="Enter your full name" required />
                    </label>

                    <div className={styles.fieldRow}>
                      <label>
                        <span>Mobile number</span>
                        <div className={styles.mobileField}><b>+91</b><input name="mobile" type="tel" inputMode="numeric" autoComplete="tel-national" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} pattern="[0-9]{10}" maxLength={10} placeholder="98765 43210" required /></div>
                      </label>
                      <label>
                        <span>Approx. weight</span>
                        <div className={styles.weightField}><input name="weight" type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" placeholder="12.5" required /><b>grams</b></div>
                      </label>
                    </div>

                    <label className={styles.consent}>
                      <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
                      <span><i><Check aria-hidden="true" /></i> I authorize Aryan Gold to contact me.</span>
                    </label>

                    {submitState === "error" && <p className={styles.error} role="alert">{message}</p>}

                    <button className={styles.submit} type="submit" disabled={submitState === "submitting" || !consent}>
                      {submitState === "submitting" ? <><LoaderCircle className={styles.spinner} aria-hidden="true" /> Sending request…</> : <>Request my callback <ArrowRight aria-hidden="true" /></>}
                    </button>
                    <small className={styles.privacy}><ShieldCheck aria-hidden="true" /> Your details are shared only with our Aryan Gold team.</small>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
