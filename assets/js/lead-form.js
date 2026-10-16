(function () {
  'use strict';

  // Replace this value with the /exec URL from the deployed Google Apps Script web app.
  const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwS7l68kFJ9VMmjiswwNQxsrfuMB3QGIUvRCN7GbqJFAOQFHeXGfGLCRDgH1SsVjg1M/exec';
  const MAX_PHOTOS = 3;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 1600;
  const ATTRIBUTION_STORAGE_KEY = 'livingston_lead_attribution';
  const ATTRIBUTION_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;
  const ATTRIBUTION_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'];

  const form = document.querySelector('[data-assessment-form]');
  if (!form) return;

  const submitButton = form.querySelector('[type="submit"]');
  const formStatus = form.querySelector('[data-form-status]');
  const contactError = form.querySelector('[data-contact-error]');
  const photoError = form.querySelector('[data-photo-error]');
  const phoneInput = form.elements.phone;
  const emailInput = form.elements.email;
  const photoInput = form.elements.photos;
  const originalButtonText = submitButton.textContent;

  populateAttributionFields();
  phoneInput.addEventListener('input', clearContactValidity);
  emailInput.addEventListener('input', clearContactValidity);
  photoInput.addEventListener('change', function () { photoError.textContent = ''; });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearMessages();

    if (!validateContactMethod()) {
      phoneInput.focus();
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const files = Array.from(photoInput.files || []);
    const fileProblem = validateFiles(files);
    if (fileProblem) {
      photoError.textContent = fileProblem;
      photoInput.focus();
      return;
    }

    setSending(true);
    try {
      const photos = [];
      for (const file of files) photos.push(await preparePhoto(file));

      const payload = buildPayload(photos);
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'The form could not be sent.');

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'generate_lead', form_name: 'assessment', service: payload.service });
      window.location.assign('/thank-you/');
    } catch (error) {
      console.error('Lead form submission failed:', error);
      if (/larger than 5 MB|could not be resized|could not be prepared|could not be read/i.test(error.message || '')) {
        photoError.textContent = error.message;
      }
      formStatus.innerHTML = 'We could not send your request. Please try again or call <a href="tel:+17173713463">717-371-3463</a>.';
      formStatus.classList.add('form-status--error');
      setSending(false);
    }
  });

  function buildPayload(photos) {
    return {
      name: form.elements.name.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      town: form.elements.town.value.trim(),
      service: form.elements.service.value,
      message: form.elements.message.value.trim(),
      preferred_contact: form.elements.preferred_contact.value,
      website: form.elements.website.value,
      photos: photos,
      page_url: window.location.href,
      utm_source: form.elements.utm_source.value,
      utm_medium: form.elements.utm_medium.value,
      utm_campaign: form.elements.utm_campaign.value,
      gclid: form.elements.gclid.value
    };
  }

  function validateContactMethod() {
    clearContactValidity();
    if (phoneInput.value.trim() || emailInput.value.trim()) return true;
    const message = 'Enter a phone number or email address so Tom can reply.';
    phoneInput.setCustomValidity(message);
    emailInput.setCustomValidity(message);
    contactError.textContent = message;
    return false;
  }

  function clearContactValidity() {
    phoneInput.setCustomValidity('');
    emailInput.setCustomValidity('');
    contactError.textContent = '';
  }

  function validateFiles(files) {
    if (files.length > MAX_PHOTOS) return 'Please choose no more than 3 photos.';
    const allowedExtensions = /\.(jpe?g|png|heic|heif)$/i;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type.toLowerCase()) && !allowedExtensions.test(file.name)) {
        return 'Photos must be JPG, PNG, or HEIC files.';
      }
    }
    return '';
  }

  async function preparePhoto(file) {
    let image;
    try {
      image = await loadImage(file);
    } catch (error) {
      if (file.size > MAX_FILE_BYTES) throw new Error(file.name + ' could not be resized and is larger than 5 MB.');
      return fileToPayload(file, file.type || 'image/jpeg', file.name);
    }

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image.source, 0, 0, width, height);
    if (image.close) image.close();

    let blob = await canvasToBlob(canvas, 'image/jpeg', 0.88);
    if (blob.size > MAX_FILE_BYTES) blob = await canvasToBlob(canvas, 'image/jpeg', 0.75);
    if (blob.size > MAX_FILE_BYTES) throw new Error(file.name + ' is still larger than 5 MB after resizing.');
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'lead-photo';
    return fileToPayload(blob, 'image/jpeg', baseName + '.jpg');
  }

  async function loadImage(file) {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return { source: image, width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('A selected photo could not be prepared.'));
      }, type, quality);
    });
  }

  async function fileToPayload(file, mimeType, name) {
    if (file.size > MAX_FILE_BYTES) throw new Error(name + ' is larger than 5 MB.');
    const dataUrl = await readAsDataUrl(file);
    return { name: name, mimeType: mimeType, data: dataUrl.split(',')[1] };
  }

  function readAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('A selected photo could not be read.')); };
      reader.readAsDataURL(file);
    });
  }

  function populateAttributionFields() {
    const now = Date.now();
    let attribution = {};
    try {
      const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || '{}');
      if (stored.expiresAt > now && stored.values) attribution = stored.values;
    } catch (error) {
      attribution = {};
    }

    const searchParams = new URLSearchParams(window.location.search);
    let hasNewValue = false;
    ATTRIBUTION_FIELDS.forEach(function (field) {
      const value = searchParams.get(field);
      if (value) {
        attribution[field] = value;
        hasNewValue = true;
      }
      form.elements[field].value = attribution[field] || '';
    });

    if (hasNewValue) {
      try {
        localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ values: attribution, expiresAt: now + ATTRIBUTION_LIFETIME_MS }));
      } catch (error) {
        // Submissions still work when storage is unavailable.
      }
    } else if (!Object.keys(attribution).length) {
      try { localStorage.removeItem(ATTRIBUTION_STORAGE_KEY); } catch (error) { /* Storage is optional. */ }
    }
  }

  function setSending(isSending) {
    submitButton.disabled = isSending;
    submitButton.textContent = isSending ? 'Sending...' : originalButtonText;
    form.setAttribute('aria-busy', String(isSending));
  }

  function clearMessages() {
    clearContactValidity();
    photoError.textContent = '';
    formStatus.textContent = '';
    formStatus.classList.remove('form-status--error');
  }
})();
