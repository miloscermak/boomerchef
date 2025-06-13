// Simple client-side router pro Boomerchef
class BoomerRouter {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.init();
    }

    // Registrace route
    route(path, handler) {
        this.routes[path] = handler;
    }

    // Inicializace routeru
    init() {
        // Posloucháme změny URL
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Intercept všechny linky
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.href && e.target.href.startsWith(window.location.origin)) {
                e.preventDefault();
                this.navigate(e.target.pathname);
            }
        });

        // Zpracuj aktuální URL
        this.handleRoute();
    }

    // Navigace na novou URL
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    // Zpracování aktuální route
    async handleRoute() {
        const path = window.location.pathname;
        this.currentRoute = path;

        // Najdeme odpovídající handler
        let handler = null;
        let params = {};

        // Přesná shoda
        if (this.routes[path]) {
            handler = this.routes[path];
        } else {
            // Parametrické routes
            for (const route in this.routes) {
                const match = this.matchRoute(route, path);
                if (match) {
                    handler = this.routes[route];
                    params = match;
                    break;
                }
            }
        }

        if (handler) {
            try {
                await handler(params);
            } catch (error) {
                console.error('Router error:', error);
                this.show404();
            }
        } else {
            this.show404();
        }
    }

    // Porovnání route s aktuální cestou
    matchRoute(route, path) {
        const routeParts = route.split('/');
        const pathParts = path.split('/');

        if (routeParts.length !== pathParts.length) {
            return null;
        }

        const params = {};
        
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const pathPart = pathParts[i];

            if (routePart.startsWith(':')) {
                // Parametr
                const paramName = routePart.slice(1);
                params[paramName] = pathPart;
            } else if (routePart !== pathPart) {
                // Neodpovídá
                return null;
            }
        }

        return params;
    }

    // 404 stránka
    show404() {
        document.getElementById('app-content').innerHTML = `
            <div class="error-page">
                <h1>404 - Stránka nenalezena</h1>
                <p>Tato stránka neexistuje.</p>
                <a href="/">Zpět na hlavní stránku</a>
            </div>
        `;
        document.title = '404 - Boomerchef';
    }
}

// Globální instance routeru
const router = new BoomerRouter();