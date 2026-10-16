# Livingston lead form setup

The website sends assessment requests to a Google Apps Script web app. The script saves each lead to Google Sheets, stores submitted photos in Google Drive, and emails a notification.

## 1. Prepare Google Drive and Sheets

1. Create a Google Sheet for website leads.
2. Rename its first tab **Livingston Leads**.
3. Copy the spreadsheet ID from its URL. It is the long value between `/d/` and `/edit`.
4. Create a Google Drive folder named **Livingston Lead Photos**.
5. Open that folder and copy its folder ID from the URL. It is the value after `/folders/`.

## 2. Create the Apps Script

1. Go to [script.google.com](https://script.google.com/) and create a new project.
2. Replace the contents of its `Code.gs` file with this repository's `apps-script/Code.gs`.
3. At the top of `Code.gs`, replace the Sheet ID, Drive folder ID, and notification email placeholders.
4. Save the project.

## 3. Deploy the web app

1. Click **Deploy**, then **New deployment**.
2. Next to **Select type**, choose **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**.
5. Click **Deploy** and approve the requested Google permissions.
6. Copy the Web app URL ending in `/exec`.

When `Code.gs` changes later, create a new deployment version through **Deploy > Manage deployments > Edit**, then deploy the new version.

## 4. Connect the website

Open `assets/js/lead-form.js` and replace:

```js
const FORM_ENDPOINT = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

with the `/exec` Web app URL. Commit and publish that change, then submit one test request from the live Contact page. Confirm that the lead appears in the **Livingston Leads** tab, its photos appear in **Livingston Lead Photos**, the notification email arrives, and the browser reaches `/thank-you/`.
