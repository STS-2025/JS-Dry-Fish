import React, { useState } from 'react';

/**
 * Reusable Password Input with Show / Hide Eye Toggle Icon
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Enter password',
  required = false,
  minLength,
  autoComplete,
  className = '',
  name,
  style
}) {
  const [show, setShow] = useState(false);

  return (
    <div className={`password-input-wrapper ${className}`.trim()} style={style}>
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShow(prev => !prev)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15.7 15.7 0 01-3.1 3.8M6.2 6.2C3.9 7.7 3 12 3 12s3.5 7 9 7a10.7 10.7 0 004.1-.8" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
