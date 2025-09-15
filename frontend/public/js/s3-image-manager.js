// Gestione Immagini con S3 Supabase Storage
class S3ImageManager {
    constructor() {
        this.s3Endpoint = 'https://czkiuvmhijhxuqzdtnmz.storage.supabase.co/storage/v1/s3';
        this.bucketName = 'Immagini';
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg']; // Solo JPG per la policy
        this.accessKeyId = '';
        this.secretAccessKey = '';
        this.init();
    }

    async init() {
        // Carica le credenziali dal backend
        await this.loadCredentials();
    }

    // Carica le credenziali S3 dal backend
    async loadCredentials() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/config/storage-credentials`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const credentials = await response.json();
                this.accessKeyId = credentials.accessKeyId;
                this.secretAccessKey = credentials.secretAccessKey;
                console.log('✅ Credenziali S3 caricate');
            } else {
                console.error('❌ Errore caricamento credenziali S3');
            }
        } catch (error) {
            console.error('❌ Errore caricamento credenziali S3:', error);
        }
    }

    // Valida il file
    validateFile(file) {
        if (!this.allowedTypes.includes(file.type)) {
            throw new Error('Tipo di file non supportato. Usa solo file JPG/JPEG.');
        }
        
        if (file.size > this.maxFileSize) {
            throw new Error('File troppo grande. Massimo 5MB.');
        }
        
        return true;
    }

    // Genera nome file unico
    generateFileName(originalName, prefix = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = originalName.split('.').pop().toLowerCase();
        
        // Assicurati che l'estensione sia .jpg per la policy
        const finalExtension = extension === 'jpeg' ? 'jpg' : extension;
        
        // Carica sempre nella cartella "public" per la policy
        return `public/${prefix}${timestamp}_${random}.${finalExtension}`;
    }

    // Genera signature AWS per l'upload
    generateSignature(method, url, headers, body = '') {
        // Implementazione semplificata per Supabase S3
        // In produzione, usa una libreria AWS SDK o implementa HMAC-SHA256
        const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const date = timestamp.substr(0, 8);
        
        // Per ora, usiamo un approccio semplificato
        // In produzione, implementa la firma AWS completa
        return {
            'X-Amz-Date': timestamp,
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${this.accessKeyId}/${date}/us-east-1/s3/aws4_request`,
            'X-Amz-SignedHeaders': 'host;x-amz-date'
        };
    }

    // Carica immagine su S3 Supabase
    async uploadImage(file, folder = '') {
        try {
            this.validateFile(file);
            
            if (!this.accessKeyId || !this.secretAccessKey) {
                throw new Error('Credenziali S3 non configurate');
            }

            const fileName = this.generateFileName(file.name, folder ? `${folder}/` : '');
            const url = `${this.s3Endpoint}/${this.bucketName}/${fileName}`;
            
            // Per Supabase S3, usiamo un approccio semplificato
            // In produzione, implementa la firma AWS completa
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessKeyId}`,
                    'Content-Type': file.type
                },
                body: file
            });

            if (!response.ok) {
                throw new Error(`Errore upload: ${response.status} ${response.statusText}`);
            }

            // Costruisci URL pubblico
            const publicUrl = `${this.s3Endpoint}/${this.bucketName}/${fileName}`;

            return {
                fileName,
                url: publicUrl,
                path: `${this.bucketName}/${fileName}`
            };
        } catch (error) {
            console.error('Errore upload immagine S3:', error);
            throw error;
        }
    }

    // Elimina immagine da S3 Supabase
    async deleteImage(fileName) {
        try {
            if (!this.accessKeyId || !this.secretAccessKey) {
                throw new Error('Credenziali S3 non configurate');
            }

            const url = `${this.s3Endpoint}/${this.bucketName}/${fileName}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessKeyId}`
                }
            });

            if (!response.ok) {
                throw new Error(`Errore eliminazione: ${response.status} ${response.statusText}`);
            }

            return true;
        } catch (error) {
            console.error('Errore eliminazione immagine S3:', error);
            throw error;
        }
    }

    // Salva metadati immagine nel database
    async saveImageMetadata(imageData, type, parentId, altText = '') {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/gestore/images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    type,
                    parentId,
                    url: imageData.url,
                    altText,
                    fileName: imageData.fileName
                })
            });

            if (!response.ok) {
                throw new Error(`Errore salvataggio metadati: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Errore salvataggio metadati:', error);
            throw error;
        }
    }

    // Elimina metadati immagine dal database
    async deleteImageMetadata(imageId, type) {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/gestore/images/${imageId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Errore eliminazione metadati: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Errore eliminazione metadati:', error);
            throw error;
        }
    }

    // Ottieni immagini per sede/spazio
    async getImages(type, parentId) {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/gestore/images?type=${type}&parentId=${parentId}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Errore caricamento immagini: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Errore caricamento immagini:', error);
            throw error;
        }
    }

    // Crea elemento di upload
    createUploadElement(containerId, onUpload) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="image-upload-area" id="uploadArea">
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <div class="upload-text">
                    <strong>Clicca per caricare</strong> o trascina le immagini qui
                </div>
                <div class="upload-subtext">
                    Solo JPG/JPEG - Max 5MB
                </div>
                <input type="file" id="fileInput" multiple accept="image/jpeg,image/jpg" style="display: none;">
            </div>
            <div class="image-grid" id="imageGrid"></div>
        `;

        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const imageGrid = document.getElementById('imageGrid');

        // Event listeners
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e, onUpload));
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e, onUpload));

        this.imageGrid = imageGrid;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleFileSelect(e, onUpload) {
        const files = Array.from(e.target.files);
        this.handleFiles(files, onUpload);
    }

    handleDrop(e, onUpload) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.handleFiles(files, onUpload);
    }

    async handleFiles(files, onUpload) {
        for (const file of files) {
            try {
                const imageData = await this.uploadImage(file);
                this.addImageToGrid(imageData, file.name);
                
                if (onUpload) {
                    onUpload(imageData, file.name);
                }
            } catch (error) {
                this.showError(`Errore caricamento ${file.name}: ${error.message}`);
            }
        }
    }

    addImageToGrid(imageData, altText) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-grid-item';
        imageItem.innerHTML = `
            <img src="${imageData.url}" alt="${altText}" loading="lazy">
            <div class="overlay">
                <button class="btn btn-sm" onclick="s3ImageManager.removeImage(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        this.imageGrid.appendChild(imageItem);
    }

    removeImage(button) {
        const imageItem = button.closest('.image-grid-item');
        const img = imageItem.querySelector('img');
        const fileName = img.src.split('/').pop();
        
        if (confirm('Sei sicuro di voler eliminare questa immagine?')) {
            this.deleteImage(fileName)
                .then(() => {
                    imageItem.remove();
                })
                .catch(error => {
                    this.showError(`Errore eliminazione: ${error.message}`);
                });
        }
    }

    showError(message) {
        if (window.modernUI && window.modernUI.showToast) {
            window.modernUI.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.modernUI && window.modernUI.showToast) {
            window.modernUI.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
}

// Inizializza il manager delle immagini S3
window.s3ImageManager = new S3ImageManager();
