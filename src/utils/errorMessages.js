const USER_ACTION_ERROR_PATTERN =
  /please enter|enter the 10-digit|must be at least|passwords? do not match|already registered|incorrect password|invalid password|invalid login credentials|account not found|username or email not found|no registered account|not registered|not logged in|order(?: id)?.*(?:did not match|does not match|not found)|phone number.*(?:did not match|does not match)|choose a product and a rating/i;

function getErrorText(error) {
  if (typeof error === 'string') return error;
  return String(error?.message || '');
}

export function getCustomerSupportMessage(isTamil = false) {
  return isTamil
    ? 'தொழில்நுட்பச் சிக்கல் ஏற்பட்டுள்ளது. உதவிக்கு JS Dry Fish-ஐ தொடர்புகொள்ளவும்.'
    : 'A technical issue occurred. Please contact JS Dry Fish for assistance.';
}

export function getCustomerErrorMessage(error, isTamil = false) {
  const message = getErrorText(error);
  return message && USER_ACTION_ERROR_PATTERN.test(message)
    ? message
    : getCustomerSupportMessage(isTamil);
}

export function getAdminSupportMessage() {
  return 'A technical issue occurred. Please contact Samudhra Tech Solutions for support.';
}

export function getAdminErrorMessage(error) {
  const message = getErrorText(error);
  return message && USER_ACTION_ERROR_PATTERN.test(message)
    ? message
    : getAdminSupportMessage();
}
