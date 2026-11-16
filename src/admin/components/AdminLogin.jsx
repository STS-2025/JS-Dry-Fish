import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../supabase';
import { getAdminErrorMessage } from '../../utils/errorMessages';
import logo from '../../assets/js-dry-fish-shop-logo.png';

export default function AdminLogin({ onLogin, initialError }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (!supabase || !isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Add the Supabase URL and anon key to the app environment.');
      }

      let email = null;
      const cleanUsername = username.trim();

      if (cleanUsername.includes('@')) {
        email = cleanUsername.toLowerCase();
      } else {
        const { data: lookedUpEmail, error: usernameError } = await supabase.rpc('admin_login_email', {
          p_username: cleanUsername
        });
        if (usernameError) {
          throw new Error(`Unable to look up the admin account: ${usernameError.message}`);
        }
        email = lookedUpEmail;
      }

      if (!email) {
        throw new Error('Admin username or email not found.');
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message?.toLowerCase().includes('email logins are disabled') || signInError.code === 'email_provider_disabled') {
          throw new Error('Supabase Error: Email provider is disabled! In Supabase Dashboard -> Authentication -> Providers -> Email, please turn ON "Enable Email provider" and click Save.');
        }
        if (signInError.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('Supabase Error: Admin email is not confirmed. In Supabase Dashboard -> Authentication -> Users, click on the admin user and select "Confirm email".');
        }
        if (signInError.message?.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid password. Please check your admin password.');
        }
        throw new Error(`Login failed: ${signInError.message}`);
      }
      if (!data.session) {
        throw new Error('Supabase did not create an admin session.');
      }

      const { data: isAdmin, error: authorizationError } = await supabase.rpc('admin_is_authorized');
      if (authorizationError || !isAdmin) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw new Error(`Admin access was denied, and the Supabase session could not be cleared: ${signOutError.message}`);
        }
        if (authorizationError) {
          throw new Error(`Unable to verify admin access: ${authorizationError.message}`);
        }
        throw new Error('This account authenticated, but is not linked to admin_user (auth_user_id) or authorized for the admin dashboard.');
      }

      onLogin(data.session.access_token);
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <a className="admin-back-link" href="/">← Back to shop</a>
        <div className="admin-login-brand">
          <img className="admin-login-logo" src={logo} alt="" />
          <div className="admin-login-brand-meta">
            <span className="admin-eyebrow">JS DRY FISH SHOP</span>
            <span className="admin-login-badge">ADMIN PORTAL</span>
          </div>
        </div>
        <div className="admin-login-title-group">
          <h1>Welcome back</h1>
          <p>Sign in to manage products, customer orders, stock and store settings.</p>
        </div>

        <label htmlFor="admin-username">Admin username or email</label>
        <input
          id="admin-username"
          type="text"
          autoComplete="username"
          value={username}
          placeholder="Enter username or email"
          onChange={event => setUsername(event.target.value)}
          required
        />
        <label htmlFor="admin-password">Admin password</label>
        <div className="admin-password-control">
          <input
            id="admin-password"
            className="admin-password-input"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            placeholder="Enter password"
            onChange={event => setPassword(event.target.value)}
            required
          />
          <button
            className="admin-password-toggle"
            type="button"
            onClick={() => setShowPassword(visible => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15.7 15.7 0 01-3.1 3.8M6.2 6.2C3.9 7.7 3 12 3 12s3.5 7 9 7a10.7 10.7 0 004.1-.8" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
        {(error || initialError) && <div className="admin-alert" role="alert">{error || initialError}</div>}
        <button className="admin-primary-button" disabled={busy}>
          {busy ? 'Please wait…' : 'Sign in securely'}
        </button>
        <small className="admin-login-security-note">
          Sign-in is verified by Supabase.
        </small>
      </form>
    </main>
  );
}
