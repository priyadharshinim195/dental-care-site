from django.db import migrations, models
import django.core.validators


def update_existing_defaults(apps, schema_editor):
    SiteSettings = apps.get_model("website_settings", "SiteSettings")
    settings = SiteSettings.objects.filter(pk=1)
    settings.filter(brand_name="AJITHA DENTAL CARE").update(brand_name="AJITHA DENTAL CLINIC")
    settings.filter(logo_alt="AJITHA DENTAL CARE logo").update(logo_alt="AJITHA DENTAL CLINIC logo")
    settings.filter(hero_interval_ms=2500).update(hero_interval_ms=2000)
    settings.filter(hero_fade_ms=700).update(hero_fade_ms=400)


def restore_existing_defaults(apps, schema_editor):
    SiteSettings = apps.get_model("website_settings", "SiteSettings")
    settings = SiteSettings.objects.filter(pk=1)
    settings.filter(brand_name="AJITHA DENTAL CLINIC").update(brand_name="AJITHA DENTAL CARE")
    settings.filter(logo_alt="AJITHA DENTAL CLINIC logo").update(logo_alt="AJITHA DENTAL CARE logo")
    settings.filter(hero_interval_ms=2000).update(hero_interval_ms=2500)
    settings.filter(hero_fade_ms=400).update(hero_fade_ms=700)


class Migration(migrations.Migration):

    dependencies = [
        ("website_settings", "0002_galleryimage_testimonial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="brand_name",
            field=models.CharField(default="AJITHA DENTAL CLINIC", max_length=120),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="logo_alt",
            field=models.CharField(default="AJITHA DENTAL CLINIC logo", max_length=200),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="hero_interval_ms",
            field=models.PositiveIntegerField(
                default=2000,
                help_text="Time each image stays on screen.",
                validators=[
                    django.core.validators.MinValueValidator(1200),
                    django.core.validators.MaxValueValidator(10000),
                ],
            ),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="hero_fade_ms",
            field=models.PositiveIntegerField(
                default=400,
                help_text="Crossfade duration between images.",
                validators=[
                    django.core.validators.MinValueValidator(200),
                    django.core.validators.MaxValueValidator(2000),
                ],
            ),
        ),
        migrations.RunPython(update_existing_defaults, restore_existing_defaults),
    ]
