export const PATTERNS: Partial<Record<string, string>> = {
  email: '[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}',
  tel: '(\\+?1[ \\-\\.]?)?\\(?[0-9]{3}\\)?[ \\-\\.]?[0-9]{3}[ \\-\\.]?[0-9]{4}',
};

const EMAIL = new RegExp(`^${PATTERNS.email}$`);
const MESSAGES = {
  email: 'Enter a valid email address, like name@example.com.',
  tel: 'Enter a 10-digit phone number, like (416) 321-1100.',
};

// Canadian and US area codes never start with 1, so a leading 1 is the country code.
const phoneDigits = (value: string) => value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);

const formatPhone = (d: string) =>
  d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d ? `(${d}` : '';

const reformat = (el: HTMLInputElement) => {
  const caretDigits = phoneDigits(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
  const formatted = formatPhone(phoneDigits(el.value));
  if (formatted === el.value) return;
  el.value = formatted;
  let caret = 0;
  for (let seen = 0; caret < formatted.length && seen < caretDigits; caret++) if (/\d/.test(formatted[caret])) seen++;
  if (document.activeElement === el) el.setSelectionRange(caret, caret);
};

const problem = (el: HTMLInputElement) => {
  const value = el.value.trim();
  if (!value) return '';
  if (el.type === 'email') return EMAIL.test(value) ? '' : MESSAGES.email;
  return phoneDigits(value).length === 10 ? '' : MESSAGES.tel;
};

const check = (el: EventTarget | null) => {
  if (!(el instanceof HTMLInputElement) || (el.type !== 'email' && el.type !== 'tel')) return;
  if (el.type === 'tel') reformat(el);
  el.setCustomValidity(problem(el));
};

export function validateEmailAndPhone() {
  document.addEventListener('input', (e) => check(e.target));
  document.addEventListener('focusout', (e) => check(e.target));
  document.querySelectorAll('input[type="email"], input[type="tel"]').forEach(check);
}
