from django import forms
from .models import Lot

class LotForm(forms.ModelForm):
    class Meta:
        model = Lot
        fields = "__all__"
        widgets = {
            "obs_lot": forms.Textarea(attrs={"rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        for name, field in self.fields.items():
            # textarea
            if isinstance(field.widget, forms.Textarea):
                field.widget.attrs.update({"class": "form-control"})
            # select
            elif isinstance(field.widget, forms.Select):
                field.widget.attrs.update({"class": "form-select"})
            else:
                field.widget.attrs.update({"class": "form-control"})

   
        self.fields['situation'].widget.attrs['readonly'] = True