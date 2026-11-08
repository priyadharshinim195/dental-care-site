"""Populate PostgreSQL with the current website content, contact details, branding and assets.

Idempotent: existing values are never overwritten, so admin edits survive re-running the command.
Pass --force-assets to re-add hero images and the logo when they are missing.
"""
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.case_studies.models import CaseStudy, CaseStudyImage
from apps.common.validators import file_checksum, inspect_image, inspect_logo
from apps.hero_images.models import HeroImage
from apps.website_settings.models import GalleryImage, SiteContent, SiteSettings

SEED_DIR = Path(settings.BASE_DIR) / "seed_assets"

# Website copy, copied verbatim from the original index.html. Used when a field is empty.
CONTENT = [
    ("hero.name", "hero", "Hero: clinic name", "AJITHA"),
    ("hero.sub", "hero", "Hero: subtitle", "DENTAL CARE"),
    ("hero.tagline", "hero", "Hero: tagline", "Your Smile,"),
    ("hero.tagline_accent", "hero", "Hero: tagline (gold)", "Our Signature."),
    ("hero.text", "hero", "Hero: description",
     "Exceptional dental care with a gentle touch and a commitment to confident, healthy smiles."),
    ("about.eyebrow", "about", "About: eyebrow", "About the Clinic"),
    ("about.title", "about", "About: title", "About Ajitha Dental Care"),
    ("about.subhead", "about", "About: subhead", "Healthy Smiles. Brighter Lives."),
    ("about.body", "about", "About: body",
     "At Ajitha Dental Care, we believe every smile tells a story. Our goal is to provide gentle, personalized dental care in a comfortable and welcoming environment. From routine care to advanced treatments, we are here to support your oral health and help you smile with confidence."),
    ("about.feature1.title", "about", "About feature 1: title", "Personalised Attention"),
    ("about.feature1.text", "about", "About feature 1: text", "Care shaped around your questions and goals."),
    ("about.feature2.title", "about", "About feature 2: title", "A Gentle Approach"),
    ("about.feature2.text", "about", "About feature 2: text", "A calm, unhurried experience at every step."),
    ("about.feature3.title", "about", "About feature 3: title", "Oral Health First"),
    ("about.feature3.text", "about", "About feature 3: text", "Supporting healthy smiles for the long term."),
    ("services.eyebrow", "services", "Services: eyebrow", "Our Services"),
    ("services.title", "services", "Services: title", "Comprehensive Dental Care"),
    ("services.sub", "services", "Services: subtitle", "From everyday care to advanced treatments, explore our dental services."),
    ("services.1.title", "services", "Service 1: title", "General Dentistry"),
    ("services.1.text", "services", "Service 1: description", "Routine examinations and everyday dental care to keep your teeth and gums healthy."),
    ("services.2.title", "services", "Service 2: title", "Teeth Cleaning"),
    ("services.2.text", "services", "Service 2: description", "Professional cleaning to remove plaque and build-up and support fresh, healthy gums."),
    ("services.3.title", "services", "Service 3: title", "Cosmetic Dentistry"),
    ("services.3.text", "services", "Service 3: description", "Thoughtful aesthetic options designed around the look you want and your natural features."),
    ("services.4.title", "services", "Service 4: title", "Teeth Whitening"),
    ("services.4.text", "services", "Service 4: description", "Brightening options discussed with you first, so you know what to expect before you begin."),
    ("services.5.title", "services", "Service 5: title", "Root Canal Treatment"),
    ("services.5.text", "services", "Service 5: description", "Careful treatment to relieve discomfort and preserve your natural tooth where possible."),
    ("services.6.title", "services", "Service 6: title", "Dental Implants"),
    ("services.6.text", "services", "Service 6: description", "Restorative options to replace missing teeth, planned with you after a thorough assessment."),
    ("services.7.title", "services", "Service 7: title", "Orthodontic Treatment"),
    ("services.7.text", "services", "Service 7: description", "Guidance on aligning your teeth and bite, with a plan discussed clearly at every stage."),
    ("services.8.title", "services", "Service 8: title", "Preventive Dental Care"),
    ("services.8.text", "services", "Service 8: description", "Regular check-ups and personalised advice to help you protect your smile over time."),
    ("cases.eyebrow", "case-studies", "Case studies: eyebrow", "Case Studies"),
    ("cases.title", "case-studies", "Case studies: title", "Thoughtful Care, Considered"),
    ("cases.sub", "case-studies", "Case studies: subtitle", "Illustrative dental scenarios showing how care may be planned around individual needs."),
    ("why.eyebrow", "why-choose-us", "Why choose us: eyebrow", "Why Choose Us"),
    ("why.title", "why-choose-us", "Why choose us: title", "More Than Just Dental Care"),
    ("why.1.title", "why-choose-us", "Why choose us 1: title", "Patient-Centered Care"),
    ("why.1.text", "why-choose-us", "Why choose us 1: description",
     "Your questions, preferences, and concerns guide every conversation and recommendation."),
    ("why.2.title", "why-choose-us", "Why choose us 2: title", "Comfortable Treatment Experience"),
    ("why.2.text", "why-choose-us", "Why choose us 2: description",
     "A calm, unhurried environment, with each step explained before it begins."),
    ("why.3.title", "why-choose-us", "Why choose us 3: title", "Personalized Dental Care"),
    ("why.3.text", "why-choose-us", "Why choose us 3: description",
     "Plans shaped around your goals, your history, and what matters most to you."),
    ("why.4.title", "why-choose-us", "Why choose us 4: title", "Focus on Oral Health"),
    ("why.4.text", "why-choose-us", "Why choose us 4: description",
     "Prevention and long-term health come first, supporting a lasting, confident smile."),
    ("connect.eyebrow", "connect", "Contact (connect): eyebrow", "Contact"),
    ("connect.title", "connect", "Contact (connect): title", "Speak With Our Team"),
    ("connect.subhead", "connect", "Contact (connect): subhead", "Take the first step towards a healthier, brighter smile."),
    ("connect.text", "connect", "Contact (connect): text",
     "Message us on WhatsApp or call the clinic directly. We will be happy to answer your questions and help you plan your visit."),
    ("connect.script", "connect", "Contact (connect): decorative script (use a new line to break)", "Your Smile\nMatters"),
    ("testimonials.eyebrow", "testimonials", "Testimonials: eyebrow", "Testimonials"),
    ("testimonials.title", "testimonials", "Testimonials: title", "Patient Feedback"),
    ("testimonials.notice", "testimonials", "Testimonials: notice", "Sample content — replace with verified patient feedback"),
    ("gallery.eyebrow", "gallery", "Gallery: eyebrow", "Gallery"),
    ("gallery.title", "gallery", "Gallery: title", "A Glimpse Inside Our Clinic"),
    ("contact.title", "contact", "Contact section: title", "Get In Touch"),
    ("contact.text", "contact", "Contact section: text", "We are here to help you with your dental needs."),
    ("footer.tagline", "footer", "Footer: tagline", "Healthy Smiles  •  Brighter Futures"),
    ("footer.copyright", "footer", "Footer: copyright text", "All rights reserved."),
]

# Existing optional details stay blank; the shared contact number is always populated.
CONFIG_JS = {"address": "", "email": "", "hours": "",
             "maps_url": "https://maps.app.goo.gl/9bKrS4fEmxhuFK5H9?g_st=aw",
             "phone": "+91 73581 99090", "whatsapp_number": "917358199090"}

CASE_FILES = [
    ("case-01", "case-studies/case-1.jpeg", "Case study 01 composite (before and after, original)", ""),
    ("case-02", "case-studies/case-2.webp", "Case study 02 composite (before, process and after, original)",
     "Three-panel composite. Its BEFORE panel shows a dental impression and a model, not a patient photo. Keep the original layout."),
    ("case-03", "case-studies/case-3.webp", "Case study 03 composite (before and after, original)", ""),
    ("case-04", "case-studies/case-4.webp", "Case study 04 composite (before and after, original)", ""),
]
SERVICE_IMAGES = [
    "service-general-dentistry.jpg", "service-teeth-cleaning.jpg", "service-cosmetic-dentistry.jpg",
    "service-teeth-whitening.jpg", "service-root-canal.jpg", "service-dental-implants.jpg",
    "service-orthodontic-treatment.jpg", "service-preventive-care.jpg",
]
HERO_FILES = sorted(p.name for p in (SEED_DIR / "hero").glob("*")) if (SEED_DIR / "hero").exists() else []
GALLERY_DIR = Path(settings.BASE_DIR).parent / "frontend" / "public" / "images"


class Command(BaseCommand):
    help = "Seed the database with the original website content, settings and assets."

    def add_arguments(self, parser):
        parser.add_argument("--force-assets", action="store_true",
                            help="Add seed hero images and logo even if some already exist.")

    def handle(self, *args, **options):
        with transaction.atomic():
            self._seed_settings()
            self._seed_content()
            self._seed_logo(options["force_assets"])
            self._seed_about_image()
            self._seed_hero(options["force_assets"])
            self._seed_services()
            self._seed_gallery()
            self._seed_cases()
        self.stdout.write(self.style.SUCCESS("Seed complete. Existing admin edits were preserved."))

    def _seed_settings(self):
        site = SiteSettings.load()
        changed = False
        for field, value in CONFIG_JS.items():
            if not getattr(site, field):
                setattr(site, field, value)
                changed = True
        if changed:
            site.save()

    def _seed_content(self):
        for key, group, label, default in CONTENT:
            SiteContent.objects.update_or_create(
                key=key,
                defaults={"group": group, "label": label, "default_value": default},
            )

    def _seed_logo(self, force):
        site = SiteSettings.load()
        if site.logo and not force:
            return
        path = SEED_DIR / "branding" / "ajitha-dental-clinic-logo.png"
        if not path.exists():
            self.stdout.write("Logo seed file not found; skipping.")
            return
        with open(path, "rb") as fh:
            upload = File(fh, name=path.name)
            info = inspect_logo(upload)
        with open(path, "rb") as fh:
            site.logo.save(path.name, File(fh), save=False)
        site.logo_width, site.logo_height = info["width"], info["height"]
        site.save()

    def _seed_about_image(self):
        site = SiteSettings.load()
        if site.about_image:
            return
        path = GALLERY_DIR / "about-clinic-01.jpg"
        if not path.exists():
            self.stdout.write("About image seed file not found; skipping.")
            return
        with open(path, "rb") as fh:
            image = File(fh, name=path.name)
            info = inspect_image(image)
        with open(path, "rb") as fh:
            site.about_image.save(path.name, File(fh), save=False)
        site.about_image_width = info["width"]
        site.about_image_height = info["height"]
        site.about_image_original_filename = path.name[:255]
        site.save()

    def _seed_services(self):
        from apps.website_settings.models import Service

        for order, filename in enumerate(SERVICE_IMAGES, start=1):
            service = Service.objects.filter(seed_key=f"starter-{order}").first()
            if service is None:
                continue
            if service.image:
                continue
            path = GALLERY_DIR / filename
            if path.exists():
                with open(path, "rb") as fh:
                    image = File(fh, name=path.name)
                    info = inspect_image(image)
                    digest = file_checksum(image)
                if Service.objects.filter(checksum=digest).exclude(pk=service.pk).exists():
                    self.stdout.write(f"Service image {path.name} is already assigned; skipping.")
                    continue
                service.image_width = info["width"]
                service.image_height = info["height"]
                service.original_filename = path.name[:255]
                service.checksum = digest
                with open(path, "rb") as fh:
                    service.image.save(path.name, File(fh), save=False)
            else:
                self.stdout.write(f"Missing service image {path.name}; service created without an image.")
            service.save()

    def _seed_hero(self, force):
        folder = SEED_DIR / "hero"
        if not folder.exists() or (HeroImage.objects.exists() and not force):
            return
        for path in sorted(folder.iterdir()):
            with open(path, "rb") as fh:
                upload = File(fh, name=path.name)
                info = inspect_image(upload)
                digest = file_checksum(upload)
            if HeroImage.objects.filter(checksum=digest).exists():
                continue
            if HeroImage.objects.count() >= settings.HERO_MAX_IMAGES:
                break
            order = HeroImage.objects.count() + 1
            hero = HeroImage(order=order, is_active=True, alt_text=f"Ajitha Dental Care slideshow image {order}",
                             width=info["width"], height=info["height"], original_filename=path.name[:255],
                             checksum=digest)
            with open(path, "rb") as fh:
                hero.image.save(path.name, File(fh), save=False)
            hero.save()

    def _seed_cases(self):
        for index, (slug, rel_path, alt, note) in enumerate(CASE_FILES, start=1):
            case, created = CaseStudy.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": f"Case Study {index:02d} (title pending clinic approval)",
                    "status": CaseStudy.Status.DRAFT,
                    "order": index,
                    "internal_notes": note,
                },
            )
            if CaseStudyImage.objects.filter(case=case, kind="composite").exists():
                continue
            path = SEED_DIR / rel_path
            if not path.exists():
                self.stdout.write(f"Missing case image {rel_path}; skipping.")
                continue
            with open(path, "rb") as fh:
                upload = File(fh, name=path.name)
                info = inspect_image(upload)
                digest = file_checksum(upload)
            if CaseStudyImage.objects.filter(checksum=digest).exists():
                continue
            image = CaseStudyImage(case=case, kind="composite", alt_text=alt, width=info["width"],
                                   height=info["height"], original_filename=path.name[:255], checksum=digest,
                                   order=1)
            with open(path, "rb") as fh:
                image.image.save(path.name, File(fh), save=False)
            image.save()

    def _seed_gallery(self):
        if GalleryImage.objects.exists():
            return
        for order in range(1, 7):
            path = GALLERY_DIR / f"gallery-{order:02}.jpg"
            if not path.exists():
                self.stdout.write(f"Missing gallery image {path.name}; skipping.")
                continue
            with open(path, "rb") as fh:
                upload = File(fh, name=path.name)
                info = inspect_image(upload)
                digest = file_checksum(upload)
            image = GalleryImage(
                alt_text=f"Ajitha Dental Care gallery photograph {order}",
                width=info["width"], height=info["height"], original_filename=path.name[:255],
                checksum=digest, order=order, is_active=True,
            )
            with open(path, "rb") as fh:
                image.image.save(path.name, File(fh), save=False)
            image.save()
