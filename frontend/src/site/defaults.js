/* Original website copy and settings. These mirror the original index.html and config.js.
   They are used when the API is unreachable, and as the "reset to default" values in admin.
   Keep them in step with backend/apps/website_settings/management/commands/seed_site.py. */

export const DEFAULT_SETTINGS = {
  brand_name: "AJITHA DENTAL CARE",
  logo_url: "",
  logo_alt: "AJITHA DENTAL CARE logo",
  address: "",
  phone: "+91 73581 99090",
  email: "",
  hours: "",
  maps_url: "https://maps.app.goo.gl/9bKrS4fEmxhuFK5H9?g_st=aw",
  whatsapp_number: "917358199090",
  seo_title: "Ajitha Dental Care | Your Smile, Our Signature",
  seo_description:
    "Ajitha Dental Care: exceptional dental care with a gentle touch and a commitment to confident, healthy smiles.",
  social_links: [],
  hero_interval_ms: 2000,
  hero_fade_ms: 400,
  section_order: ["about", "services", "case-studies", "why-choose-us", "connect", "testimonials", "gallery", "contact"],
  section_visibility: {
    about: true, services: true, "case-studies": true, "why-choose-us": true,
    connect: true, testimonials: true, gallery: true, contact: true,
  },
};

export const DEFAULT_CONTENT = {
  "hero.name": "AJITHA",
  "hero.sub": "DENTAL CARE",
  "hero.tagline": "Your Smile,",
  "hero.tagline_accent": "Our Signature.",
  "hero.text": "Exceptional dental care with a gentle touch and a commitment to confident, healthy smiles.",
  "about.eyebrow": "About the Clinic",
  "about.title": "About Ajitha Dental Care",
  "about.subhead": "Healthy Smiles. Brighter Lives.",
  "about.body":
    "At Ajitha Dental Care, Tiruverkadu, Chennai, we are dedicated to creating healthy, confident smiles through compassionate and personalised dental care.With 15+ years of experience and specialised expertise in Orthodontics, we combine modern dental technology, clinical excellence, and patient-focused treatment to ensure every visit is comfortable and reassuring.From routine dental check-ups to advanced treatments, we offer comprehensive care tailored to every patient's needs.",
  
  "about.feature1.title": "Personalised Attention",
  "about.feature1.text": "Care shaped around your questions and goals.",
  "about.feature2.title": "A Gentle Approach",
  "about.feature2.text": "A calm, unhurried experience at every step.",
  "about.feature3.title": "Oral Health First",
  "about.feature3.text": "Supporting healthy smiles for the long term.",
  "services.eyebrow": "Our Services",
  "services.title": "Comprehensive Dental Care",
  "services.sub": "From everyday care to advanced treatments, explore our dental services.",
  "services.1.title": "General Dentistry",
  "services.1.text": "Routine examinations and everyday dental care to keep your teeth and gums healthy.",
  "services.2.title": "Teeth Cleaning",
  "services.2.text": "Professional cleaning to remove plaque and build-up and support fresh, healthy gums.",
  "services.3.title": "Cosmetic Dentistry",
  "services.3.text": "Thoughtful aesthetic options designed around the look you want and your natural features.",
  "services.4.title": "Teeth Whitening",
  "services.4.text": "Brightening options discussed with you first, so you know what to expect before you begin.",
  "services.5.title": "Root Canal Treatment",
  "services.5.text": "Careful treatment to relieve discomfort and preserve your natural tooth where possible.",
  "services.6.title": "Dental Implants",
  "services.6.text": "Restorative options to replace missing teeth, planned with you after a thorough assessment.",
  "services.7.title": "Orthodontic Treatment",
  "services.7.text": "Guidance on aligning your teeth and bite, with a plan discussed clearly at every stage.",
  "services.8.title": "Preventive Dental Care",
  "services.8.text": "Regular check-ups and personalised advice to help you protect your smile over time.",
  "cases.eyebrow": "Case Studies",
  "cases.title": "Thoughtful Care, Considered",
  "cases.sub": "Illustrative dental scenarios showing how care may be planned around individual needs.",
  "why.eyebrow": "Why Choose Us",
  "why.title": "More Than Just Dental Care",
  "why.1.title": "Patient-Centered Care",
  "why.1.text": "Your questions, preferences, and concerns guide every conversation and recommendation.",
  "why.2.title": "Comfortable Treatment Experience",
  "why.2.text": "A calm, unhurried environment, with each step explained before it begins.",
  "why.3.title": "Personalized Dental Care",
  "why.3.text": "Plans shaped around your goals, your history, and what matters most to you.",
  "why.4.title": "Focus on Oral Health",
  "why.4.text": "Prevention and long-term health come first, supporting a lasting, confident smile.",
  "connect.eyebrow": "Contact",
  "connect.title": "Speak With Our Team",
  "connect.subhead": "Take the first step towards a healthier, brighter smile.",
  "connect.text":
    "Message us on WhatsApp or call the clinic directly. We will be happy to answer your questions and help you plan your visit.",
  "connect.script": "Your Smile\nMatters",
  "testimonials.eyebrow": "Testimonials",
  "testimonials.title": "Patient Feedback",
  "testimonials.notice": "Sample content — replace with verified patient feedback",
  "gallery.eyebrow": "Gallery",
  "gallery.title": "A Glimpse Inside Our Clinic",
  "contact.title": "Get In Touch",
  "contact.text": "We are here to help you with your dental needs.",
  "footer.tagline": "Healthy Smiles  •  Brighter Futures",
  "footer.copyright": "All rights reserved.",
};

export const FALLBACK_HERO = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `fallback-${n}`,
  url: `/images/hero-fallback/hero-0${n}.jpg`,
  alt: `Ajitha Dental Care slideshow image ${n}`,
  width: null,
  height: null,
}));

export const SERVICES = [
  { img: "service-general-dentistry.jpg", alt: "General Dentistry service", title: "General Dentistry", text: "Routine examinations and everyday dental care to keep your teeth and gums healthy." },
  { img: "service-teeth-cleaning.jpg", alt: "Teeth Cleaning service", title: "Teeth Cleaning", text: "Professional cleaning to remove plaque and build-up and support fresh, healthy gums." },
  { img: "service-cosmetic-dentistry.jpg", alt: "Cosmetic Dentistry service", title: "Cosmetic Dentistry", text: "Thoughtful aesthetic options designed around the look you want and your natural features." },
  { img: "service-teeth-whitening.jpg", alt: "Teeth Whitening service", title: "Teeth Whitening", text: "Brightening options discussed with you first, so you know what to expect before you begin." },
  { img: "service-root-canal.jpg", alt: "Root Canal Treatment service", title: "Root Canal Treatment", text: "Careful treatment to relieve discomfort and preserve your natural tooth where possible." },
  { img: "service-dental-implants.jpg", alt: "Dental Implants service", title: "Dental Implants", text: "Restorative options to replace missing teeth, planned with you after a thorough assessment." },
  { img: "service-orthodontic-treatment.jpg", alt: "Orthodontic Treatment service", title: "Orthodontic Treatment", text: "Guidance on aligning your teeth and bite, with a plan discussed clearly at every stage." },
  { img: "service-preventive-care.jpg", alt: "Preventive Dental Care service", title: "Preventive Dental Care", text: "Regular check-ups and personalised advice to help you protect your smile over time." },
];

export const GALLERY = [1, 2, 3, 4, 5, 6].map((n) => ({
  src: `/images/gallery-0${n}.jpg`,
  alt: `Ajitha Dental Care gallery photograph ${n}`,
}));

/* Sample feedback from the original testimonials.js. These are placeholders, not patient reviews. */
export const TESTIMONIALS = [
  { displayName: "Sample Feedback 01", quote: "Placeholder for an approved patient review about their consultation experience." },
  { displayName: "Sample Feedback 02", quote: "Placeholder for an approved patient review about the clinic environment and staff." },
  { displayName: "Sample Feedback 03", quote: "Placeholder for an approved patient review about their treatment and follow-up experience." },
];
