// Dates are WordPress local times stored as UTC, so format in UTC to show the same day.
export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
