(() => {
  "use strict";

  const revealSelector = [
    ".section-head",
    ".before-after-card",
    ".service-card",
    ".project-card",
    ".step",
    ".quote",
    ".faq-list details",
    ".content-grid > *",
    ".split > *",
    ".split-reverse > *",
    ".contact-grid > *",
    ".cta .narrow",
    ".hero-proof .proof"
  ].join(", ");
  const revealItems = Array.from(document.querySelectorAll(revealSelector));

  if (revealItems.length) {
    revealItems.forEach(item => {
      item.setAttribute("data-scroll-reveal", "");
      const siblings = Array.from(item.parentElement.children).filter(sibling => sibling.matches(revealSelector));
      const siblingIndex = siblings.indexOf(item);
      item.style.setProperty("--reveal-delay", `${Math.min(Math.max(siblingIndex, 0), 3) * 70}ms`);
    });
    document.documentElement.classList.add("has-scroll-reveal");

    const showItem = item => item.classList.add("is-visible");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach(showItem);
    } else {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          showItem(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

      requestAnimationFrame(() => revealItems.forEach(item => observer.observe(item)));
    }
  }

  const menuButton = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    menu.addEventListener("click", event => {
      if (event.target.closest("a")) {
        menu.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll("[data-year]").forEach(node => {
    node.textContent = String(new Date().getFullYear());
  });

  const track = (eventName, details = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...details });
  };

  let callDialog = document.querySelector("[data-call-dialog]");
  if (!callDialog && document.querySelector("[data-call-popup]")) {
    callDialog = document.createElement("dialog");
    callDialog.className = "call-dialog";
    callDialog.setAttribute("data-call-dialog", "");
    callDialog.setAttribute("aria-labelledby", "call-dialog-title");
    callDialog.innerHTML = `
      <div class="call-dialog-panel">
        <button class="call-dialog-close" type="button" data-call-dialog-close aria-label="Close call panel">×</button>
        <span class="eyebrow">Call now</span>
        <h2 id="call-dialog-title">Talk with Livingston</h2>
        <p>Call us directly to discuss your furniture, antique or wood door project.</p>
        <a class="call-dialog-number" href="tel:+17173713463">717-371-3463</a>
      </div>`;
    document.body.append(callDialog);
  }
  const callDialogClose = callDialog?.querySelector("[data-call-dialog-close]");
  const desktopCall = window.matchMedia("(min-width: 768px)");
  let lastCallTrigger = null;

  if (callDialog && callDialogClose) {
    callDialogClose.addEventListener("click", () => callDialog.close());
    callDialog.addEventListener("click", event => {
      if (event.target === callDialog) callDialog.close();
    });
    callDialog.addEventListener("close", () => {
      if (lastCallTrigger) lastCallTrigger.focus();
    });
  }

  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener("click", event => {
      const opensPanel = link.hasAttribute("data-call-popup") && desktopCall.matches && callDialog && typeof callDialog.showModal === "function";
      if (opensPanel) {
        event.preventDefault();
        lastCallTrigger = link;
        if (!callDialog.open) callDialog.showModal();
        callDialogClose.focus();
        track("phone_panel_open", { link_url: link.href });
        return;
      }
      track("phone_click", { link_url: link.href });
    });
  });
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener("click", () => track("email_click", { link_url: link.href }));
  });

  document.querySelectorAll("[data-assessment-form]").forEach(form => {
    let started = false;
    form.addEventListener("input", () => {
      if (!started) {
        started = true;
        track("form_start", { form_name: "assessment" });
      }
    }, { once: true });

    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (form.elements.website && form.elements.website.value) return;

      const values = new FormData(form);
      const lines = [
        `Name: ${values.get("name") || ""}`,
        `Phone: ${values.get("phone") || ""}`,
        `Email: ${values.get("email") || ""}`,
        `Town / ZIP: ${values.get("location") || ""}`,
        `Service: ${values.get("service") || "Not sure"}`,
        "",
        "Project details:",
        String(values.get("details") || "")
      ];
      const subject = `Furniture assessment request — ${values.get("name") || "website visitor"}`;
      track("assessment_email_prepared", { service: values.get("service") || "unknown" });
      window.location.href = `mailto:livingstep@comcast.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      const status = form.querySelector("[data-form-status]");
      if (status) status.textContent = "Your email app should open now. Attach project photos before sending. If it does not open, call 717-371-3463.";
    });
  });
})();
