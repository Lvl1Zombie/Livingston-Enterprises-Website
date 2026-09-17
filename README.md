# Livingston Refinishing

Static website for [livingstonrefinishing.com](https://livingstonrefinishing.com).

## Publishing

Production is hosted by GitHub Pages from the repository's `main` branch. The
custom domain is stored in `CNAME`, and its DNS records point to GitHub Pages.
HTTPS is enforced for both the apex domain and its `www` redirect.

Every push to `main` automatically rebuilds the production website. The default
GitHub Pages URL redirects to the custom domain.

## Challenger-site strategy

This domain intentionally remains separate from the existing Livingston sites
while performance is evaluated. Do not add cross-domain canonicals or redirects
until the owner ends that evaluation. Unlike the legacy sites, this site uses
unique furniture-specific copy and dedicated service URLs.

## Pages

- `/` — Central Pennsylvania furniture refinishing and repair homepage
- `/furniture-refinishing/` — stripping, color and protective finishing
- `/furniture-repair/` — chair, drawer, structural and surface repair
- `/antique-restoration/` — antique and heirloom restoration
- `/door-refinishing/` — interior and exterior wood doors
- `/projects/` — first-party project notes
- `/about/` — business and service approach
- `/contact/` — assessment form and direct contact details
- `/faq/` — frequently asked questions
- `/testimonials/` — furniture- and door-specific customer feedback

## Owner-dependent launch items

The site is fully static and does not depend on React or a build step. The
`/contact/` assessment form posts through Formspree (or any compatible JSON
endpoint) and, on success, pushes a `generate_lead` event to `dataLayer` for
GTM/GA4. It does not upload photos.

Until a real Formspree form ID is configured, the placeholder
`https://formspree.io/f/YOUR_FORM_ID` is left in `assets/form-config.js` and
on the contact form. The page still loads; a failed or unconfigured submit
shows a phone/email fallback instead of opening a mail app.

### Formspree (required for live lead email)

Joshua must finish this once. There is no server or env file on GitHub Pages;
the endpoint URL is the config.

1. Create a free Formspree account at https://formspree.io
2. Create a new form whose notification email is `livingstep@comcast.net`
3. Copy the form endpoint, which looks like `https://formspree.io/f/abcdwxyz`
4. Replace `YOUR_FORM_ID` in both places:
   - `assets/form-config.js` → `window.LIVINGSTON_FORM_ENDPOINT`
   - `contact/index.html` → the form `action` and `data-form-endpoint`
5. Submit a test assessment, then confirm Formspree’s verification email so
   later leads are delivered
6. In GTM (`GTM-PTJKP8KL`), add a Custom Event trigger for `generate_lead`
   and a GA4 Event tag (measurement ID is already loaded by GTM — do not
   hardcode `gtag` or `G-238YFRPQGC` in this repo)

Before launch, the owner should also provide:

- verified Google Analytics and Search Console IDs;
- original before/during/after photographs for the three published project
  notes and future case studies;
- confirmation that Newmanstown, PA 17073 is the correct public service base;
- exact years in business and any credentials or insurance claims to publish;
- a direct Google review-request link and current Business Profile URL.

After deployment, submit `https://livingstonrefinishing.com/sitemap.xml` in a
separate Search Console property for this domain. Measure non-branded organic
traffic and qualified leads by hostname so the legacy domains remain a useful
benchmark.
