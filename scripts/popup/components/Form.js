export function createForm(formData, onSubmit) {
    const form = document.createElement('form');
    form.innerHTML = formData;

    form.onsubmit = async (event) => {
        event.preventDefault();
        if (onSubmit) await onSubmit(form);
    };

    return form;
}
