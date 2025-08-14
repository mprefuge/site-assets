export function createModal(content, onClose) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            ${content}
        </div>
    `;

    document.body.appendChild(modal);

    const closeButton = modal.querySelector('.close-button');
    closeButton.onclick = () => {
        modal.style.display = 'none';
        if (onClose) onClose();
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            if (onClose) onClose();
        }
    };

    return modal;
}

export function showModal(modal) {
    modal.style.display = 'flex';
}

export function hideModal(modal) {
    modal.style.display = 'none';
}
