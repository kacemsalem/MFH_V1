from rest_framework import serializers
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from .models import Client, Notaire, Commercial, Lot, Dossier, Caisse


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"


class NotaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notaire
        fields = "__all__"


class CommercialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commercial
        fields = "__all__"


class LotSerializer(serializers.ModelSerializer):
    # Situation calculée depuis les dossiers (priorité sur le champ stocké)
    situation = serializers.SerializerMethodField()

    def get_situation(self, obj):
        return getattr(obj, "situation_reelle", obj.situation)

    class Meta:
        model = Lot
        fields = "__all__"


class DossierSerializer(serializers.ModelSerializer):
    # Champs calculés (lecture seule)
    total_recu      = serializers.SerializerMethodField()
    total_livre     = serializers.SerializerMethodField()
    montant_restant = serializers.SerializerMethodField()
    solde_caisse    = serializers.SerializerMethodField()
    # Labels affichage
    lot_display        = serializers.SerializerMethodField()
    client_display     = serializers.SerializerMethodField()
    notaire_display    = serializers.SerializerMethodField()
    commercial_display = serializers.SerializerMethodField()

    class Meta:
        model = Dossier
        fields = "__all__"

    def get_total_recu(self, obj):
        return str(obj.total_recu)

    def get_total_livre(self, obj):
        return str(obj.total_livre)

    def get_montant_restant(self, obj):
        return str(obj.montant_restant)

    def get_solde_caisse(self, obj):
        return str(obj.solde_caisse)

    def get_lot_display(self, obj):
        try:
            l = obj.lot
            if not l:
                return f"Lot #{obj.lot_id}"
            titre = f" [{l.n_titre}]" if l.n_titre else ""
            return f"Îlot {l.ilot} - Lot {l.lot} (Tr.{l.tranche}){titre}"
        except Exception:
            return f"Lot #{obj.lot_id}"

    def get_client_display(self, obj):
        try:
            c = obj.client
            return c.nom_prenom_client if c else ""
        except Exception:
            return f"Client #{obj.client_id}"

    def get_notaire_display(self, obj):
        try:
            n = obj.notaire
            return n.nom_prenom_not if n else ""
        except Exception:
            return f"Notaire #{obj.notaire_id}"

    def get_commercial_display(self, obj):
        try:
            cm = obj.commercial
            return cm.nom_prenom if cm else ""
        except Exception:
            return f"Commercial #{obj.commercial_id}"

    # Conversion ValidationError Django → DRF (400 au lieu de 500)
    def _wrap(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except DjangoValidationError as e:
            msgs = e.message_dict if hasattr(e, "message_dict") else {"non_field_errors": e.messages}
            raise DRFValidationError(msgs)
        except IntegrityError as e:
            raise DRFValidationError({"non_field_errors": [str(e)]})

    def create(self, validated_data):
        return self._wrap(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._wrap(super().update, instance, validated_data)


class CaisseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caisse
        fields = "__all__"

    def _wrap(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except DjangoValidationError as e:
            msgs = e.message_dict if hasattr(e, "message_dict") else {"non_field_errors": e.messages}
            raise DRFValidationError(msgs)
        except IntegrityError as e:
            raise DRFValidationError({"non_field_errors": [str(e)]})

    def create(self, validated_data):
        return self._wrap(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._wrap(super().update, instance, validated_data)
