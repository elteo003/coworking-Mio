// Gestione Sedi e Spazi per Gestori
class GestioneSedi {
    constructor() {
        this.sedi = [];
        this.spazi = [];
        this.servizi = [];
        this.currentSede = null;
        this.init();
    }

    async init() {
        await this.loadSedi();
        await this.loadServizi();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event listeners per i pulsanti
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="crea-sede"]')) {
                this.showCreaSedeModal();
            } else if (e.target.matches('[data-action="modifica-sede"]')) {
                this.showModificaSedeModal(e.target.dataset.id);
            } else if (e.target.matches('[data-action="elimina-sede"]')) {
                this.eliminaSede(e.target.dataset.id);
            } else if (e.target.matches('[data-action="crea-spazio"]')) {
                this.showCreaSpazioModal(e.target.dataset.sedeId);
            } else if (e.target.matches('[data-action="modifica-spazio"]')) {
                this.showModificaSpazioModal(e.target.dataset.id);
            } else if (e.target.matches('[data-action="elimina-spazio"]')) {
                this.eliminaSpazio(e.target.dataset.id);
            }
        });

        // Event listeners per i form
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'sedeForm') {
                e.preventDefault();
                this.handleSedeForm(e.target);
            } else if (e.target.id === 'spazioForm') {
                e.preventDefault();
                this.handleSpazioForm(e.target);
            } else if (e.target.id === 'serviziForm') {
                e.preventDefault();
                const spazioId = e.target.dataset.spazioId;
                this.handleServiziForm(e.target, spazioId);
            }
        });
    }

    async handleSedeForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Controlla se è una modifica o creazione
        const isEdit = form.dataset.sedeId;

        const success = await this.salvaSede(data, isEdit);
        if (success) {
            // Chiudi il modal
            const modal = form.closest('.modal');
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
        }
    }

    async handleSpazioForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Aggiungi l'ID sede
        data.id_sede = this.currentSede.id_sede;

        // Controlla se è una modifica o creazione
        const isEdit = form.dataset.spazioId;

        const success = await this.salvaSpazio(data, isEdit);
        if (success) {
            // Chiudi il modal
            const modal = form.closest('.modal');
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
        }
    }

    async loadSedi() {
        try {
            const response = await fetch('/api/gestore/sedi', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.sedi = await response.json();
                this.renderSedi();
            } else {
                console.error('Errore nel caricamento delle sedi');
            }
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    async loadServizi() {
        try {
            const response = await fetch('/api/servizi');
            if (response.ok) {
                this.servizi = await response.json();
            }
        } catch (error) {
            console.error('Errore nel caricamento dei servizi:', error);
        }
    }

    renderSedi() {
        const container = document.getElementById('sediContainer');
        if (!container) return;

        if (this.sedi.length === 0) {
            container.innerHTML = `
        <div class="text-center py-5">
          <i class="fas fa-building fa-3x text-muted mb-3"></i>
          <h4 class="text-muted">Nessuna sede trovata</h4>
          <p class="text-muted">Inizia creando la tua prima sede</p>
          <button class="btn btn-primary" data-action="crea-sede">
            <i class="fas fa-plus me-2"></i>Crea Sede
          </button>
        </div>
      `;
            return;
        }

        container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3><i class="fas fa-building me-2"></i>Le Mie Sedi</h3>
        <button class="btn btn-primary" data-action="crea-sede">
          <i class="fas fa-plus me-2"></i>Nuova Sede
        </button>
      </div>
      <div class="row">
        ${this.sedi.map(sede => this.renderSedeCard(sede)).join('')}
      </div>
    `;
    }

    renderSedeCard(sede) {
        // Immagini di esempio per le sedi (in produzione verranno dal database)
        const sampleImages = [
            {
                src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
                title: sede.nome,
                description: sede.descrizione || `${sede.citta} - ${sede.indirizzo}`
            },
            {
                src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
                title: 'Spazi Moderni',
                description: 'Ambienti di lavoro contemporanei e funzionali'
            },
            {
                src: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
                title: 'Aree Comuni',
                description: 'Zone relax e networking per i nostri membri'
            }
        ];

        return `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100 overflow-hidden">
          <!-- Carosello Immersivo -->
          <div class="immersive-carousel" 
               style="height: 250px;" 
               data-autoplay="true" 
               data-autoplay-delay="4000"
               data-show-arrows="true" 
               data-show-dots="true"
               data-enable-hover="true"
               data-enable-keyboard="true"
               data-enable-touch="true">
            ${sampleImages.map(img => `
              <img src="${img.src}" 
                   alt="${img.title}" 
                   data-title="${img.title}"
                   data-description="${img.description}"
                   loading="lazy">
            `).join('')}
          </div>
          
          <div class="card-body">
            <h5 class="card-title">${sede.nome}</h5>
            <p class="card-text">
              <i class="fas fa-map-marker-alt me-2 text-muted"></i>
              ${sede.citta}
            </p>
            <p class="card-text">
              <i class="fas fa-address-card me-2 text-muted"></i>
              ${sede.indirizzo}
            </p>
            ${sede.descrizione ? `<p class="card-text text-muted">${sede.descrizione}</p>` : ''}
          </div>
          <div class="card-footer">
            <div class="btn-group w-100" role="group">
              <button class="btn btn-outline-primary btn-sm" data-action="modifica-sede" data-id="${sede.id_sede}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-success btn-sm" onclick="gestioneSedi.loadSpazi(${sede.id_sede})">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" data-action="elimina-sede" data-id="${sede.id_sede}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    async loadSpazi(sedeId) {
        try {
            const response = await fetch(`/api/sedi/${sedeId}/spazi`);
            if (response.ok) {
                this.spazi = await response.json();
                this.currentSede = this.sedi.find(s => s.id_sede == sedeId);
                this.renderSpazi();
            }
        } catch (error) {
            console.error('Errore nel caricamento degli spazi:', error);
        }
    }

    renderSpazi() {
        const container = document.getElementById('spaziContainer');
        if (!container) return;

        container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3><i class="fas fa-door-open me-2"></i>Spazi - ${this.currentSede.nome}</h3>
        <div>
          <button class="btn btn-outline-secondary me-2" onclick="gestioneSedi.renderSedi()">
            <i class="fas fa-arrow-left me-2"></i>Torna alle Sedi
          </button>
          <button class="btn btn-primary" data-action="crea-spazio" data-sede-id="${this.currentSede.id_sede}">
            <i class="fas fa-plus me-2"></i>Nuovo Spazio
          </button>
        </div>
      </div>
      <div class="row">
        ${this.spazi.map(spazio => this.renderSpazioCard(spazio)).join('')}
      </div>
    `;
    }

    renderSpazioCard(spazio) {
        const tipologiaIcon = {
            'stanza privata': 'fas fa-door-closed',
            'postazione': 'fas fa-desktop',
            'sala riunioni': 'fas fa-users'
        };

        // Immagini specifiche per tipologia di spazio
        const getSpazioImages = (tipologia) => {
            const imageSets = {
                'stanza privata': [
                    {
                        src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
                        title: 'Ufficio Privato',
                        description: 'Spazio riservato per lavoro concentrato'
                    },
                    {
                        src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
                        title: 'Ambiente Tranquillo',
                        description: 'Silenzio e privacy garantiti'
                    }
                ],
                'postazione': [
                    {
                        src: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
                        title: 'Postazione Moderna',
                        description: 'Setup completo per il tuo lavoro'
                    },
                    {
                        src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
                        title: 'Area Condivisa',
                        description: 'Ambiente dinamico e collaborativo'
                    }
                ],
                'sala riunioni': [
                    {
                        src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
                        title: 'Sala Riunioni',
                        description: 'Spazio per meeting e presentazioni'
                    },
                    {
                        src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
                        title: 'Tecnologia Avanzata',
                        description: 'Attrezzature per videoconferenze'
                    },
                    {
                        src: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
                        title: 'Capienza Flessibile',
                        description: `Fino a ${spazio.capienza || 10} persone`
                    }
                ]
            };

            return imageSets[tipologia] || imageSets['postazione'];
        };

        const spazioImages = getSpazioImages(spazio.tipologia);

        return `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100 overflow-hidden">
          <!-- Carosello Immersivo per Spazio -->
          <div class="immersive-carousel" 
               style="height: 200px;" 
               data-autoplay="true" 
               data-autoplay-delay="3500"
               data-show-arrows="true" 
               data-show-dots="true"
               data-enable-hover="true"
               data-enable-keyboard="true"
               data-enable-touch="true">
            ${spazioImages.map(img => `
              <img src="${img.src}" 
                   alt="${img.title}" 
                   data-title="${img.title}"
                   data-description="${img.description}"
                   loading="lazy">
            `).join('')}
          </div>
          
          <div class="card-body">
            <h5 class="card-title">
              <i class="${tipologiaIcon[spazio.tipologia] || 'fas fa-door-open'} me-2"></i>
              ${spazio.nome}
            </h5>
            <p class="card-text">
              <span class="badge bg-primary">${spazio.tipologia}</span>
            </p>
            ${spazio.capienza ? `<p class="card-text"><i class="fas fa-users me-2 text-muted"></i>Capienza: ${spazio.capienza}</p>` : ''}
            ${spazio.descrizione ? `<p class="card-text text-muted">${spazio.descrizione}</p>` : ''}
          </div>
          <div class="card-footer">
            <div class="btn-group w-100" role="group">
              <button class="btn btn-outline-primary btn-sm" data-action="modifica-spazio" data-id="${spazio.id_spazio}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-info btn-sm" onclick="gestioneSedi.gestisciServizi(${spazio.id_spazio})">
                <i class="fas fa-cogs"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" data-action="elimina-spazio" data-id="${spazio.id_spazio}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    showCreaSedeModal() {
        const modal = this.createModal('Crea Nuova Sede', this.getSedeForm());
        const form = modal.querySelector('#sedeForm');
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Inizializza l'upload delle immagini dopo che il modal è mostrato
        bsModal._element.addEventListener('shown.bs.modal', () => {
            if (window.s3ImageManager) {
                window.s3ImageManager.createUploadElement('sedeImagesContainer', (imageData, fileName) => {
                    console.log('✅ Immagine sede caricata:', imageData);
                    // Salva l'immagine per il salvataggio finale
                    if (!form.dataset.images) {
                        form.dataset.images = JSON.stringify([]);
                    }
                    const images = JSON.parse(form.dataset.images);
                    images.push(imageData);
                    form.dataset.images = JSON.stringify(images);
                });
            }
        });

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    showModificaSedeModal(sedeId) {
        const sede = this.sedi.find(s => s.id_sede == sedeId);
        const modal = this.createModal('Modifica Sede', this.getSedeForm(sede));
        const form = modal.querySelector('#sedeForm');
        form.dataset.sedeId = sedeId;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Inizializza l'upload delle immagini dopo che il modal è mostrato
        bsModal._element.addEventListener('shown.bs.modal', () => {
            if (window.s3ImageManager) {
                // Carica le immagini esistenti
                this.loadExistingImages('sede', sedeId, 'sedeImagesContainer');
                
                window.s3ImageManager.createUploadElement('sedeImagesContainer', (imageData, fileName) => {
                    console.log('✅ Immagine sede caricata:', imageData);
                    // Salva l'immagine per il salvataggio finale
                    if (!form.dataset.images) {
                        form.dataset.images = JSON.stringify([]);
                    }
                    const images = JSON.parse(form.dataset.images);
                    images.push(imageData);
                    form.dataset.images = JSON.stringify(images);
                });
            }
        });

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    showCreaSpazioModal(sedeId) {
        const modal = this.createModal('Crea Nuovo Spazio', this.getSpazioForm(sedeId));
        const form = modal.querySelector('#spazioForm');
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Inizializza l'upload delle immagini dopo che il modal è mostrato
        bsModal._element.addEventListener('shown.bs.modal', () => {
            if (window.s3ImageManager) {
                window.s3ImageManager.createUploadElement('spazioImagesContainer', (imageData, fileName) => {
                    console.log('✅ Immagine spazio caricata:', imageData);
                    // Salva l'immagine per il salvataggio finale
                    if (!form.dataset.images) {
                        form.dataset.images = JSON.stringify([]);
                    }
                    const images = JSON.parse(form.dataset.images);
                    images.push(imageData);
                    form.dataset.images = JSON.stringify(images);
                });
            }
        });

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    showModificaSpazioModal(spazioId) {
        const spazio = this.spazi.find(s => s.id_spazio == spazioId);
        const modal = this.createModal('Modifica Spazio', this.getSpazioForm(spazio.id_sede, spazio));
        const form = modal.querySelector('#spazioForm');
        form.dataset.spazioId = spazioId;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Inizializza l'upload delle immagini dopo che il modal è mostrato
        bsModal._element.addEventListener('shown.bs.modal', () => {
            if (window.s3ImageManager) {
                // Carica le immagini esistenti
                this.loadExistingImages('spazio', spazioId, 'spazioImagesContainer');
                
                window.s3ImageManager.createUploadElement('spazioImagesContainer', (imageData, fileName) => {
                    console.log('✅ Immagine spazio caricata:', imageData);
                    // Salva l'immagine per il salvataggio finale
                    if (!form.dataset.images) {
                        form.dataset.images = JSON.stringify([]);
                    }
                    const images = JSON.parse(form.dataset.images);
                    images.push(imageData);
                    form.dataset.images = JSON.stringify(images);
                });
            }
        });

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    // Carica le immagini esistenti per sede o spazio
    async loadExistingImages(type, parentId, containerId) {
        try {
            if (window.s3ImageManager) {
                const images = await window.s3ImageManager.getImages(type, parentId);
                const container = document.getElementById(containerId);
                
                if (images.length > 0) {
                    // Crea la griglia delle immagini esistenti
                    const imageGrid = document.createElement('div');
                    imageGrid.className = 'image-grid';
                    imageGrid.innerHTML = images.map(img => `
                        <div class="image-grid-item">
                            <img src="${img.url}" alt="${img.alt_text || ''}" loading="lazy">
                            <div class="overlay">
                                <button class="btn btn-sm" onclick="gestioneSedi.removeExistingImage('${img.id}', '${type}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                    
                    container.appendChild(imageGrid);
                }
            }
        } catch (error) {
            console.error('Errore caricamento immagini esistenti:', error);
        }
    }

    // Rimuovi immagine esistente
    async removeExistingImage(imageId, type) {
        if (confirm('Sei sicuro di voler eliminare questa immagine?')) {
            try {
                if (window.s3ImageManager) {
                    await window.s3ImageManager.deleteImageMetadata(imageId, type);
                    // Ricarica la sezione immagini
                    const container = document.getElementById(type === 'sede' ? 'sedeImagesContainer' : 'spazioImagesContainer');
                    const imageGrid = container.querySelector('.image-grid');
                    if (imageGrid) {
                        imageGrid.remove();
                    }
                }
            } catch (error) {
                console.error('Errore eliminazione immagine:', error);
                alert('Errore durante l\'eliminazione dell\'immagine');
            }
        }
    }

    getSedeForm(sede = null) {
        return `
      <form id="sedeForm">
        <div class="mb-3">
          <label for="nome" class="form-label">Nome Sede *</label>
          <input type="text" class="form-control" id="nome" name="nome" value="${sede?.nome || ''}" required>
        </div>
        <div class="mb-3">
          <label for="citta" class="form-label">Città *</label>
          <input type="text" class="form-control" id="citta" name="citta" value="${sede?.citta || ''}" required>
        </div>
        <div class="mb-3">
          <label for="indirizzo" class="form-label">Indirizzo *</label>
          <input type="text" class="form-control" id="indirizzo" name="indirizzo" value="${sede?.indirizzo || ''}" required>
        </div>
        <div class="mb-3">
          <label for="descrizione" class="form-label">Descrizione</label>
          <textarea class="form-control" id="descrizione" name="descrizione" rows="3">${sede?.descrizione || ''}</textarea>
        </div>
        <div class="mb-3">
          <label class="form-label">Immagini</label>
          <div id="sedeImagesContainer"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
          <button type="submit" class="btn btn-primary">
            ${sede ? 'Modifica' : 'Crea'} Sede
          </button>
        </div>
      </form>
    `;
    }

    getSpazioForm(sedeId, spazio = null) {
        return `
      <form id="spazioForm">
        <div class="mb-3">
          <label for="nome" class="form-label">Nome Spazio *</label>
          <input type="text" class="form-control" id="nome" name="nome" value="${spazio?.nome || ''}" required>
        </div>
        <div class="mb-3">
          <label for="tipologia" class="form-label">Tipologia *</label>
          <select class="form-select" id="tipologia" name="tipologia" required>
            <option value="">Seleziona tipologia</option>
            <option value="stanza privata" ${spazio?.tipologia === 'stanza privata' ? 'selected' : ''}>Stanza Privata</option>
            <option value="postazione" ${spazio?.tipologia === 'postazione' ? 'selected' : ''}>Postazione</option>
            <option value="sala riunioni" ${spazio?.tipologia === 'sala riunioni' ? 'selected' : ''}>Sala Riunioni</option>
          </select>
        </div>
        <div class="mb-3">
          <label for="capienza" class="form-label">Capienza</label>
          <input type="number" class="form-control" id="capienza" name="capienza" value="${spazio?.capienza || ''}" min="1">
        </div>
        <div class="mb-3">
          <label for="descrizione" class="form-label">Descrizione</label>
          <textarea class="form-control" id="descrizione" name="descrizione" rows="3">${spazio?.descrizione || ''}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
          <button type="submit" class="btn btn-primary">
            ${spazio ? 'Modifica' : 'Crea'} Spazio
          </button>
        </div>
      </form>
    `;
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `;
        return modal;
    }

    async salvaSede(formData, sedeId = null) {
        try {
            const url = sedeId ? `/api/gestore/sedi/${sedeId}` : '/api/gestore/sedi';
            const method = sedeId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                await this.loadSedi();
                this.showAlert('Sede salvata con successo!', 'success');
                return true;
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Errore nel salvataggio', 'danger');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showAlert('Errore di connessione', 'danger');
        }
        return false;
    }

    async salvaSpazio(formData, spazioId = null) {
        try {
            const url = spazioId ? `/api/gestore/spazi/${spazioId}` : '/api/gestore/spazi';
            const method = spazioId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                await this.loadSpazi(this.currentSede.id_sede);
                this.showAlert('Spazio salvato con successo!', 'success');
                return true;
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Errore nel salvataggio', 'danger');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showAlert('Errore di connessione', 'danger');
        }
        return false;
    }

    async eliminaSede(sedeId) {
        if (!confirm('Sei sicuro di voler eliminare questa sede?')) return;

        try {
            const response = await fetch(`/api/gestore/sedi/${sedeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                await this.loadSedi();
                this.showAlert('Sede eliminata con successo!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Errore nell\'eliminazione', 'danger');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showAlert('Errore di connessione', 'danger');
        }
    }

    async eliminaSpazio(spazioId) {
        if (!confirm('Sei sicuro di voler eliminare questo spazio?')) return;

        try {
            const response = await fetch(`/api/gestore/spazi/${spazioId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                await this.loadSpazi(this.currentSede.id_sede);
                this.showAlert('Spazio eliminato con successo!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Errore nell\'eliminazione', 'danger');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showAlert('Errore di connessione', 'danger');
        }
    }

    async gestisciServizi(spazioId) {
        try {
            // Carica servizi associati allo spazio
            const response = await fetch(`/api/spazi/${spazioId}/servizi`);
            const serviziAssociati = response.ok ? await response.json() : [];

            // Carica tutti i servizi disponibili
            const allServizi = this.servizi;

            const modal = this.createModal('Gestisci Servizi', this.getServiziForm(spazioId, allServizi, serviziAssociati));
            const form = modal.querySelector('#serviziForm');
            form.dataset.spazioId = spazioId;
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        } catch (error) {
            console.error('Errore nel caricamento dei servizi:', error);
            this.showAlert('Errore nel caricamento dei servizi', 'danger');
        }
    }

    getServiziForm(spazioId, allServizi, serviziAssociati) {
        const serviziAssociatiIds = serviziAssociati.map(s => s.id_servizio);

        return `
            <form id="serviziForm">
                <div class="mb-3">
                    <h6>Servizi Disponibili</h6>
                    <div class="row">
                        ${allServizi.map(servizio => `
                            <div class="col-md-6 mb-2">
                                <div class="form-check">
                                    <input class="form-check-input" 
                                           type="checkbox" 
                                           name="servizi" 
                                           value="${servizio.id_servizio}" 
                                           id="servizio_${servizio.id_servizio}"
                                           ${serviziAssociatiIds.includes(servizio.id_servizio) ? 'checked' : ''}>
                                    <label class="form-check-label" for="servizio_${servizio.id_servizio}">
                                        <strong>${servizio.nome}</strong>
                                        ${servizio.descrizione ? `<br><small class="text-muted">${servizio.descrizione}</small>` : ''}
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                    <button type="submit" class="btn btn-primary">Salva Servizi</button>
                </div>
            </form>
        `;
    }

    async handleServiziForm(form, spazioId) {
        const formData = new FormData(form);
        const selectedServizi = formData.getAll('servizi').map(id => parseInt(id));

        try {
            // Prima rimuovi tutti i servizi associati
            const response = await fetch(`/api/spazi/${spazioId}/servizi`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const serviziAttuali = await response.json();
                for (const servizio of serviziAttuali) {
                    await fetch(`/api/spazi/${spazioId}/servizi/${servizio.id_servizio}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                }
            }

            // Poi aggiungi i servizi selezionati
            for (const servizioId of selectedServizi) {
                await fetch('/api/spazi/servizi', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        id_spazio: spazioId,
                        id_servizio: servizioId
                    })
                });
            }

            this.showAlert('Servizi aggiornati con successo!', 'success');
            return true;
        } catch (error) {
            console.error('Errore:', error);
            this.showAlert('Errore nell\'aggiornamento dei servizi', 'danger');
            return false;
        }
    }

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

        document.body.appendChild(alert);

        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.gestioneSedi = new GestioneSedi();
});
