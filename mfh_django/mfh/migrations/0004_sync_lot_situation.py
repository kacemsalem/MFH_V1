from django.db import migrations


def sync_lot_situation(apps, schema_editor):
    Lot = apps.get_model("mfh", "Lot")
    Dossier = apps.get_model("mfh", "Dossier")

    for lot in Lot.objects.all():
        actifs = Dossier.objects.filter(lot=lot, actif=True)
        if actifs.filter(situation_dossier="VENTE").exists():
            new_sit = "VENDU"
        elif actifs.filter(situation_dossier="RESERVATION").exists():
            new_sit = "RESERVE"
        else:
            new_sit = "LIBRE"
        if lot.situation != new_sit:
            Lot.objects.filter(pk=lot.pk).update(situation=new_sit)


class Migration(migrations.Migration):

    dependencies = [
        ("mfh", "0003_fix_desistement_actif"),
    ]

    operations = [
        migrations.RunPython(sync_lot_situation, reverse_code=migrations.RunPython.noop),
    ]
