/**
 * Componente Navbar Universale
 * Gestisce la navbar in modo consistente su tutte le pagine
 */

class UniversalNavbar {
    constructor(options = {}) {
        this.options = {
            showHome: true,
            showPrenota: true,
            showDashboard: false,
            showDashboardGestori: false,
            currentPage: null,
            ...options
        };
    }

    /**
     * Genera l'HTML della navbar
     */
    generateHTML() {
        const currentUser = this.getCurrentUser();
        const isAuthenticated = !!currentUser;

        return `
            <nav class="navbar navbar-expand-lg">
                <div class="container">
                    <a class="navbar-brand" href="index.html">
                        <i class="fas fa-building me-2"></i>
                        Coworking Mio
                    </a>

                    <!-- Toggle button per mobile -->
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>

                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto">
                            ${this.options.showHome ? this.generateHomeLink() : ''}
                            ${this.options.showPrenota ? this.generatePrenotaLink() : ''}
                            ${this.options.showDashboard ? this.generateDashboardLink() : ''}
                            ${this.options.showDashboardGestori ? this.generateDashboardGestoriLink() : ''}
                            ${this.generateAuthSection(isAuthenticated, currentUser)}
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }

    /**
     * Genera il link Home
     */
    generateHomeLink() {
        const isActive = this.options.currentPage === 'home' ? 'active' : '';
        return `
            <li class="nav-item">
                <a class="nav-link ${isActive}" href="index.html">Home</a>
            </li>
        `;
    }

    /**
     * Genera il link Prenota
     */
    generatePrenotaLink() {
        const isActive = this.options.currentPage === 'prenota' ? 'active' : '';
        return `
            <li class="nav-item">
                <a class="nav-link ${isActive}" href="selezione-slot.html">
                    <i class="fas fa-calendar-plus me-1"></i>Prenota
                </a>
            </li>
        `;
    }

    /**
     * Genera il link Dashboard Utente
     */
    generateDashboardLink() {
        const isActive = this.options.currentPage === 'dashboard' ? 'active' : '';
        return `
            <li class="nav-item">
                <a class="nav-link ${isActive}" href="dashboard.html">Dashboard</a>
            </li>
        `;
    }

    /**
     * Genera il link Dashboard Gestori
     */
    generateDashboardGestoriLink() {
        const isActive = this.options.currentPage === 'dashboard-gestori' ? 'active' : '';
        return `
            <li class="nav-item">
                <a class="nav-link ${isActive}" href="dashboard-responsabili.html">Dashboard Gestori</a>
            </li>
        `;
    }

    /**
     * Genera la sezione di autenticazione
     */
    generateAuthSection(isAuthenticated, currentUser) {
        if (isAuthenticated) {
            return this.generateAuthenticatedSection(currentUser);
        } else {
            return this.generateUnauthenticatedSection();
        }
    }

    /**
 * Genera la sezione per utenti autenticati
 */
    generateAuthenticatedSection(currentUser) {
        return `
            <li class="nav-item">
                <a class="nav-link btn btn-primary ms-2" href="#" onclick="logout()">
                    <i class="fas fa-sign-out-alt me-1"></i>Logout
                </a>
            </li>
        `;
    }

    /**
     * Genera la sezione per utenti non autenticati
     */
    generateUnauthenticatedSection() {
        return `
            <li class="nav-item">
                <a class="nav-link btn btn-primary ms-2" href="#" onclick="showLoginModal()">
                    <i class="fas fa-sign-in-alt me-1"></i>Accedi
                </a>
            </li>
        `;
    }

    /**
     * Ottiene l'utente corrente dal localStorage
     */
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Errore parsing user:', error);
            return null;
        }
    }

    /**
     * Renderizza la navbar nel container specificato
     */
    render(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = this.generateHTML();
        } else {
            console.error(`Container con ID '${containerId}' non trovato`);
        }
    }

    /**
     * Aggiorna la navbar (utile quando cambia lo stato di autenticazione)
     */
    update() {
        // Trova il container della navbar esistente
        const navbar = document.querySelector('nav.navbar');
        if (navbar) {
            const newHTML = this.generateHTML();
            navbar.outerHTML = newHTML;
        }
    }
}

/**
 * Funzioni di utilità per l'integrazione con il sistema esistente
 */

// Funzione globale per aggiornare la navbar (compatibilità con sistema esistente)
window.updateNavbarUniversal = function () {
    const currentUser = getCurrentUser();
    const isAuthenticated = !!currentUser;

    // Trova il tasto Accedi/Logout
    const authSection = document.getElementById('authSection');
    if (!authSection) return;

    if (isAuthenticated) {
        // Trasforma il tasto Accedi in Logout
        const accediButton = authSection.querySelector('a[onclick*="showLoginModal"]');
        if (accediButton) {
            accediButton.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
            accediButton.onclick = logout;
            accediButton.href = '#';
            accediButton.className = 'nav-link btn btn-primary ms-2'; // Mantieni lo stesso stile blu
            accediButton.style.backgroundColor = ''; // Assicura che sia blu
            accediButton.style.borderColor = ''; // Assicura che sia blu
        }

        // Aggiorna il link Dashboard con il nome utente
        const dashboardLink = document.getElementById('dashboardLink');
        if (dashboardLink) {
            dashboardLink.textContent = `Dashboard ${currentUser.nome}`;
            // Il tasto Dashboard personale porta sempre alla dashboard personale
            dashboardLink.href = 'dashboard.html';
        }
    } else {
        // Trasforma il tasto Logout in Accedi
        const logoutButton = authSection.querySelector('a[onclick*="logout"]');
        if (logoutButton) {
            logoutButton.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i>Accedi';
            logoutButton.onclick = showLoginModal;
            logoutButton.href = '#';
            logoutButton.className = 'nav-link btn btn-primary ms-2'; // Mantieni lo stesso stile blu
            logoutButton.style.backgroundColor = ''; // Assicura che sia blu
            logoutButton.style.borderColor = ''; // Assicura che sia blu
        }

        // Ripristina il link Dashboard al testo originale
        const dashboardLink = document.getElementById('dashboardLink');
        if (dashboardLink) {
            dashboardLink.textContent = 'Dashboard';
            dashboardLink.href = 'dashboard.html';
        }
    }
};

// Funzione helper per ottenere l'utente corrente
function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Errore parsing user:', error);
        return null;
    }
}

// Esporta la classe per uso in altri moduli
window.UniversalNavbar = UniversalNavbar;
