const config = {
  url: window.SUPABASE_URL || 'https://ihhiephldzihqjzapjit.supabase.co',
  anonKey: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGllcGhsZHppaHFqemFwaml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjg0ODAsImV4cCI6MjEwNDkwNDQ4MH0.vPNwliWZEx8KEVdsuTyKkPo9neijI7IWi0Rd51HCICs'
};

const isConfigured =
  config.url &&
  config.url !== 'https://YOUR_PROJECT_REF.supabase.co' &&
  config.anonKey &&
  config.anonKey !== 'YOUR_ANON_KEY';

const supabase =
  isConfigured && window.supabase
    ? window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

const readSupabaseError = (error) => {
  if (!error) return 'Unknown error while saving the waitlist.';

  if (error.message && /row-level security|permission denied|policy/i.test(error.message)) {
    return 'Supabase is blocking the insert. Make sure the waitlist table has an insert policy for anonymous users.';
  }

  if (error.message && /does not exist|relation .* does not exist|table .* does not exist/i.test(error.message)) {
    return 'The waitlist table does not exist yet. Run the SQL in Supabase first.';
  }

  return error.message || 'Something went wrong while joining the waitlist.';
};

const setStatus = (form, message, type = 'neutral') => {
  const statusEl = form.querySelector('.form-status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.classList.remove('is-error', 'is-success');

  if (type === 'success') {
    statusEl.classList.add('is-success');
  }

  if (type === 'error') {
    statusEl.classList.add('is-error');
  }
};

const submitToSupabase = async (email) => {
  if (!isConfigured) {
    throw new Error('Supabase is not configured yet. Add your URL and anon key in script.js or set window.SUPABASE_URL / window.SUPABASE_ANON_KEY.');
  }

  const payload = { email: email.trim().toLowerCase() };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('waitlist').insert([payload]).select();

      if (error) {
        if (error.code === '23505' || /duplicate|already exists/i.test(error.message)) {
          throw new Error('You’re already on the waitlist.');
        }

        console.error('Supabase insert error:', error);
        throw new Error(readSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.warn('Supabase client insert failed, retrying with direct REST API.', error);
    }
  }

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
      throw new Error('Supabase is blocking the insert. Check the waitlist table and RLS policy in your project.');
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

window.addEventListener('load', () => {
  if (!window.supabase) {
    document.querySelectorAll('.waitlist-form').forEach((form) => {
      setStatus(form, 'Supabase script did not load. Check the CDN and project URL.', 'error');
    });
  }
});

document.querySelectorAll('.waitlist-form').forEach((form) => {
  form.addEventListener('submit', handleFormSubmit);

  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('role', 'status');
  form.appendChild(status);

  if (!isConfigured) {
    setStatus(form, 'Add your Supabase URL and anon key before testing the form.', 'error');
  }
});
