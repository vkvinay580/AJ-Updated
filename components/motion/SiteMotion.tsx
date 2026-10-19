"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const NAVIGATION_TIMEOUT = 8_000;
const SUBMISSION_TIMEOUT = 20_000;

function isSamePageHashLink(link: HTMLAnchorElement) {
  const destination = new URL(link.href, window.location.href);
  return destination.pathname === window.location.pathname
    && destination.search === window.location.search
    && destination.hash.length > 0;
}

export default function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.routeState = "settled";
    const timer = window.setTimeout(() => {
      delete document.documentElement.dataset.routeState;
    }, 420);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    let navigationTimer = 0;

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || isSamePageHashLink(link)) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

      document.documentElement.dataset.routeState = "navigating";
      window.clearTimeout(navigationTimer);
      navigationTimer = window.setTimeout(() => {
        delete document.documentElement.dataset.routeState;
      }, NAVIGATION_TIMEOUT);
    };

    const onInvalid = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement)) return;
      field.classList.remove("motion-invalid");
      window.requestAnimationFrame(() => field.classList.add("motion-invalid"));
      window.setTimeout(() => field.classList.remove("motion-invalid"), 430);
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const submitter = event.submitter instanceof HTMLButtonElement || event.submitter instanceof HTMLInputElement
        ? event.submitter
        : form.querySelector<HTMLButtonElement | HTMLInputElement>('button[type="submit"], input[type="submit"], button:not([type])');

      form.classList.add("motion-submitting");
      form.setAttribute("aria-busy", "true");

      let sawDisabledState = Boolean(submitter?.disabled);
      const finish = () => {
        form.classList.remove("motion-submitting");
        form.removeAttribute("aria-busy");
        observer.disconnect();
        window.clearTimeout(fallbackTimer);
        window.clearTimeout(noPendingTimer);
      };

      const observer = new MutationObserver(() => {
        if (!submitter) return;
        if (submitter.disabled) sawDisabledState = true;
        if (sawDisabledState && !submitter.disabled) finish();
      });

      if (submitter) observer.observe(submitter, { attributes: true, attributeFilter: ["disabled"] });
      const noPendingTimer = window.setTimeout(() => {
        if (!sawDisabledState) finish();
      }, 1_200);
      const fallbackTimer = window.setTimeout(finish, SUBMISSION_TIMEOUT);
    };

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      window.clearTimeout(navigationTimer);
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return <div className="route-progress" aria-hidden="true"><span /></div>;
}
