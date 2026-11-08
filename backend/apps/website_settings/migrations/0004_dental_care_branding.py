from django.db import migrations, models


def update_default_branding(apps, schema_editor):
    SiteSettings = apps.get_model("website_settings", "SiteSettings")
    SiteContent = apps.get_model("website_settings", "SiteContent")
    HeroImage = apps.get_model("hero_images", "HeroImage")
    GalleryImage = apps.get_model("website_settings", "GalleryImage")

    SiteSettings.objects.filter(pk=1, brand_name="AJITHA DENTAL CLINIC").update(
        brand_name="AJITHA DENTAL CARE")
    SiteSettings.objects.filter(pk=1, logo_alt="AJITHA DENTAL CLINIC logo").update(
        logo_alt="AJITHA DENTAL CARE logo")
    SiteSettings.objects.filter(pk=1, seo_title="Ajitha Dental Clinic | Your Smile, Our Signature").update(
        seo_title="Ajitha Dental Care | Your Smile, Our Signature")
    SiteSettings.objects.filter(
        pk=1,
        seo_description=("Ajitha Dental Clinic: exceptional dental care with a gentle touch and a "
                         "commitment to confident, healthy smiles."),
    ).update(
        seo_description=("Ajitha Dental Care: exceptional dental care with a gentle touch and a "
                         "commitment to confident, healthy smiles.")
    )

    for key, old_value, new_value in (
        ("hero.sub", "DENTAL CLINIC", "DENTAL CARE"),
        ("about.title", "About Ajitha Dental Clinic", "About Ajitha Dental Care"),
        (
            "about.body",
            ("At Ajitha Dental Clinic, we believe every smile tells a story. Our goal is to provide gentle, "
             "personalized dental care in a comfortable and welcoming environment. From routine care to "
             "advanced treatments, we are here to support your oral health and help you smile with confidence."),
            ("At Ajitha Dental Care, we believe every smile tells a story. Our goal is to provide gentle, "
             "personalized dental care in a comfortable and welcoming environment. From routine care to "
             "advanced treatments, we are here to support your oral health and help you smile with confidence."),
        ),
    ):
        SiteContent.objects.filter(key=key, default_value=old_value).update(default_value=new_value)
        SiteContent.objects.filter(key=key, value=old_value).update(value=new_value)

    for image in HeroImage.objects.filter(alt_text__startswith="Ajitha Dental Clinic slideshow image"):
        image.alt_text = image.alt_text.replace("Ajitha Dental Clinic", "Ajitha Dental Care", 1)
        image.save(update_fields=["alt_text"])
    for image in GalleryImage.objects.filter(alt_text__startswith="Ajitha Dental Clinic gallery photograph"):
        image.alt_text = image.alt_text.replace("Ajitha Dental Clinic", "Ajitha Dental Care", 1)
        image.save(update_fields=["alt_text"])


def restore_default_branding(apps, schema_editor):
    SiteSettings = apps.get_model("website_settings", "SiteSettings")
    SiteContent = apps.get_model("website_settings", "SiteContent")
    HeroImage = apps.get_model("hero_images", "HeroImage")
    GalleryImage = apps.get_model("website_settings", "GalleryImage")

    SiteSettings.objects.filter(pk=1, brand_name="AJITHA DENTAL CARE").update(
        brand_name="AJITHA DENTAL CLINIC")
    SiteSettings.objects.filter(pk=1, logo_alt="AJITHA DENTAL CARE logo").update(
        logo_alt="AJITHA DENTAL CLINIC logo")
    SiteSettings.objects.filter(pk=1, seo_title="Ajitha Dental Care | Your Smile, Our Signature").update(
        seo_title="Ajitha Dental Clinic | Your Smile, Our Signature")
    SiteSettings.objects.filter(
        pk=1,
        seo_description=("Ajitha Dental Care: exceptional dental care with a gentle touch and a "
                         "commitment to confident, healthy smiles."),
    ).update(
        seo_description=("Ajitha Dental Clinic: exceptional dental care with a gentle touch and a "
                         "commitment to confident, healthy smiles.")
    )

    for key, old_value, new_value in (
        ("hero.sub", "DENTAL CARE", "DENTAL CLINIC"),
        ("about.title", "About Ajitha Dental Care", "About Ajitha Dental Clinic"),
        (
            "about.body",
            ("At Ajitha Dental Care, we believe every smile tells a story. Our goal is to provide gentle, "
             "personalized dental care in a comfortable and welcoming environment. From routine care to "
             "advanced treatments, we are here to support your oral health and help you smile with confidence."),
            ("At Ajitha Dental Clinic, we believe every smile tells a story. Our goal is to provide gentle, "
             "personalized dental care in a comfortable and welcoming environment. From routine care to "
             "advanced treatments, we are here to support your oral health and help you smile with confidence."),
        ),
    ):
        SiteContent.objects.filter(key=key, default_value=old_value).update(default_value=new_value)
        SiteContent.objects.filter(key=key, value=old_value).update(value=new_value)

    for image in HeroImage.objects.filter(alt_text__startswith="Ajitha Dental Care slideshow image"):
        image.alt_text = image.alt_text.replace("Ajitha Dental Care", "Ajitha Dental Clinic", 1)
        image.save(update_fields=["alt_text"])
    for image in GalleryImage.objects.filter(alt_text__startswith="Ajitha Dental Care gallery photograph"):
        image.alt_text = image.alt_text.replace("Ajitha Dental Care", "Ajitha Dental Clinic", 1)
        image.save(update_fields=["alt_text"])


class Migration(migrations.Migration):

    dependencies = [
        ("website_settings", "0003_branding_and_hero_defaults"),
        ("hero_images", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="brand_name",
            field=models.CharField(default="AJITHA DENTAL CARE", max_length=120),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="logo_alt",
            field=models.CharField(default="AJITHA DENTAL CARE logo", max_length=200),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="seo_title",
            field=models.CharField(default="Ajitha Dental Care | Your Smile, Our Signature", max_length=160),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="seo_description",
            field=models.CharField(
                default=("Ajitha Dental Care: exceptional dental care with a gentle touch and a "
                         "commitment to confident, healthy smiles."),
                max_length=300,
            ),
        ),
        migrations.RunPython(update_default_branding, restore_default_branding),
    ]
