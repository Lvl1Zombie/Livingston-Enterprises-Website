# Livingston Refinishing

Static website for [livingstonrefinishing.com](https://livingstonrefinishing.com).

## Publishing

Production is hosted by Hostinger. In hPanel, connect this repository under
**Websites → Dashboard → Advanced → Git** with these settings:

- Branch: `main`
- Root directory: `public_html`
- Auto-deployment: enabled

Every push to `main` then updates the production website automatically.

GitHub Pages remains enabled as a staging preview at
[lvl1zombie.github.io/Livingston-Enterprises-Website](https://lvl1zombie.github.io/Livingston-Enterprises-Website/).

## Pages

- `/` — furniture refinishing landing page
- `/faq/` — frequently asked questions
- `/testimonials/` — customer testimonials

The assessment form currently reproduces the supplied design behavior: it shows
a confirmation state in the browser but does not send or store submissions.
