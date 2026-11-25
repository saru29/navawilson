export const PATTERNS: Partial<Record<string, string>> = {
  email: '[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}',
  tel: '\\+?[0-9 \\(\\)\\.\\-]{10,30}',
};

const EMAIL = new RegExp(`^${PATTERNS.email}$`);
const MESSAGES = {
  email: 'Enter a valid email address, like name@example.com.',
  tel: 'Enter a valid phone number with area code, like (416) 321-1100.',
};

const problem = (el: HTMLInputElement) => {
  const value = el.value.trim();
  if (!value) return '';
  if (el.type === 'email') return EMAIL.test(value) ? '' : MESSAGES.email;
  const digits = value.replace(/\D/g, '').length;
  return /^\+?[\d ().-]+$/.test(value) && digits >= 10 && digits <= 15 ? '' : MESSAGES.tel;
};

const check = (el: EventTarget | null) => {
  if (el instanceof HTMLInputElement && (el.type === 'email' || el.type === 'tel')) el.setCustomValidity(problem(el));
};

export function validateEmailAndPhone() {
  document.addEventListener('input', (e) => check(e.target));
  document.addEventListener('focusout', (e) => check(e.target));
  document.querySelectorAll('input[type="email"], input[type="tel"]').forEach(check);
}
