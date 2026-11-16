const CUSTOMER_PROFILE_KEY = 'atf_customer_profile';
const CUSTOMER_SESSION_KEY = 'atf_customer_session';

export function getCustomerProfile() {
  try {
    // 1. Try reading active customer session first
    const sessionRaw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session && typeof session === 'object' && session.phone) {
        return {
          id: session.id,
          name: String(session.name || ''),
          phone: String(session.phone || '').replace(/\D/g, '').slice(-10),
          pincode: String(session.pincode || '').replace(/\D/g, '').slice(0, 6),
          city: String(session.city || ''),
          address: String(session.address || '')
        };
      }
    }

    // 2. Fall back to saved local profile
    const saved = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    if (!saved) return null;

    const profile = JSON.parse(saved);
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return null;

    return {
      name: String(profile.name || ''),
      phone: String(profile.phone || '').replace(/\D/g, '').slice(-10),
      pincode: String(profile.pincode || '').replace(/\D/g, '').slice(0, 6),
      city: String(profile.city || ''),
      address: String(profile.address || '')
    };
  } catch (error) {
    console.error('Failed to read customer profile from this device', error);
    return null;
  }
}

export function saveCustomerProfile(profile) {
  try {
    const clean = {
      name: String(profile.name || '').trim(),
      phone: String(profile.phone || '').replace(/\D/g, '').slice(-10),
      pincode: String(profile.pincode || '').replace(/\D/g, '').slice(0, 6),
      city: String(profile.city || '').trim(),
      address: String(profile.address || '').trim()
    };
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(clean));

    // Also update active session if phone matches
    const sessionRaw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session && session.phone === clean.phone) {
        localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify({ ...session, ...clean }));
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to save customer profile on this device', error);
    return false;
  }
}
