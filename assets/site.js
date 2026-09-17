(() => {
  "use strict";

  const revealSelector = [
    ".section-head",
    ".before-after-card",
    ".review-card",
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

  const archiveReviewCards = Array.from(document.querySelectorAll(".review-archive-grid .review-card, .reviews-grid .review-card"));
  if (archiveReviewCards.length) {
    const reviewButtons = archiveReviewCards.map((card, index) => {
      const quote = card.querySelector("blockquote");
      if (!quote) return null;

      const button = document.createElement("button");
      const quoteId = `review-text-${index + 1}`;
      quote.id = quoteId;
      button.className = "review-expand";
      button.type = "button";
      button.hidden = true;
      button.setAttribute("aria-controls", quoteId);
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = "<span>Read full review</span><span aria-hidden=\"true\">↓</span>";
      card.append(button);

      button.addEventListener("click", () => {
        const expanded = card.classList.toggle("is-expanded");
        button.setAttribute("aria-expanded", String(expanded));
        button.innerHTML = expanded
          ? "<span>Collapse review</span><span aria-hidden=\"true\">↑</span>"
          : "<span>Read full review</span><span aria-hidden=\"true\">↓</span>";
        quote.scrollTop = 0;
      });

      return { button, card, quote };
    }).filter(Boolean);

    const updateReviewButtons = () => {
      reviewButtons.forEach(({ button, card, quote }) => {
        if (card.classList.contains("is-expanded")) return;
        button.hidden = quote.scrollHeight <= quote.clientHeight + 2;
      });
    };

    requestAnimationFrame(updateReviewButtons);
    window.addEventListener("resize", updateReviewButtons, { passive: true });
  }

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

  const PLACEHOLDER_FORM_ENDPOINT = "YOUR_FORM_ID";
  const FORM_UNCONFIGURED_MESSAGE = "This assessment form is not connected yet. Call 717-371-3463 or email livingstep@comcast.net.";
  const FORM_ERROR_MESSAGE = "We could not send your request. Call 717-371-3463 or email livingstep@comcast.net.";
  const FORM_SUCCESS_MESSAGE = "Thank you. Your assessment request was sent. If you have photos of the piece, email them to livingstep@comcast.net or mention them when we call. You can also call 717-371-3463.";

  const formEndpointLooksReady = endpoint => {
    if (!endpoint) return false;
    if (/^mailto:/i.test(endpoint)) return false;
    if (endpoint.includes(PLACEHOLDER_FORM_ENDPOINT)) return false;
    try {
      const url = new URL(endpoint, window.location.href);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  };

  const resolveFormEndpoint = form => {
    const candidates = [
      window.LIVINGSTON_FORM_ENDPOINT,
      form.getAttribute("data-form-endpoint"),
      form.getAttribute("action")
    ];
    return candidates.map(value => String(value || "").trim()).find(formEndpointLooksReady) || "";
  };

  const setFormStatus = (status, message, state) => {
    if (!status) return;
    status.textContent = message;
    status.classList.remove("is-success", "is-error", "is-pending");
    if (state) status.classList.add(state);
  };

  const readFormspreeMessage = async response => {
    try {
      const body = await response.json();
      if (body && typeof body.error === "string" && body.error) return body.error;
      if (body && Array.isArray(body.errors)) {
        const details = body.errors.map(item => item && item.message).filter(Boolean);
        if (details.length) return details.join(" ");
      }
    } catch {
      /* non-JSON error bodies still get the generic fallback */
    }
    return "";
  };

  document.querySelectorAll("[data-assessment-form]").forEach(form => {
    let started = false;
    const status = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("input", () => {
      if (!started) {
        started = true;
        track("form_start", { form_name: "assessment" });
      }
    }, { once: true });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (form.elements.website && form.elements.website.value) return;
      if (form.elements._gotcha && form.elements._gotcha.value) return;

      const endpoint = resolveFormEndpoint(form);
      if (!endpoint) {
        setFormStatus(status, FORM_UNCONFIGURED_MESSAGE, "is-error");
        return;
      }

      const values = new FormData(form);
      const payload = {
        name: String(values.get("name") || "").trim(),
        phone: String(values.get("phone") || "").trim(),
        email: String(values.get("email") || "").trim(),
        location: String(values.get("location") || "").trim(),
        service: String(values.get("service") || "Not sure yet"),
        details: String(values.get("details") || "").trim(),
        _subject: "Furniture assessment request from livingstonrefinishing.com"
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }
      setFormStatus(status, "Sending your assessment request…", "is-pending");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const remoteMessage = await readFormspreeMessage(response);
          setFormStatus(status, remoteMessage || FORM_ERROR_MESSAGE, "is-error");
          return;
        }

        track("generate_lead", { form_name: "assessment" });
        form.reset();
        started = false;
        setFormStatus(status, FORM_SUCCESS_MESSAGE, "is-success");
      } catch {
        setFormStatus(status, FORM_ERROR_MESSAGE, "is-error");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
      }
    });
  });
})();
