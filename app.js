// Hlavní aplikace - registrace routes a inicializace

// Registrace všech routes
router.route('/', Pages.home);
router.route('/recepty', Pages.recipes);
router.route('/recept/:slug', Pages.recipe);
router.route('/o-projektu', Pages.about);

// Inicializace aplikace
document.addEventListener('DOMContentLoaded', function() {
    // Přidáme loading styl
    const style = document.createElement('style');
    style.textContent = `
        .loading {
            text-align: center;
            padding: var(--spacing-xl);
            color: var(--medium-gray);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--spacing-md);
        }
        
        .hero-section {
            background: linear-gradient(135deg, var(--cream) 0%, var(--light-gray) 100%);
            padding: var(--spacing-xxl) 0;
            text-align: center;
        }
        
        .hero-content h1 {
            font-family: var(--font-serif);
            font-size: 3rem;
            color: var(--primary-color);
            margin-bottom: var(--spacing-md);
        }
        
        .hero-content p {
            font-size: 1.2rem;
            color: var(--medium-gray);
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.6;
        }
        
        .section-title {
            font-family: var(--font-serif);
            font-size: 2rem;
            color: var(--primary-color);
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }
        
        .recipe-preview {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-xl);
            background: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin-bottom: var(--spacing-xl);
        }
        
        .recipe-preview-image img {
            width: 100%;
            height: 300px;
            object-fit: cover;
        }
        
        .recipe-preview-content {
            padding: var(--spacing-lg);
        }
        
        .recipe-preview-content h3 {
            font-family: var(--font-serif);
            font-size: 1.8rem;
            margin-bottom: var(--spacing-md);
        }
        
        .recipe-preview-content h3 a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .recipe-story-preview {
            font-style: italic;
            color: var(--medium-gray);
            margin-bottom: var(--spacing-md);
            line-height: 1.7;
        }
        
        .recipe-meta {
            color: var(--medium-gray);
            font-size: 0.9rem;
            margin-bottom: var(--spacing-md);
        }
        
        .page-header {
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }
        
        .page-header h1 {
            font-family: var(--font-serif);
            font-size: 2.5rem;
            color: var(--primary-color);
            margin-bottom: var(--spacing-md);
        }
        
        .page-header p {
            font-size: 1.1rem;
            color: var(--medium-gray);
            max-width: 600px;
            margin: 0 auto;
        }
        
        .recipe-detail {
            padding: var(--spacing-xl) 0;
        }
        
        .breadcrumb {
            margin-bottom: var(--spacing-lg);
            font-size: 0.9rem;
            color: var(--medium-gray);
        }
        
        .breadcrumb a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .recipe-header {
            text-align: center;
            margin-bottom: var(--spacing-xl);
            border-bottom: 1px solid var(--light-gray);
            padding-bottom: var(--spacing-lg);
        }
        
        .recipe-header h1 {
            font-family: var(--font-serif);
            font-size: 2.5rem;
            color: var(--dark-gray);
            margin-bottom: var(--spacing-md);
        }
        
        .recipe-image {
            margin: 0 0 var(--spacing-xl) 0;
        }
        
        .recipe-image img {
            width: 100%;
            height: auto;
            max-height: 500px;
            object-fit: cover;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        }
        
        .recipe-story {
            font-size: 1.2rem;
            line-height: 1.8;
            color: var(--medium-gray);
            font-style: italic;
            background: var(--cream);
            padding: var(--spacing-lg);
            border-radius: 8px;
            border-left: 4px solid var(--primary-color);
            margin-bottom: var(--spacing-xl);
        }
        
        .recipe-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-xl);
            margin-bottom: var(--spacing-xl);
        }
        
        .recipe-details h2 {
            font-family: var(--font-serif);
            font-size: 1.5rem;
            color: var(--primary-color);
            margin-bottom: var(--spacing-md);
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: var(--spacing-xs);
        }
        
        .ingredients-list {
            list-style: none;
            padding: 0;
        }
        
        .ingredients-list li {
            padding: var(--spacing-xs) 0;
            border-bottom: 1px solid var(--light-gray);
            position: relative;
            padding-left: var(--spacing-md);
        }
        
        .ingredients-list li:before {
            content: '•';
            color: var(--primary-color);
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .instructions-list {
            list-style: none;
            counter-reset: step-counter;
            padding: 0;
        }
        
        .instructions-list li {
            counter-increment: step-counter;
            margin-bottom: var(--spacing-md);
            position: relative;
            padding-left: var(--spacing-lg);
            line-height: 1.7;
        }
        
        .instructions-list li:before {
            content: counter(step-counter) ".";
            position: absolute;
            left: 0;
            top: 0;
            color: var(--primary-color);
            font-weight: 600;
        }
        
        .recipe-footer {
            text-align: center;
            padding-top: var(--spacing-lg);
            border-top: 1px solid var(--light-gray);
        }
        
        .recipe-footer button {
            margin: 0 var(--spacing-sm);
        }
        
        .no-recipes {
            text-align: center;
            padding: var(--spacing-xl);
            color: var(--medium-gray);
        }
        
        .error-page {
            text-align: center;
            padding: var(--spacing-xxl);
        }
        
        .error-page h1 {
            color: var(--primary-color);
            margin-bottom: var(--spacing-md);
        }
        
        @media (max-width: 768px) {
            .hero-content h1 {
                font-size: 2rem;
            }
            
            .recipe-preview {
                grid-template-columns: 1fr;
            }
            
            .recipe-preview-image img {
                height: 200px;
            }
            
            .recipe-details {
                grid-template-columns: 1fr;
            }
            
            .recipe-header h1 {
                font-size: 1.8rem;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Aktivní link v navigaci
    function updateActiveNav() {
        const links = document.querySelectorAll('.nav-link');
        const currentPath = window.location.pathname;
        
        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath || 
                (currentPath.startsWith('/recept/') && link.getAttribute('href') === '/recepty')) {
                link.classList.add('active');
            }
        });
    }
    
    // Aktualizujeme aktivní link při změně route
    window.addEventListener('popstate', updateActiveNav);
    
    // Initial update
    setTimeout(updateActiveNav, 100);
});

console.log('Boomerchef aplikace spuštěna!');