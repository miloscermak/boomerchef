// Globální proměnné
let allRecipes = [];
let currentRecipe = null;

// Funkce pro otevření detailu receptu podle slug
async function openRecipe(recipeSlug) {
    try {
        const recipe = await RecipeService.getRecipeBySlug(recipeSlug);
        if (!recipe) {
            console.error('Recept nenalezen:', recipeSlug);
            return;
        }
        
        currentRecipe = recipe;
        displayRecipeInModal(recipe);
    } catch (error) {
        console.error('Chyba při načítání receptu:', error);
    }
}

// Funkce pro otevření receptu podle ID (pro zpětnou kompatibilitu)
async function openRecipeById(recipeId) {
    try {
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (!recipe) {
            console.error('Recept nenalezen:', recipeId);
            return;
        }
        
        currentRecipe = recipe;
        displayRecipeInModal(recipe);
    } catch (error) {
        console.error('Chyba při zobrazování receptu:', error);
    }
}

// Zobrazení receptu v modalu - jednoduchý článkový design
function displayRecipeInModal(recipe) {
    // Název a metadata
    document.getElementById('modal-recipe-title').textContent = recipe.title;
    
    const metaElement = document.getElementById('modal-recipe-meta');
    metaElement.innerHTML = createSimpleRecipeMeta(recipe);
    
    // Obrázek
    const imageUrl = recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.jpg';
    document.getElementById('modal-recipe-image').src = imageUrl;
    document.getElementById('modal-recipe-image').alt = recipe.image_alt || recipe.title;
    
    // Příběh receptu
    const storyElement = document.getElementById('modal-recipe-story');
    storyElement.innerHTML = formatStoryText(recipe.story);

    // Jednoduché seznamy
    const ingredientsList = document.getElementById('modal-ingredients-list');
    ingredientsList.innerHTML = '';
    recipe.ingredients.forEach(ingredient => {
        const li = document.createElement('li');
        li.textContent = ingredient;
        ingredientsList.appendChild(li);
    });

    const instructionsList = document.getElementById('modal-instructions-list');
    instructionsList.innerHTML = '';
    recipe.instructions.forEach(instruction => {
        const li = document.createElement('li');
        li.textContent = instruction;
        instructionsList.appendChild(li);
    });

    // Zobrazíme modal
    document.getElementById('recipe-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Vytvoření jednoduchých metadata pro recept
function createSimpleRecipeMeta(recipe) {
    const meta = [];
    
    if (recipe.cooking_time) {
        meta.push(`${recipe.cooking_time} minut`);
    }
    
    if (recipe.servings) {
        meta.push(`${recipe.servings} ${recipe.servings === 1 ? 'porce' : recipe.servings < 5 ? 'porce' : 'porcí'}`);
    }
    
    if (recipe.difficulty_level) {
        const difficulty = ['', 'velmi snadné', 'snadné', 'střední obtížnost', 'náročné', 'velmi náročné'];
        meta.push(difficulty[recipe.difficulty_level]);
    }
    
    if (recipe.category) {
        meta.push(recipe.category);
    }
    
    return meta.length > 0 ? meta.join(' • ') : '';
}

// Funkce pro formátování příběhu s odstavci
function formatStoryText(story) {
    if (!story) return '';
    
    // Rozdělíme text na odstavce podle prázdných řádků nebo dvojitých zalomení
    const paragraphs = story
        .split(/\n\s*\n|\r\n\s*\r\n/) // Rozdělení podle prázdných řádků
        .map(p => p.trim())
        .filter(p => p.length > 0);
    
    // Pokud nejsou nalezeny odstavce, zkusíme rozdělení podle delších vět
    if (paragraphs.length === 1 && story.length > 200) {
        const sentences = story.split(/\.\s+/);
        const midPoint = Math.floor(sentences.length / 2);
        return `
            <p>${sentences.slice(0, midPoint).join('. ')}.</p>
            <p>${sentences.slice(midPoint).join('. ')}</p>
        `;
    }
    
    // Vytvoříme HTML odstavce
    return paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('');
}

// Funkce pro formátování kroků s lepší typografií
function formatInstructionText(instruction, stepNumber) {
    if (!instruction) return '';
    
    // Pokud instrukce obsahuje více vět, rozdělíme je
    if (instruction.includes('. ') && instruction.length > 80) {
        const sentences = instruction.split('. ');
        const mainSentence = sentences[0] + '.';
        const additionalInfo = sentences.slice(1).join('. ');
        
        if (additionalInfo) {
            return `
                <strong>${mainSentence}</strong>
                <span class="instruction-detail">${additionalInfo}</span>
            `;
        }
    }
    
    return instruction;
}

// Funkce pro zavření detailu receptu
function closeRecipe() {
    document.getElementById('recipe-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Zavření modalu při kliknutí mimo obsah
document.getElementById('recipe-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeRecipe();
    }
});

// Zavření modalu klávesou ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeRecipe();
    }
});

// Funkce pro načtení všech receptů
async function loadAllRecipes() {
    try {
        allRecipes = await RecipeService.getAllRecipes();
        return allRecipes;
    } catch (error) {
        console.error('Chyba při načítání receptů:', error);
        return [];
    }
}

// Funkce pro načtení náhodného receptu dne (pro index.html)
async function loadRandomRecipe() {
    try {
        const recipe = await RecipeService.getRandomRecipe();
        if (!recipe) {
            console.error('Žádný recept nebyl nalezen');
            return;
        }

        displayRecipeOfDay(recipe);
    } catch (error) {
        console.error('Chyba při načítání náhodného receptu:', error);
    }
}

// Zobrazení receptu dne na hlavní stránce
function displayRecipeOfDay(recipe) {
    const imageElement = document.getElementById('recipe-image');
    const titleElement = document.getElementById('recipe-title');
    const storyElement = document.getElementById('recipe-story');
    const ingredientsElement = document.getElementById('ingredients-list');
    const instructionsElement = document.getElementById('instructions-list');

    const imageUrl = recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.jpg';

    if (imageElement) {
        imageElement.src = imageUrl;
        imageElement.alt = recipe.image_alt || recipe.title;
    }
    if (titleElement) titleElement.textContent = recipe.title;
    if (storyElement) storyElement.innerHTML = formatStoryText(recipe.story);

    if (ingredientsElement) {
        ingredientsElement.innerHTML = '';
        recipe.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            ingredientsElement.appendChild(li);
        });
    }

    if (instructionsElement) {
        instructionsElement.innerHTML = '';
        recipe.instructions.forEach((instruction, index) => {
            const li = document.createElement('li');
            li.innerHTML = formatInstructionText(instruction, index + 1);
            instructionsElement.appendChild(li);
        });
    }
}

// Funkce pro načtení a zobrazení receptů na stránce receptů
async function loadRecipesGrid() {
    try {
        const recipes = await RecipeService.getAllRecipes();
        const recipesGrid = document.getElementById('recipes-grid');
        
        if (!recipesGrid) return;

        if (recipes.length === 0) {
            recipesGrid.innerHTML = '<p class="text-center">Žádné recepty nejsou k dispozici.</p>';
            return;
        }

        recipesGrid.innerHTML = recipes.map(recipe => {
            const imageUrl = recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.jpg';
            return `
                <div class="recipe-card" onclick="openRecipe('${recipe.slug}')">
                    <img src="${imageUrl}" alt="${recipe.image_alt || recipe.title}">
                    <div class="recipe-card-content">
                        <h3>${recipe.title}</h3>
                        <p>${recipe.story.length > 120 ? recipe.story.substring(0, 120) + '...' : recipe.story}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Chyba při načítání receptů:', error);
        const recipesGrid = document.getElementById('recipes-grid');
        if (recipesGrid) {
            recipesGrid.innerHTML = '<p class="text-center">Chyba při načítání receptů.</p>';
        }
    }
}

// Spuštění při načtení stránky
document.addEventListener('DOMContentLoaded', async function() {
    // Zjistíme, na které stránce se nacházíme
    const currentPage = window.location.pathname;
    
    try {
        // Pokud jsme na hlavní stránce, načteme náhodný recept
        if (currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/')) {
            await loadRandomRecipe();
        }
        
        // Pokud jsme na stránce receptů, načteme všechny recepty
        if (currentPage.includes('recepty.html')) {
            await loadRecipesGrid();
        }
        
        // Načteme všechny recepty do globální proměnné pro případné použití
        await loadAllRecipes();
        
    } catch (error) {
        console.error('Chyba při inicializaci stránky:', error);
    }
});

// Funkce pro tisk receptu
function printRecipe() {
    window.print();
}