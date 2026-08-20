(() => {
  "use strict";

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

  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener("click", () => track("phone_click", { link_url: link.href }));
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
