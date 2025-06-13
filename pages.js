// Jednotlivé stránky pro router

const Pages = {
    // Hlavní stránka
    async home() {
        document.title = 'Boomerchef - Recepty s příběhem';
        
        const content = `
            <div class="main-content">
                <section class="hero-section">
                    <div class="hero-content">
                        <h1>Recepty s příběhem</h1>
                        <p>Objevte tradiční chutě a vzpomínky, které se předávaly z generace na generaci</p>
                    </div>
                </section>

                <section class="recipe-of-day">
                    <div class="container">
                        <h2 class="section-title">Recept dne</h2>
                        <div id="recipe-of-day-content">
                            <div class="loading">Načítám recept dne...</div>
                        </div>
                    </div>
                </section>

                <section class="featured-recipes">
                    <div class="container">
                        <h2 class="section-title">Doporučené recepty</h2>
                        <div id="featured-recipes-grid" class="recipes-grid">
                            <div class="loading">Načítám doporučené recepty...</div>
                        </div>
                    </div>
                </section>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;
        
        // Načteme obsah
        await this.loadHomeContent();
    },

    async loadHomeContent() {
        try {
            // Recept dne
            const randomRecipe = await RecipeService.getRandomRecipe();
            if (randomRecipe) {
                this.renderRecipeOfDay(randomRecipe);
            } else {
                document.getElementById('recipe-of-day-content').innerHTML = `
                    <div class="no-recipes">
                        <p>Zatím zde nejsou žádné recepty.</p>
                        <a href="/admin.html" class="btn-primary">Přidat první recept</a>
                    </div>
                `;
            }

            // Doporučené recepty
            const featured = await RecipeService.getFeaturedRecipes();
            if (featured.length > 0) {
                this.renderFeaturedRecipes(featured);
            } else {
                document.getElementById('featured-recipes-grid').innerHTML = `
                    <div class="no-recipes">
                        <p>Zatím žádné doporučené recepty.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Chyba při načítání obsahu:', error);
        }
    },

    renderRecipeOfDay(recipe) {
        const imageUrl = recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.svg';
        
        const html = `
            <article class="recipe-preview">
                <div class="recipe-preview-image">
                    <img src="${imageUrl}" alt="${recipe.image_alt || recipe.title}">
                </div>
                <div class="recipe-preview-content">
                    <h3><a href="/recept/${recipe.slug}">${recipe.title}</a></h3>
                    <div class="recipe-story-preview">
                        ${Utils.formatStoryText(recipe.story, 200)}
                    </div>
                    <div class="recipe-meta">
                        ${this.createRecipeMeta(recipe)}
                    </div>
                    <a href="/recept/${recipe.slug}" class="btn-primary">Zobrazit recept</a>
                </div>
            </article>
        `;
        
        document.getElementById('recipe-of-day-content').innerHTML = html;
    },

    renderFeaturedRecipes(recipes) {
        const html = recipes.map(recipe => {
            const imageUrl = recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.svg';
            return `
                <div class="recipe-card">
                    <a href="/recept/${recipe.slug}">
                        <img src="${imageUrl}" alt="${recipe.image_alt || recipe.title}">
                        <div class="recipe-card-content">
                            <h3>${recipe.title}</h3>
                            <p>${recipe.story.length > 120 ? recipe.story.substring(0, 120) + '...' : recipe.story}</p>
                        </div>
                    </a>
                </div>
            `;
        }).join('');
        
        document.getElementById('featured-recipes-grid').innerHTML = html;
    },

    // Seznam receptů
    async recipes() {
        document.title = 'Recepty - Boomerchef';
        
        const content = `
            <div class="main-content">
                <div class="container">
                    <header class="page-header">
                        <h1>Naše sbírka receptů</h1>
                        <p>Každý recept má svůj příběh. Objevte tradiční chutě a vzpomínky.</p>
                    </header>
                    
                    <div id="recipes-grid" class="recipes-grid">
                        <div class="loading">Načítám recepty...</div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;
        
        try {
            const recipes = await RecipeService.getAllRecipes();
            this.renderRecipesList(recipes);
        } catch (error) {
            console.error('Chyba při načítání receptů:', error);
            document.getElementById('recipes-grid').innerHTML = '<p>Chyba při načítání receptů.</p>';
        }
    },

    renderRecipesList(recipes) {
        if (recipes.length === 0) {
            document.getElementById('recipes-grid').innerHTML = `
                <div class="no-recipes">
                    <p>Zatím zde nejsou žádné recepty.</p>
                    <a href="/admin.html" class="btn-primary">Přidat první recept</a>
                </div>
            `;
            return;
        }

        const html = recipes.map(recipe => {
            const imageUrl = recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.svg';
            return `
                <div class="recipe-card">
                    <a href="/recept/${recipe.slug}">
                        <img src="${imageUrl}" alt="${recipe.image_alt || recipe.title}">
                        <div class="recipe-card-content">
                            <h3>${recipe.title}</h3>
                            <p>${recipe.story.length > 120 ? recipe.story.substring(0, 120) + '...' : recipe.story}</p>
                            <div class="recipe-meta">
                                ${this.createRecipeMeta(recipe)}
                            </div>
                        </div>
                    </a>
                </div>
            `;
        }).join('');
        
        document.getElementById('recipes-grid').innerHTML = html;
    },

    // Detail receptu
    async recipe(params) {
        const slug = params.slug;
        
        try {
            const recipe = await RecipeService.getRecipeBySlug(slug);
            
            if (!recipe) {
                router.show404();
                return;
            }

            document.title = `${recipe.title} - Boomerchef`;
            
            // Meta tagy pro SEO
            this.updateMetaTags(recipe);
            
            const imageUrl = recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.svg';
            
            const content = `
                <article class="recipe-detail">
                    <div class="container">
                        <nav class="breadcrumb">
                            <a href="/">Domů</a> → 
                            <a href="/recepty">Recepty</a> → 
                            <span>${recipe.title}</span>
                        </nav>

                        <header class="recipe-header">
                            <h1>${recipe.title}</h1>
                            <div class="recipe-meta">
                                ${this.createRecipeMeta(recipe)}
                            </div>
                        </header>

                        <figure class="recipe-image">
                            <img src="${imageUrl}" alt="${recipe.image_alt || recipe.title}">
                        </figure>

                        <div class="recipe-content">
                            <section class="recipe-story">
                                ${Utils.formatStoryText(recipe.story)}
                            </section>

                            <div class="recipe-details">
                                <section class="ingredients-section">
                                    <h2>Suroviny</h2>
                                    <ul class="ingredients-list">
                                        ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                                    </ul>
                                </section>

                                <section class="instructions-section">
                                    <h2>Postup</h2>
                                    <ol class="instructions-list">
                                        ${recipe.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                                    </ol>
                                </section>
                            </div>
                        </div>

                        <footer class="recipe-footer">
                            <button onclick="window.print()" class="btn-secondary">
                                📄 Vytisknout recept
                            </button>
                            <button onclick="navigator.share ? navigator.share({title: '${recipe.title}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href)" class="btn-secondary">
                                🔗 Sdílet recept
                            </button>
                        </footer>
                    </div>
                </article>
            `;

            document.getElementById('app-content').innerHTML = content;
            
        } catch (error) {
            console.error('Chyba při načítání receptu:', error);
            router.show404();
        }
    },

    // O projektu
    async about() {
        document.title = 'O projektu - Boomerchef';
        
        const content = `
            <div class="main-content">
                <div class="container">
                    <div class="about-content">
                        <h1>O projektu Boomerchef</h1>
                        
                        <p>Vítejte v Boomerchef – místě, kde se setkávají tradiční chutě s nostalgickými vzpomínkami. 
                        Náš web je věnován uchovávání a sdílení klasických receptů, které se předávaly z generace na generaci.</p>

                        <p>V době rychlého života a instantních jídel chceme připomenout krásu pomalého vaření, 
                        kdy se každé jídlo připravovalo s láskou a každý recept měl svůj příběh. 
                        Naše babičky a dědečkové neměli přesné váhy ani časovače – vařili podle citu, 
                        zkušeností a s nekonečnou trpělivostí.</p>

                        <p>Každý recept v naší sbírce je více než jen seznam surovin a postupů. 
                        Je to okénko do minulosti, vzpomínka na nedělní obědy, 
                        rodinné oslavy a chvíle strávené u kuchyňského stolu. 
                        Věříme, že jídlo spojuje lidi a že ty nejlepší recepty jsou ty, 
                        které v sobě nesou kus rodinné historie.</p>

                        <p>Boomerchef je oslavou české tradiční kuchyně – od jednoduchých, 
                        ale chutných každodenních jídel až po slavnostní pokrmy, 
                        které ožívají jen při zvláštních příležitostech. 
                        Naším cílem je zachovat tyto kulinářské poklady pro budoucí generace 
                        a ukázat, že nejlepší jídla vznikají s časem, trpělivostí a láskou.</p>

                        <p>Přidejte se k nám na této nostalgické cestě a objevte znovu kouzlo 
                        tradičního vaření. Protože někdy je třeba se zastavit, 
                        zpomalit a vychutnat si nejen jídlo, ale i příběh, který v sobě skrývá.</p>

                        <p style="text-align: center; font-style: italic; color: var(--primary-color); margin-top: var(--spacing-xl);">
                            <strong>S úctou k tradicí a láskou k dobrému jídlu</strong>
                        </p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;
    },

    // Helper funkce
    createRecipeMeta(recipe) {
        const meta = [];
        
        if (recipe.cooking_time) {
            meta.push(`${recipe.cooking_time} min`);
        }
        
        if (recipe.servings) {
            meta.push(`${recipe.servings} ${recipe.servings === 1 ? 'porce' : recipe.servings < 5 ? 'porce' : 'porcí'}`);
        }
        
        if (recipe.difficulty_level) {
            const difficulty = ['', 'velmi snadné', 'snadné', 'střední', 'náročné', 'velmi náročné'];
            meta.push(difficulty[recipe.difficulty_level]);
        }
        
        if (recipe.category) {
            meta.push(recipe.category);
        }
        
        return meta.join(' • ');
    },

    updateMetaTags(recipe) {
        // Dynamické meta tagy pro SEO
        const description = recipe.story.substring(0, 160) + (recipe.story.length > 160 ? '...' : '');
        
        // Existující meta tagy
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = description;
        } else {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            metaDesc.content = description;
            document.head.appendChild(metaDesc);
        }

        // Open Graph tagy pro sociální sítě
        this.setMetaTag('property', 'og:title', recipe.title);
        this.setMetaTag('property', 'og:description', description);
        this.setMetaTag('property', 'og:type', 'article');
        this.setMetaTag('property', 'og:url', window.location.href);
        
        if (recipe.image_url) {
            this.setMetaTag('property', 'og:image', ImageService.getImageUrl(recipe.image_url));
        }
    },

    setMetaTag(attribute, value, content) {
        let tag = document.querySelector(`meta[${attribute}="${value}"]`);
        if (tag) {
            tag.content = content;
        } else {
            tag = document.createElement('meta');
            tag.setAttribute(attribute, value);
            tag.content = content;
            document.head.appendChild(tag);
        }
    }
};