export const FIRM_NAME = 'Nava Wilson PC';
export const PHONE = '(416) 321-1100';
export const PHONE_HREF = 'tel:+14163211100';
export const FAX = '(416) 321-1107';
export const EMAIL = 'info@navawilson.law';
export const ADDRESS_LINES = ['10 Milner Business Court, Suite 210', 'Toronto, ON, M1B 3C6'];
export const MAP_URL = 'https://maps.app.goo.gl/vdgrBur6t14fzVzk9';

export const GOOGLE_REVIEWS_URL =
  'https://www.google.com/search?q=nava+wilson+llp#lrd=0x89d4d0e50e3cdacf:0x3287858e2fe20910,1,,,';

export const GTM_ID = 'GTM-M6H6DWP';
// Web3Forms key for info@navawilson.law; empty shows an email button instead of the form.
export const WEB3FORMS_ACCESS_KEY = '';

export type NavLink = { label: string; href: string; children?: NavLink[] };

export const PRACTICE_AREAS: NavLink[] = [
  {
    label: 'Real Estate Law',
    href: '/real-estate-lawyers/',
    children: [
      { label: 'Buying a Property in the GTA', href: '/buying-a-property/' },
      { label: 'Selling a Home', href: '/selling-a-property/' },
      { label: 'Refinancing a Property in Ontario', href: '/refinancing-a-property/' },
      { label: 'Commercial Real Estate', href: '/commercial-real-estate/' },
    ],
  },
  {
    label: 'Litigation',
    href: '/litigation-lawyerss/',
    children: [
      { label: 'Landlord and Tenant Board', href: '/landlord-and-tenant-board/' },
      { label: 'Commercial Litigation', href: '/commercial-litigation/' },
      { label: 'Small Claims Court', href: '/small-claims-court/' },
      { label: 'Real Estate Breaches', href: '/real-estate-breaches/' },
    ],
  },
  { label: 'Wills and Estates', href: '/wills-and-estates/' },
  {
    label: 'Corporate Law',
    href: '/corporate-lawyers/',
    children: [
      { label: 'Incorporation', href: '/get-incorporated-in-ontario/' },
      { label: 'Starting a New Business', href: '/start-a-new-business/' },
      { label: 'Purchase and Sale of a Business', href: '/purchase-and-sale-of-a-business/' },
    ],
  },
];

export const NAV: NavLink[] = [
  { label: 'About Us', href: '/about-us/' },
  { label: 'Blogs', href: '/blogs/' },
];

export const FOOTER_SERVICES: NavLink[] = [
  { label: 'Real Estate Law', href: '/real-estate-lawyers/' },
  { label: 'Corporate Law', href: '/corporate-lawyers/' },
  { label: 'Litigation', href: '/litigation-lawyerss/' },
  { label: 'Wills and Estates', href: '/wills-and-estates/' },
];

export const FOOTER_RESOURCES: NavLink[] = [
  { label: 'About Us', href: '/about-us/' },
  { label: 'Blogs', href: '/blogs/' },
  { label: 'Retainer Policy', href: '/retainer-policy/' },
  { label: 'Terms of Use', href: '/terms-of-use/' },
  { label: 'Privacy Policy', href: '/privacy-policy-2/' },
  { label: 'Know Your Client', href: '/know-your-client/' },
];

export const SERVICE_OPTIONS = ['Real Estate Law', 'Corporate Law', 'Litigation', 'Immigration Law', 'Wills and Estates', 'Other'];
export const REFERRAL_OPTIONS = ['Real Estate Agent', 'Social Media', 'Radio', 'Family or Friends', 'Google'];

// Tabler Icons (MIT), stroke="currentColor".
export const SOCIALS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/navawilson.law',
    path: 'M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/navawilson.law/',
    path: 'M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0 M16.5 7.5v.01',
  },
  {
    label: 'LinkedIn',
    href: 'https://ca.linkedin.com/company/navawilson',
    path: 'M8 11v5 M8 8v.01 M12 16v-5 M16 16v-3a2 2 0 1 0 -4 0 M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UCiXh9HdXG4o79y1Lp-t_DRw',
    path: 'M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8z M10 9l5 3l-5 3z',
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@navawilson.law',
    path: 'M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z',
  },
];
