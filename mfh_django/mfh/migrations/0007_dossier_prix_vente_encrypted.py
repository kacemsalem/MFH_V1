"""
Migration 0007: encrypt prix_vente
  1. Add a temporary CharField prix_vente_enc
  2. Encrypt existing data into prix_vente_enc
  3. Remove old DecimalField prix_vente
  4. Rename prix_vente_enc → prix_vente
"""
import os
from django.db import migrations, models


def encrypt_existing(apps, schema_editor):
    key = os.environ.get("PRIX_VENTE_KEY", "").strip()
    if not key:
        return  # No key configured — leave field empty (dev without encryption)
    try:
        from cryptography.fernet import Fernet
        f = Fernet(key.encode())
    except Exception:
        return

    Dossier = apps.get_model("mfh", "Dossier")
    for d in Dossier.objects.all():
        raw = d.prix_vente_old  # DecimalField still accessible via this name
        if raw is not None:
            encrypted = f.encrypt(str(raw).encode()).decode()
            d.prix_vente_enc = encrypted
            d.save(update_fields=["prix_vente_enc"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("mfh", "0006_commercial_user_userprofile"),
    ]

    operations = [
        # Step 1: rename old DecimalField to prix_vente_old (temporary)
        migrations.RenameField(
            model_name="dossier",
            old_name="prix_vente",
            new_name="prix_vente_old",
        ),
        # Step 2: add new CharField
        migrations.AddField(
            model_name="dossier",
            name="prix_vente_enc",
            field=models.CharField(blank=True, max_length=300, null=True),
        ),
        # Step 3: data migration — encrypt existing values
        migrations.RunPython(encrypt_existing, noop),
        # Step 4: remove old DecimalField
        migrations.RemoveField(
            model_name="dossier",
            name="prix_vente_old",
        ),
        # Step 5: rename encrypted field to prix_vente
        migrations.RenameField(
            model_name="dossier",
            old_name="prix_vente_enc",
            new_name="prix_vente",
        ),
    ]
