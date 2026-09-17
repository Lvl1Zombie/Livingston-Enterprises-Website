/* Assessment form delivery for GitHub Pages (no backend in this repo).
 *
 * Joshua: replace YOUR_FORM_ID with the Formspree form hash after creating
 * a form that delivers to livingstep@comcast.net.
 *
 * 1. Sign up at https://formspree.io (free tier is enough)
 * 2. New form → email livingstep@comcast.net
 * 3. Copy the endpoint, which looks like: https://formspree.io/f/abcdwxyz
 * 4. Paste that full URL below (keep the quotes)
 * 5. Also update the matching action / data-form-endpoint on /contact/
 * 6. Submit a test lead, then confirm the Formspree verification email
 *
 * Leave the placeholder as-is until that ID exists. The site still loads;
 * the form will show an error with phone/email instead of a silent fail.
 */
window.LIVINGSTON_FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
