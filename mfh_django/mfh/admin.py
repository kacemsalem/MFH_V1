from django.contrib import admin
from django.utils.html import format_html
from django.forms.models import BaseInlineFormSet
from django.core.exceptions import ValidationError
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages

from .models import Lot, Client, Notaire, Commercial, Caisse, Dossier, UserProfile


# =====================================================
# FORMSET CAISSE
# =====================================================
class CaisseInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()

        total = 0
        vente_count = 0
        reservation_count = 0

        for form in self.forms:
            if not hasattr(form, "cleaned_data"):
                continue
            if not form.cleaned_data or form.cleaned_data.get("DELETE"):
                continue

            montant = form.cleaned_data.get("montant_recu") or 0
            type_ops = form.cleaned_data.get("type_ops")

            total += montant

            if type_ops == "VENTE":
                vente_count += 1
            if type_ops == "RESERVATION":
                reservation_count += 1

        prix = self.instance.prix_vente or 0

        if reservation_count > 1:
            raise ValidationError("Une seule réservation autorisée.")

        if vente_count > 1:
            raise ValidationError("Une seule vente autorisée.")

        if vente_count == 0 and total >= prix:
            raise ValidationError("Avant vente, total < prix.")

        if vente_count == 1 and total != prix:
            raise ValidationError("Pour valider la vente, total = prix.")


# =====================================================
# INLINE CAISSE
# =====================================================
class CaisseInline(admin.TabularInline):
    model = Caisse
    extra = 0
    formset = CaisseInlineFormSet
    fields = (
        "type_ops",
        "date_caisse",
        "montant_recu",
        "montant_livre",
        "reference_caisse",
        "obs_caisse",
    )


# =====================================================
# DOSSIER ADMIN
# =====================================================
@admin.register(Dossier)
class DossierAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "lot",
        "client",
        "situation_dossier",
        "actif",
        "prix_vente",
        "total_recu",
    )

    list_filter = ("actif", "situation_dossier")
    search_fields = ("client__nom_prenom_client", "lot__n_titre")
    inlines = [CaisseInline]


# =====================================================
# INLINE DOSSIER (sous LOT)
# =====================================================
class DossierInline(admin.TabularInline):
    model = Dossier
    extra = 0
    readonly_fields = ("client", "situation_dossier", "actif")


# =====================================================
# LOT ADMIN
# =====================================================
@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):

    inlines = [DossierInline]

    list_display = (
        "n_titre_bold",
        "ilot",
        "lot",
        "tranche",
        "categorie",
        "surface",
        "situation_display",
    )

    search_fields = ("n_titre", "ilot", "lot")
    list_filter = ("categorie", "tranche")

    fieldsets = (
        ("Identification", {
            "fields": (
                "n_titre",
                "tranche",
                "ilot",
                "lot",
                "categorie",
                "designation",
                "surface",
            )
        }),
    )

    # -------------------------------------------------
    # AFFICHAGE
    # -------------------------------------------------
    def n_titre_bold(self, obj):
        return format_html("<strong>{}</strong>", obj.n_titre) if obj.n_titre else "-"
    n_titre_bold.short_description = "Titre"

    def situation_display(self, obj):
        return obj.situation
    situation_display.short_description = "Situation"

    # -------------------------------------------------
    # RESET LOT
    # -------------------------------------------------
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<int:lot_id>/reset/",
                self.admin_site.admin_view(self.reset_lot),
                name="reset-lot",
            ),
        ]
        return custom_urls + urls

    def reset_lot(self, request, lot_id):
        lot = Lot.objects.get(pk=lot_id)
        lot.dossiers.all().delete()

        messages.success(request, "Le lot a été réinitialisé.")
        return redirect(f"/admin/mfh/lot/{lot_id}/change/")

    def reset_button(self, obj):
        if not obj.pk:
            return ""
        return format_html(
            '<a class="button" href="{}">RESET DOSSIERS</a>',
            f"/admin/mfh/lot/{obj.id}/reset/",
        )

@admin.register(Caisse)
class CaisseAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "dossier",
        "date_caisse",
        "type_ops",
        "montant_recu",
        "montant_livre",
    )

    list_filter = (
        "type_ops",
        "date_caisse",
    )

    search_fields = (
        "dossier__id",
        "reference_caisse",
    )

    ordering = ("-date_caisse",)
# =====================================================
# AUTRES MODELES
# =====================================================
admin.site.register(Client)
admin.site.register(Notaire)
admin.site.register(Commercial)
admin.site.register(UserProfile)
