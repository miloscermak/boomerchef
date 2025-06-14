// Administrační JavaScript

let currentEditingId = null;
let allRecipes = [];
let storyEditor = null;

// DOM elementy
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const recipeForm = document.getElementById('recipe-form');
const recipesList = document.getElementById('recipes-list');

// Inicializace
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

// Kontrola autentizace
async function checkAuthStatus() {
    const isAuth = await AuthService.isAuthenticated();
    if (isAuth) {
        showAdminSection();
        loadRecipes();
    } else {
        showLoginSection();
    }
}

// Zobrazení sekcí
function showLoginSection() {
    loginSection.style.display = 'flex';
    adminSection.style.display = 'none';
}

function showAdminSection() {
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
}

// Event listenery
function setupEventListeners() {
    // Přihlášení
    loginForm.addEventListener('submit', handleLogin);
    
    // Odhlášení
    logoutBtn.addEventListener('click', handleLogout);
    
    // Formulář receptu
    recipeForm.addEventListener('submit', handleRecipeSubmit);
    
    // Auto-generování slug
    document.getElementById('recipe-title').addEventListener('input', function(e) {
        const slugField = document.getElementById('recipe-slug');
        if (!slugField.value || slugField.dataset.auto !== 'false') {
            slugField.value = Utils.createSlug(e.target.value);
            slugField.dataset.auto = 'true';
        }
    });
    
    // Manuální úprava slug
    document.getElementById('recipe-slug').addEventListener('input', function(e) {
        e.target.dataset.auto = 'false';
    });
    
    // Inicializace Quill editoru
    initializeEditor();
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Refresh tlačítko
    document.getElementById('refresh-recipes').addEventListener('click', loadRecipes);
    
    // Zrušení úprav
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
}

// Přihlášení
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        loginError.style.display = 'none';
        await AuthService.signIn(email, password);
        showAdminSection();
        loadRecipes();
    } catch (error) {
        loginError.textContent = 'Chyba při přihlašování: ' + error.message;
        loginError.style.display = 'block';
    }
}

// Odhlášení
async function handleLogout() {
    try {
        await AuthService.signOut();
        showLoginSection();
        loginForm.reset();
    } catch (error) {
        console.error('Chyba při odhlašování:', error);
    }
}

// Přepínání tabs
function switchTab(tabName) {
    // Aktualizace tlačítek
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Aktualizace obsahu
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Pokud přepínáme na recepty, načteme je
    if (tabName === 'recipes') {
        loadRecipes();
    }
}

// Načtení receptů
async function loadRecipes() {
    try {
        showMessage('progress', 'Načítám recepty...');
        
        const { data, error } = await supabaseClient
            .from('recipes')
            .select('*')
            .order('created_at', { ascending: false });
        
        hideMessage('progress');
        
        if (error) throw error;
        
        allRecipes = data;
        renderRecipesList(data);
    } catch (error) {
        hideMessage('progress');
        console.error('Chyba při načítání receptů:', error);
        showMessage('error', 'Chyba při načítání receptů: ' + error.message);
    }
}

// Vykreslení seznamu receptů
function renderRecipesList(recipes) {
    if (!recipes || recipes.length === 0) {
        recipesList.innerHTML = '<p>Žádné recepty nejsou k dispozici.</p>';
        return;
    }
    
    recipesList.innerHTML = recipes.map(recipe => `
        <div class="recipe-admin-item">
            <img src="${recipe.image_url ? ImageService.getImageUrl(recipe.image_url) : 'images/placeholder.jpg'}" 
                 alt="${recipe.image_alt || recipe.title}">
            <div class="recipe-admin-info">
                <h3>${recipe.title}</h3>
                <p>${recipe.story.substring(0, 100)}...</p>
                <div class="recipe-admin-meta">
                    <span class="recipe-status ${recipe.is_published ? 'status-published' : 'status-draft'}">
                        ${recipe.is_published ? 'Publikováno' : 'Koncept'}
                    </span>
                    ${recipe.featured ? '<span class="recipe-status status-featured">Doporučené</span>' : ''}
                    <span class="recipe-status">${recipe.category}</span>
                </div>
            </div>
            <div class="recipe-admin-actions">
                <button class="btn-secondary btn-small" onclick="editRecipe('${recipe.id}')">Upravit</button>
                <button class="btn-danger btn-small" onclick="deleteRecipe('${recipe.id}', '${recipe.title}')">Smazat</button>
            </div>
        </div>
    `).join('');
}

// Úprava receptu
function editRecipe(id) {
    const recipe = allRecipes.find(r => r.id === id);
    if (!recipe) return;
    
    currentEditingId = id;
    
    // Přepnutí na formulář
    switchTab('add-recipe');
    
    // Naplnění formuláře
    document.getElementById('recipe-id').value = recipe.id;
    document.getElementById('recipe-title').value = recipe.title;
    document.getElementById('recipe-slug').value = recipe.slug;
    document.getElementById('recipe-story').value = recipe.story;
    
    // Načtení obsahu do Quill editoru
    loadContentToEditor(recipe.story);
    
    document.getElementById('recipe-ingredients').value = recipe.ingredients.join('\n');
    document.getElementById('recipe-instructions').value = recipe.instructions.join('\n');
    document.getElementById('recipe-image-alt').value = recipe.image_alt || '';
    document.getElementById('recipe-category').value = recipe.category || 'hlavní jídlo';
    document.getElementById('recipe-servings').value = recipe.servings || 4;
    document.getElementById('recipe-cooking-time').value = recipe.cooking_time || '';
    document.getElementById('recipe-difficulty').value = recipe.difficulty_level || 1;
    document.getElementById('recipe-published').checked = recipe.is_published;
    document.getElementById('recipe-featured').checked = recipe.featured;
    
    // Aktualizace UI
    document.getElementById('form-title').textContent = 'Upravit recept';
    document.getElementById('cancel-edit').style.display = 'inline-block';
    
    // Scroll na začátek formuláře
    document.getElementById('add-recipe-tab').scrollIntoView({ behavior: 'smooth' });
}

// Zrušení úprav
function cancelEdit() {
    currentEditingId = null;
    recipeForm.reset();
    document.getElementById('recipe-id').value = '';
    document.getElementById('form-title').textContent = 'Přidat nový recept';
    document.getElementById('cancel-edit').style.display = 'none';
    
    // Vyčištění editoru
    clearEditor();
    
    hideMessage('success');
    hideMessage('error');
}

// Smazání receptu
async function deleteRecipe(id, title) {
    if (!confirm(`Opravdu chcete smazat recept "${title}"? Tato akce je nevratná.`)) {
        return;
    }
    
    try {
        const recipe = allRecipes.find(r => r.id === id);
        
        // Smazání obrázku z úložiště
        if (recipe.image_url) {
            await ImageService.deleteImage(recipe.image_url);
        }
        
        // Smazání receptu z databáze
        await RecipeService.deleteRecipe(id);
        
        showMessage('success', 'Recept byl úspěšně smazán.');
        loadRecipes();
    } catch (error) {
        console.error('Chyba při mazání receptu:', error);
        showMessage('error', 'Chyba při mazání receptu: ' + error.message);
    }
}

// Odeslání formuláře
async function handleRecipeSubmit(e) {
    e.preventDefault();
    
    try {
        showMessage('progress', 'Ukládám recept...');
        hideMessage('success');
        hideMessage('error');
        
        // Získání dat z formuláře
        const formData = new FormData(recipeForm);
        const imageFile = formData.get('image');
        
        // Příprava dat receptu
        const recipeData = {
            title: formData.get('title').trim(),
            slug: formData.get('slug').trim() || Utils.createSlug(formData.get('title')),
            story: formData.get('story').trim(),
            ingredients: formData.get('ingredients').split('\n').map(i => i.trim()).filter(i => i),
            instructions: formData.get('instructions').split('\n').map(i => i.trim()).filter(i => i),
            image_alt: formData.get('image_alt').trim(),
            category: formData.get('category'),
            servings: parseInt(formData.get('servings')) || 4,
            cooking_time: parseInt(formData.get('cooking_time')) || null,
            difficulty_level: parseInt(formData.get('difficulty_level')) || 1,
            is_published: formData.get('is_published') === 'on',
            featured: formData.get('featured') === 'on'
        };
        
        // Upload obrázku (pokud je vybrán)
        if (imageFile && imageFile.size > 0) {
            showMessage('progress', 'Nahrávám obrázek...');
            
            const fileName = `${recipeData.slug}-${Date.now()}.${imageFile.name.split('.').pop()}`;
            await ImageService.uploadImage(imageFile, fileName);
            recipeData.image_url = fileName;
        }
        
        // Uložení receptu
        if (currentEditingId) {
            await RecipeService.updateRecipe(currentEditingId, recipeData);
            showMessage('success', 'Recept byl úspěšně aktualizován!');
        } else {
            await RecipeService.createRecipe(recipeData);
            showMessage('success', 'Recept byl úspěšně vytvořen!');
            recipeForm.reset();
            clearEditor();
        }
        
        hideMessage('progress');
        loadRecipes();
        
    } catch (error) {
        hideMessage('progress');
        console.error('Chyba při ukládání receptu:', error);
        showMessage('error', 'Chyba při ukládání receptu: ' + error.message);
    }
}

// Zobrazení/skrytí zpráv
function showMessage(type, message) {
    const element = document.getElementById(`form-${type}`);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function hideMessage(type) {
    const element = document.getElementById(`form-${type}`);
    if (element) {
        element.style.display = 'none';
    }
}

// Inicializace Quill editoru
function initializeEditor() {
    const toolbarOptions = [
        ['bold', 'italic'],
        ['blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'header': [1, 2, 3, false] }],
        ['clean']
    ];

    storyEditor = new Quill('#story-editor', {
        theme: 'snow',
        modules: {
            toolbar: toolbarOptions
        },
        placeholder: 'Napište příběh nebo vzpomínku spojenou s tímto receptem...\n\nPro vytvoření nového odstavce stiskněte Enter dvakrát.'
    });

    // Synchronizace s hidden textarea
    storyEditor.on('text-change', function() {
        const html = storyEditor.root.innerHTML;
        document.getElementById('recipe-story').value = html;
    });
}

// Funkce pro načtení obsahu do editoru
function loadContentToEditor(content) {
    if (storyEditor && content) {
        storyEditor.root.innerHTML = content;
    }
}

// Funkce pro vyčištění editoru
function clearEditor() {
    if (storyEditor) {
        storyEditor.setContents([]);
    }
}