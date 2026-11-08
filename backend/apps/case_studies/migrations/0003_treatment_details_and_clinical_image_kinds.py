from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("case_studies", "0002_remove_casestudyimage_one_single_image_per_kind_per_case_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="casestudy",
            name="treatment_details",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="casestudyimage",
            name="kind",
            field=models.CharField(
                choices=[
                    ("composite", "Composite (original image shown unchanged)"),
                    ("before", "Before"),
                    ("after", "After"),
                    ("xray", "X-ray"),
                    ("surgery", "During surgery"),
                    ("process", "Process"),
                ],
                max_length=20,
            ),
        ),
    ]
