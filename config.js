// Supabase konfigurace
// POZOR: Tyto hodnoty je třeba nahradit skutečnými z vašeho Supabase projektu
const SUPABASE_CONFIG = {
    url: 'https://odggjljpjvshwcagxcza.supabase.co', // Nahraďte vaší Supabase URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ2dqbGpwanZzaHdjYWd4Y3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDE0OTIsImV4cCI6MjA2NTQxNzQ5Mn0.DDU0-aQEnzoCtFByiM3mWmepej4FpcEzBKrSOGySY08', // Nahraďte vaším anonymous key
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
                    cacheControl: '3600',
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
            .trim('-'); // odstranění pomlček na začátku a konci
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

    // Formátování příběhu s odstavci
    formatStoryText(story, maxLength = null) {
        if (!story) return '';
        
        // Zkrátíme text pokud je zadán maxLength
        let text = maxLength && story.length > maxLength 
            ? story.substring(0, maxLength) + '...' 
            : story;
        
        // Nahradíme \n\n za skutečné odstavce
        let formattedStory = text
            .replace(/\n\s*\n/g, '</p><p>') // Dvojité zalomení = nový odstavec
            .replace(/\r\n\s*\r\n/g, '</p><p>') // Windows line endings
            .trim();
        
        // Pokud text nezačína <p>, přidáme ho
        if (!formattedStory.startsWith('<p>')) {
            formattedStory = '<p>' + formattedStory;
        }
        
        // Pokud text nekončí </p>, přidáme ho
        if (!formattedStory.endsWith('</p>')) {
            formattedStory = formattedStory + '</p>';
        }
        
        // Nahradíme jednoduchá zalomení za <br>
        formattedStory = formattedStory.replace(/\n/g, '<br>');
        
        return formattedStory;
    }
};