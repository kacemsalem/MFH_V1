from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mfh", "0008_alter_userprofile_role"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dossier",
            name="prix_vente",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12, null=True),
        ),
    ]
