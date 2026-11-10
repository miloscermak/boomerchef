// Supabase konfigurace
// Anon key je veřejný (chrání ho RLS politiky). Service role key sem NIKDY nepatří.
const SUPABASE_CONFIG = {
    url: 'https://odggjljpjvshwcagxcza.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2dqbGpwanZzaHdjYWd4Y3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDE0OTIsImV4cCI6MjA2NTQxNzQ5Mn0.DDU0-aQEnzoCtFByiM3mWmepej4FpcEzBKrSOGySY08',
    bucketName: 'recipe-images' // Název bucket pro obrázky
};

// Inicializace Supabase klienta
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Helper funkce pro práci s recepty
const RecipeService = {
    // Načtení všech publikovaných receptů
    async getAllRecipes() {
        try {
            const { data, error } = await supabaseClient
                .from('recipes')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Chyba při načítání receptů:', error);
            return [];
        }
    },

    // Načtení receptu podle slug
    async getRecipeBySlug(slug) {
        try {
            const { data, error } = await supabaseClient
                .from('recipes')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Chyba při načítání receptu:', error);
            return null;
        }
    },

    // Načtení nejnovějšího publikovaného receptu (titulní stránka) –
    // stahujeme jen jeden řádek, ne celou databázi
    async getLatestRecipe() {
        try {
            const { data, error } = await supabaseClient
                .from('recipes')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            return data[0] || null;
        } catch (error) {
            console.error('Chyba při načítání nejnovějšího receptu:', error);
            return null;
        }
    },

    // Načtení náhodného receptu pro "recept dne"
    async getRandomRecipe() {
        try {
            const { data, error } = await supabaseClient
                .from('recipes')
                .select('*')
                .eq('is_published', true);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.length);
                return data[randomIndex];
            }
            return null;
        } catch (error) {
            console.error('Chyba při načítání náhodného receptu:', error);
            return null;
        }
    },

    // Načtení doporučených receptů
    async getFeaturedRecipes() {
        try {
            const { data, error } = await supabaseClient
                .from('recipes')
                .select('*')
                .eq('is_published', true)
                .eq('featured', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Chyba při načítání doporučených receptů:', error);
            return [];
        }
    },

    // Vytvoření nového receptu (admin funkce)
    async createRecipe(recipeData) {
        try {
            const { data, error } = await supabaseClient
                .from('recipes')
                .insert([recipeData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Chyba při vytváření receptu:', error);
            throw error;
        }
    },

    // Aktualizace receptu (admin funkce)
    async updateRecipe(id, recipeData) {
        try {
            const { data, error } = await supabaseClient
                .from('recipes')
                .update(recipeData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Chyba při aktualizaci receptu:', error);
            throw error;
        }
    },

    // Smazání receptu (admin funkce)
    async deleteRecipe(id) {
        try {
            const { error } = await supabaseClient
                .from('recipes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Chyba při mazání receptu:', error);
            throw error;
        }
    }
};

// Helper funkce pro práci s obrázky
const ImageService = {
    // Upload obrázku do Supabase Storage
    async uploadImage(file, fileName) {
        try {
            const { data, error } = await supabaseClient.storage
                .from(SUPABASE_CONFIG.bucketName)
                .upload(fileName, file, {
                    // Název souboru obsahuje časové razítko a nikdy se nepřepisuje,
                    // takže si ho prohlížeč může pamatovat rok a nestahuje ho znovu
                    cacheControl: '31536000',
                    upsert: true
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Chyba při uploadu obrázku:', error);
            throw error;
        }
    },

    // Získání veřejné URL obrázku
    getImageUrl(fileName) {
        const { data } = supabaseClient.storage
            .from(SUPABASE_CONFIG.bucketName)
            .getPublicUrl(fileName);
        
        return data.publicUrl;
    },

    // Smazání obrázku
    async deleteImage(fileName) {
        try {
            const { error } = await supabaseClient.storage
                .from(SUPABASE_CONFIG.bucketName)
                .remove([fileName]);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Chyba při mazání obrázku:', error);
            throw error;
        }
    }
};

// Helper funkce pro autentizaci
const AuthService = {
    // Přihlášení
    async signIn(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Chyba při přihlašování:', error);
            throw error;
        }
    },

    // Odhlášení
    async signOut() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Chyba při odhlašování:', error);
            throw error;
        }
    },

    // Získání aktuálního uživatele
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            return user;
        } catch (error) {
            console.error('Chyba při získávání uživatele:', error);
            return null;
        }
    },

    // Kontrola, zda je uživatel přihlášen
    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user !== null;
    }
};

// Utility funkce
const Utils = {
    // Vytvoření slug z názvu
    createSlug(title) {
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // odstranění diakritiky
            .replace(/[^\w\s-]/g, '') // odstranění speciálních znaků
            .replace(/\s+/g, '-') // nahrazení mezer pomlčkami
            .replace(/--+/g, '-') // nahrazení vícenásobných pomlček jednou
            .replace(/^-+|-+$/g, ''); // odstranění pomlček na začátku a konci
    },

    // Formátování data
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('cs-CZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Validace emailu
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Ošetření textu před vložením do HTML (uvozovky v názvu apod.)
    escapeHtml(text) {
        const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(text ?? '').replace(/[&<>"']/g, ch => entities[ch]);
    },

    // Odstranění HTML tagů – pro náhledy příběhu v kartách a seznamech.
    // Syrové HTML se nesmí řezat přes substring(), neuzavřený tag rozbije stránku.
    stripHtml(html) {
        return String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    },

    // Krátký textový náhled příběhu (bez HTML), tři tečky jen když se opravdu krátí
    storyPreview(story, maxLength) {
        const plain = Utils.stripHtml(story);
        return plain.length > maxLength ? plain.substring(0, maxLength).trimEnd() + '...' : plain;
    },

    // Suroviny / postup jako <li> položky. V DB je to pole, starší data mohla být text s řádky.
    toListItems(value) {
        const items = Array.isArray(value) ? value : String(value ?? '').split('\n');
        return items
            .map(item => String(item ?? '').trim())
            .filter(item => item)
            .map(item => `<li>${Utils.escapeHtml(item)}</li>`)
            .join('');
    },

    // Formátování příběhu s odstavci. Dva režimy: HTML z editoru (použije se přímo)
    // a prostý text (rozdělí se na odstavce). S maxLength vrací zkrácený textový náhled.
    formatStoryText(story, maxLength = null) {
        if (!story) return '';

        const paragraphStyle = 'margin-bottom: 3rem; line-height: 1.8; font-size: 1.1rem;';

        if (maxLength && Utils.stripHtml(story).length > maxLength) {
            return `<p style="${paragraphStyle}">${Utils.storyPreview(story, maxLength)}</p>`;
        }

        // Text z Quill editoru už HTML obsahuje – jen doplníme styl odstavců
        if (story.includes('<p>') || story.includes('<div>')) {
            return story.replace(/<p>/g, `<p style="${paragraphStyle}">`);
        }

        // Prostý text – každý neprázdný řádek je odstavec
        return story
            .split(/\r?\n/)
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => `<p style="${paragraphStyle}">${paragraph}</p>`)
            .join('');
    }
};
