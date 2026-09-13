const config = {
  url: window.SUPABASE_URL || 'https://ihhiephldzihqjzapjit.supabase.co',
  anonKey: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGllcGhsZHppaHFqemFwaml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjg0ODAsImV4cCI6MjEwNDkwNDQ4MH0.vPNwliWZEx8KEVdsuTyKkPo9neijI7IWi0Rd51HCICs'
};

const isConfigured =
  config.url &&
  config.url !== 'https://YOUR_PROJECT_REF.supabase.co' &&
  config.anonKey &&
  config.anonKey !== 'YOUR_ANON_KEY';

const setStatus = (form, message, type = 'neutral') => {
  const noteEl = form.parentElement.querySelector('.form-note');
  if (!noteEl) return;

  noteEl.textContent = message;
  noteEl.classList.remove('is-error', 'is-success');

  if (type === 'success') {
    noteEl.classList.add('is-success');
  }

  if (type === 'error') {
    noteEl.classList.add('is-error');
  }
};

const submitToSupabase = async (email) => {
  if (!isConfigured) {
    throw new Error('Supabase URL and anon key are missing. Add them before testing the waitlist.');
  }

  const payload = { email: email.trim().toLowerCase() };

  const response = await fetch(`${config.url}/rest/v1/waitlist`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify([payload])
  });

  if (!response.ok) {
    const text = await response.text();
    let message = 'The waitlist insert failed.';

    try {
      const parsed = JSON.parse(text);
      message = parsed?.message || message;
    } catch {
      message = text || message;
    }

    if (/duplicate|already exists/i.test(message)) {
      throw new Error('You’re already on the waitlist.');
    }

    if (/row-level security|policy|permission denied|does not exist/i.test(message)) {
      throw new Error('Supabase is blocking the insert. Check the waitlist table and the insert policy in your project.');
    }

    throw new Error(message);
  }

  return true;
};

const handleFormSubmit = async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const email = input.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus(form, 'Please enter a valid email address.', 'error');
    input.focus();
    return;
  }

  button.disabled = true;
  setStatus(form, 'Joining the waitlist...', 'neutral');

  try {
    await submitToSupabase(email);
    setStatus(form, 'You’re on the list. We’ll be in touch soon.', 'success');
    form.reset();
  } catch (error) {
    const message = error?.message || 'Something went wrong. Please try again in a moment.';
    setStatus(form, message, 'error');
    console.error('Waitlist submission failed:', error);
  } finally {
    button.disabled = false;
  }
};

const initWaitlistForms = () => {
  document.querySelectorAll('.waitlist-form').forEach((form) => {
    if (form.dataset.waitlistBound === 'true') return;

    form.dataset.waitlistBound = 'true';
    form.addEventListener('submit', handleFormSubmit);

    let note = form.parentElement.querySelector('.form-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'form-note';
      form.insertAdjacentElement('afterend', note);
    }

    note.setAttribute('aria-live', 'polite');
    note.setAttribute('role', 'status');

    if (!isConfigured) {
      setStatus(form, 'Add your Supabase URL and anon key before testing the form.', 'error');
    } else {
      setStatus(form, 'No spam. One email when Arden is ready to download.', 'neutral');
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWaitlistForms, { once: true });
} else {
  initWaitlistForms();
}
