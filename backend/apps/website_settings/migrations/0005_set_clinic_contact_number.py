from django.db import migrations, models
import django.core.validators


def set_clinic_contact_number(apps, schema_editor):
    SiteSettings = apps.get_model("website_settings", "SiteSettings")
    SiteSettings.objects.filter(pk=1).update(
        phone="+91 73581 99090",
        whatsapp_number="917358199090",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("website_settings", "0004_dental_care_branding"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="phone",
            field=models.CharField(blank=True, default="+91 73581 99090", max_length=40),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="whatsapp_number",
            field=models.CharField(
                blank=True,
                default="917358199090",
                max_length=20,
                validators=[
                    django.core.validators.RegexValidator(
                        r"^\d{8,15}$",
                        "Use digits only, including the country code, e.g. 919876543210.",
                    ),
                ],
            ),
        ),
        migrations.RunPython(set_clinic_contact_number, migrations.RunPython.noop),
    ]
