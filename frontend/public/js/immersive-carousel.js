// Carosello Immersivo Stile Rayneo
class ImmersiveCarousel {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            autoplay: options.autoplay || false,
            autoplayDelay: options.autoplayDelay || 5000,
            transitionDuration: options.transitionDuration || 600,
            enableHover: options.enableHover !== false,
            enableKeyboard: options.enableKeyboard !== false,
            enableTouch: options.enableTouch !== false,
            showArrows: options.showArrows === true,
            showDots: options.showDots !== false,
            ...options
        };

        this.currentIndex = 0;
        this.isTransitioning = false;
        this.autoplayTimer = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isDragging = false;
        this.dragOffset = 0;
        this.hoverProgress = 0;

        this.init();
    }

    init() {
        this.setupHTML();
        this.setupStyles();
        this.bindEvents();
        this.updateCarousel();

        if (this.options.autoplay) {
            this.startAutoplay();
        }
    }

    setupHTML() {
        const images = this.container.querySelectorAll('img');
        if (images.length === 0) return;

        // Preload delle immagini per evitare immagini bianche
        this.preloadImages(images);

        this.container.innerHTML = `
            <div class="immersive-carousel-wrapper">
                <div class="immersive-carousel-track">
                    ${Array.from(images).map((img, index) => `
                        <div class="immersive-carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                            <div class="immersive-carousel-image">
                                <img src="${img.src}" alt="${img.alt || ''}" loading="lazy" onerror="this.style.display='none'">
                            </div>

                        </div>
                    `).join('')}
                </div>
                
                ${this.options.showArrows ? `
                    <button class="immersive-carousel-arrow immersive-carousel-arrow-prev" aria-label="Immagine precedente">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="immersive-carousel-arrow immersive-carousel-arrow-next" aria-label="Immagine successiva">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
                
                ${this.options.showDots && images.length > 1 ? `
                    <div class="immersive-carousel-dots">
                        ${Array.from(images).map((_, index) => `
                            <button class="immersive-carousel-dot ${index === 0 ? 'active' : ''}" 
                                    data-index="${index}" 
                                    aria-label="Vai all'immagine ${index + 1}"></button>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="immersive-carousel-progress">
                    <div class="immersive-carousel-progress-bar"></div>
                </div>
            </div>
        `;

        this.wrapper = this.container.querySelector('.immersive-carousel-wrapper');
        this.track = this.container.querySelector('.immersive-carousel-track');
        this.slides = this.container.querySelectorAll('.immersive-carousel-slide');
        this.prevArrow = this.container.querySelector('.immersive-carousel-arrow-prev');
        this.nextArrow = this.container.querySelector('.immersive-carousel-arrow-next');
        this.dots = this.container.querySelectorAll('.immersive-carousel-dot');
        this.progressBar = this.container.querySelector('.immersive-carousel-progress-bar');
    }

    preloadImages(images) {
        Array.from(images).forEach((img, index) => {
            const preloadImg = new Image();
            preloadImg.onload = () => {
                console.log(`Immagine ${index + 1} precaricata con successo`);
            };
            preloadImg.onerror = () => {
                console.warn(`Errore nel precaricamento dell'immagine ${index + 1}: ${img.src}`);
            };
            preloadImg.src = img.src;
        });
    }

    setupStyles() {
        if (document.getElementById('immersive-carousel-styles')) return;

        const style = document.createElement('style');
        style.id = 'immersive-carousel-styles';
        style.textContent = `
            .immersive-carousel-wrapper {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            }
            
            .immersive-carousel-track {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .immersive-carousel-slide {
                position: relative;
                min-width: 100%;
                height: 100%;
                opacity: 0;
                transform: scale(1.1);
                transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .immersive-carousel-slide.active {
                opacity: 1;
                transform: scale(1);
            }
            
            .immersive-carousel-image {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            
            .immersive-carousel-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                background-color: #f8f9fa;
            }
            
            .immersive-carousel-slide.active .immersive-carousel-image img {
                transform: scale(1.05);
            }
            

            
            .immersive-carousel-arrow {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                z-index: 10;
                opacity: 0;
                visibility: hidden;
            }
            
            .immersive-carousel-wrapper:hover .immersive-carousel-arrow {
                opacity: 1;
                visibility: visible;
            }
            
            .immersive-carousel-arrow:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.5);
                transform: translateY(-50%) scale(1.1);
            }
            
            .immersive-carousel-arrow-prev {
                left: 2rem;
            }
            
            .immersive-carousel-arrow-next {
                right: 2rem;
            }
            
            .immersive-carousel-arrow i {
                font-size: 1.5rem;
            }
            
            .immersive-carousel-dots {
                position: absolute;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 0.75rem;
                z-index: 10;
            }
            
            .immersive-carousel-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.5);
                background: transparent;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .immersive-carousel-dot.active,
            .immersive-carousel-dot:hover {
                background: white;
                border-color: white;
                transform: scale(1.2);
            }
            
            .immersive-carousel-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                z-index: 10;
            }
            
            .immersive-carousel-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #00d4ff);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .immersive-carousel-title {
                    font-size: 2rem;
                }
                
                .immersive-carousel-description {
                    font-size: 1rem;
                }
                
                .immersive-carousel-overlay {
                    padding: 1.5rem;
                }
                
                .immersive-carousel-arrow {
                    width: 50px;
                    height: 50px;
                }
                
                .immersive-carousel-arrow i {
                    font-size: 1.2rem;
                }
                
                .immersive-carousel-arrow-prev {
                    left: 1rem;
                }
                
                .immersive-carousel-arrow-next {
                    right: 1rem;
                }
            }
            
            @media (max-width: 480px) {
                .immersive-carousel-title {
                    font-size: 1.5rem;
                }
                
                .immersive-carousel-description {
                    font-size: 0.9rem;
                }
                
                .immersive-carousel-overlay {
                    padding: 1rem;
                }
            }
            
            /* Hover Progressivo */
            .immersive-carousel-wrapper.hover-progress {
                cursor: none;
            }
            
            .immersive-carousel-wrapper.hover-progress .immersive-carousel-track {
                transition: none;
            }
            
            /* Touch/Drag */
            .immersive-carousel-wrapper.dragging {
                cursor: grabbing;
            }
            
            .immersive-carousel-wrapper.dragging .immersive-carousel-track {
                transition: none;
            }
            
            /* Loading State */
            .immersive-carousel-wrapper.loading .immersive-carousel-slide {
                opacity: 0.5;
            }
            
            .immersive-carousel-wrapper.loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                z-index: 20;
            }
            
            @keyframes spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
    }

    bindEvents() {
        // Frecce
        if (this.prevArrow) {
            this.prevArrow.addEventListener('click', () => this.previous());
        }
        if (this.nextArrow) {
            this.nextArrow.addEventListener('click', () => this.next());
        }

        // Dots
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });

        // Tastiera
        if (this.options.enableKeyboard) {
            document.addEventListener('keydown', (e) => {
                if (this.container.contains(document.activeElement) ||
                    this.container.matches(':hover')) {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        this.previous();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        this.next();
                    }
                }
            });
        }

        // Hover progressivo - solo quando il mouse è sopra l'immagine
        if (this.options.enableHover) {
            this.slides.forEach(slide => {
                const image = slide.querySelector('img');
                if (image) {
                    image.addEventListener('mousemove', (e) => this.handleHover(e));
                    image.addEventListener('mouseleave', () => this.resetHover());
                }
            });
        }

        // Touch/Drag
        if (this.options.enableTouch) {
            this.wrapper.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            this.wrapper.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            this.wrapper.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

            // Mouse drag per desktop
            this.wrapper.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.wrapper.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.wrapper.addEventListener('mouseup', () => this.handleMouseUp());
            this.wrapper.addEventListener('mouseleave', () => this.handleMouseUp());
        }

        // Pause autoplay on hover
        if (this.options.autoplay) {
            this.wrapper.addEventListener('mouseenter', () => this.pauseAutoplay());
            this.wrapper.addEventListener('mouseleave', () => this.startAutoplay());
        }
    }

    handleHover(e) {
        if (!this.options.enableHover || this.isTransitioning) return;

        // Calcola la posizione relativa all'immagine corrente
        const image = e.target;
        const rect = image.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;

        this.hoverProgress = progress;
        this.wrapper.classList.add('hover-progress');

        // Calcola l'indice basato sulla posizione del mouse sull'immagine
        const targetIndex = Math.floor(progress * this.slides.length);
        const clampedIndex = Math.max(0, Math.min(targetIndex, this.slides.length - 1));

        if (clampedIndex !== this.currentIndex) {
            this.currentIndex = clampedIndex;
            this.updateCarousel(false);
        }
    }

    resetHover() {
        this.wrapper.classList.remove('hover-progress');
        this.hoverProgress = 0;
    }

    handleTouchStart(e) {
        if (!this.options.enableTouch) return;

        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isDragging = false;
        this.dragOffset = 0;
    }

    handleTouchMove(e) {
        if (!this.options.enableTouch) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - this.touchStartX;
        const deltaY = touchY - this.touchStartY;

        // Determina se è un drag orizzontale
        if (!this.isDragging && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            this.isDragging = true;
            this.wrapper.classList.add('dragging');
            e.preventDefault();
        }

        if (this.isDragging) {
            this.dragOffset = deltaX;
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (!this.options.enableTouch || !this.isDragging) return;

        this.wrapper.classList.remove('dragging');

        const threshold = 50;
        if (Math.abs(this.dragOffset) > threshold) {
            if (this.dragOffset > 0) {
                this.previous();
            } else {
                this.next();
            }
        }

        this.isDragging = false;
        this.dragOffset = 0;
    }

    handleMouseDown(e) {
        if (!this.options.enableTouch) return;

        this.touchStartX = e.clientX;
        this.isDragging = false;
        this.dragOffset = 0;
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.options.enableTouch) return;

        const deltaX = e.clientX - this.touchStartX;

        if (!this.isDragging && Math.abs(deltaX) > 10) {
            this.isDragging = true;
            this.wrapper.classList.add('dragging');
        }

        if (this.isDragging) {
            this.dragOffset = deltaX;
        }
    }

    handleMouseUp() {
        if (!this.options.enableTouch || !this.isDragging) return;

        this.wrapper.classList.remove('dragging');

        const threshold = 50;
        if (Math.abs(this.dragOffset) > threshold) {
            if (this.dragOffset > 0) {
                this.previous();
            } else {
                this.next();
            }
        }

        this.isDragging = false;
        this.dragOffset = 0;
    }

    next() {
        if (this.isTransitioning) return;

        this.currentIndex = (this.currentIndex + 1) % this.slides.length;
        this.updateCarousel();
    }

    previous() {
        if (this.isTransitioning) return;

        this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        this.updateCarousel();
    }

    goToSlide(index) {
        if (this.isTransitioning || index === this.currentIndex) return;

        this.currentIndex = index;
        this.updateCarousel();
    }

    updateCarousel(animate = true) {
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        // Aggiorna slides
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.currentIndex);
        });

        // Aggiorna dots
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
        });

        // Aggiorna progress bar
        if (this.progressBar) {
            const progress = ((this.currentIndex + 1) / this.slides.length) * 100;
            this.progressBar.style.width = `${progress}%`;
        }

        // Reset hover se attivo
        this.resetHover();

        if (animate) {
            setTimeout(() => {
                this.isTransitioning = false;
            }, this.options.transitionDuration);
        } else {
            this.isTransitioning = false;
        }
    }

    startAutoplay() {
        if (!this.options.autoplay || this.slides.length <= 1) return;

        this.pauseAutoplay();
        this.autoplayTimer = setInterval(() => {
            this.next();
        }, this.options.autoplayDelay);
    }

    pauseAutoplay() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }

    destroy() {
        this.pauseAutoplay();
        // Rimuovi event listeners se necessario
    }
}

// Inizializzazione automatica
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza tutti i caroselli con classe 'immersive-carousel'
    document.querySelectorAll('.immersive-carousel').forEach(container => {
        const options = {
            autoplay: container.dataset.autoplay === 'true',
            autoplayDelay: parseInt(container.dataset.autoplayDelay) || 5000,
            showArrows: container.dataset.showArrows === 'true',
            showDots: container.dataset.showDots !== 'false',
            enableHover: container.dataset.enableHover !== 'false',
            enableKeyboard: container.dataset.enableKeyboard !== 'false',
            enableTouch: container.dataset.enableTouch !== 'false'
        };

        new ImmersiveCarousel(container, options);
    });
});

// Export per uso manuale
window.ImmersiveCarousel = ImmersiveCarousel;
