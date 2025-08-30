class SlotManager {
    constructor(containerId, apiBaseUrl, idSpazio, dataSelezionata, onSlotChangeCallback) {
        this.container = document.getElementById(containerId);
        this.apiBaseUrl = apiBaseUrl;
        this.idSpazio = idSpazio;
        this.dataSelezionata = dataSelezionata;
        this.onSlotChangeCallback = onSlotChangeCallback;
        this.selectedSlots = []; // Array per tenere traccia degli slot selezionati
        this.init();
    }

    init() {
        // NON aggiungere event listener per i click - il vecchio sistema li gestisce
        // this.container.addEventListener('click', this.handleSlotClick.bind(this));
    }

    async loadSlotAvailability() {
        if (!this.idSpazio || !this.dataSelezionata) {
            console.warn('ID Spazio o Data Selezionata non definiti per il caricamento della disponibilità.');
            return;
        }

        // Formatta la data in locale per evitare problemi di timezone
        const year = this.dataSelezionata.getFullYear();
        const month = String(this.dataSelezionata.getMonth() + 1).padStart(2, '0');
        const day = String(this.dataSelezionata.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`; // YYYY-MM-DD
        const url = `${this.apiBaseUrl}/spazi/${this.idSpazio}/disponibilita-slot/${formattedDate}`;

        console.log('🔍 SlotManager - Chiamata API:', { idSpazio: this.idSpazio, data: formattedDate, url });

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('📊 SlotManager - Risposta API:', data);
            this.updateSlotUI(data.data.slots);
        } catch (error) {
            console.error('Errore nel caricamento della disponibilità degli slot:', error);
        }
    }

    updateSlotUI(slotsData) {
        console.log('🎨 SlotManager - Aggiornamento UI slot:', slotsData);

        slotsData.forEach(slot => {
            const button = this.container.querySelector(`[data-orario="${slot.orario}"]`);
            if (button) {
                console.log(`🎨 Aggiornando slot ${slot.orario}: ${slot.status}`);

                // Rimuovi tutte le classi di stato esistenti
                button.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past', 'slot-selected');

                // Aggiungi la classe di stato corretta
                switch (slot.status) {
                    case 'available':
                        button.classList.add('slot-available');
                        button.disabled = false;
                        button.title = 'Slot disponibile';
                        break;
                    case 'booked':
                        button.classList.add('slot-booked');
                        button.disabled = true; // Non selezionabile
                        button.title = slot.title || 'Slot prenotato';
                        break;
                    case 'occupied':
                        button.classList.add('slot-occupied');
                        button.disabled = true; // Non selezionabile
                        button.title = slot.title || 'Slot occupato (in attesa pagamento)';
                        break;
                    case 'past':
                        button.classList.add('slot-past');
                        button.disabled = true; // Non selezionabile
                        button.title = slot.title || 'Slot passato';
                        break;
                    default:
                        button.classList.add('slot-available'); // Default
                        button.disabled = false;
                        button.title = 'Slot disponibile';
                }
                button.dataset.status = slot.status; // Salva lo stato nel dataset

                console.log(`✅ Slot ${slot.orario} aggiornato: classe = slot-${slot.status}`);
            } else {
                console.warn(`⚠️ Bottone non trovato per orario: ${slot.orario}`);
            }
        });
    }

    handleSlotClick(event) {
        const button = event.target.closest('.slot-button');
        if (!button || button.disabled || button.dataset.status === 'booked' || button.dataset.status === 'occupied' || button.dataset.status === 'past') {
            return;
        }

        const orario = button.dataset.orario;
        const slotId = button.dataset.slotId;

        // Se è già selezionato, lo deseleziona
        if (button.classList.contains('slot-selected')) {
            this.resetSelection();
            return;
        }

        // Se non ci sono slot selezionati, questo è l'inizio
        if (this.selectedSlots.length === 0) {
            this.selectedSlots.push({ orario, slotId });
            button.classList.add('slot-selected');
            button.classList.remove(`slot-${button.dataset.status}`);

            // Mostra messaggio per selezionare la fine
            this.showTimeSelectionMessage('Seleziona ora l\'orario di fine');

            // Chiama il callback anche per il primo slot
            if (this.onSlotChangeCallback) {
                this.onSlotChangeCallback(this.selectedSlots);
            }
        } else if (this.selectedSlots.length === 1) {
            // Questo è la fine
            const orarioInizio = parseInt(this.selectedSlots[0].orario.split(':')[0]);
            const orarioFine = parseInt(orario.split(':')[0]);

            if (orarioFine <= orarioInizio) {
                this.showError('L\'orario di fine deve essere successivo all\'orario di inizio');
                return;
            }

            // Seleziona tutti gli slot tra inizio e fine
            this.selectTimeRange(this.selectedSlots[0].orario, orario);

            // Chiama il callback per aggiornare l'UI
            if (this.onSlotChangeCallback) {
                this.onSlotChangeCallback(this.selectedSlots);
            }
        }
    }

    selectTimeRange(orarioInizio, orarioFine) {
        const startHour = parseInt(orarioInizio.split(':')[0]);
        const endHour = parseInt(orarioFine.split(':')[0]);

        // Seleziona tutti gli slot tra inizio e fine
        for (let hour = startHour; hour <= endHour; hour++) {
            const orario = `${String(hour).padStart(2, '0')}:00`;
            const button = this.container.querySelector(`[data-orario="${orario}"]`);

            if (button && !button.disabled && button.dataset.status !== 'booked' && button.dataset.status !== 'occupied' && button.dataset.status !== 'past') {
                const slotId = button.dataset.slotId;

                // Aggiungi solo se non è già selezionato
                if (!this.selectedSlots.find(s => s.orario === orario)) {
                    this.selectedSlots.push({ orario, slotId });
                }

                button.classList.add('slot-selected');
                button.classList.remove(`slot-${button.dataset.status}`);
            }
        }

        // Ordina gli slot selezionati
        this.selectedSlots.sort((a, b) => a.orario.localeCompare(b.orario));
    }

    showTimeSelectionMessage(message) {
        // Implementa la logica per mostrare il messaggio
        console.log('💬 Messaggio:', message);
    }

    showError(message) {
        // Implementa la logica per mostrare l'errore
        console.error('❌ Errore:', message);
    }

    getSelectedTimeRange() {
        if (this.selectedSlots.length === 0) {
            return { start: null, end: null };
        }
        const start = this.selectedSlots[0].orario;
        // La fine è l'inizio dell'ultimo slot selezionato + 1 ora
        const lastSlotHour = parseInt(this.selectedSlots[this.selectedSlots.length - 1].orario.split(':')[0]);
        const endHour = lastSlotHour + 1;
        const end = `${String(endHour).padStart(2, '0')}:00`;
        return { start, end };
    }

    resetSelection() {
        this.selectedSlots = [];
        this.container.querySelectorAll('.slot-button').forEach(button => {
            button.classList.remove('slot-selected');
            // Ripristina la classe di stato originale se presente nel dataset
            if (button.dataset.status) {
                button.classList.add(`slot-${button.dataset.status}`);
            }
        });
        if (this.onSlotChangeCallback) {
            this.onSlotChangeCallback(this.selectedSlots);
        }
    }

    // Metodo per pulire l'istanza del SlotManager
    cleanup() {
        console.log('🧹 SlotManager - Pulizia istanza');
        this.selectedSlots = [];
        // Non c'è bisogno di rimuovere event listener perché non li aggiungiamo
    }
}

// Rendi SlotManager disponibile globalmente
window.SlotManager = SlotManager;