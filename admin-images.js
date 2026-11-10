// Zmenšování obrázků receptů přímo v prohlížeči admina.
//
// Proč: původní obrázky jsou PNG po 2–4 MB. Převod na WebP je zmenší zhruba
// desetkrát, což šetří úložiště i přenos dat v Supabase. Převod běží v prohlížeči
// přes <canvas>, takže není potřeba žádná knihovna ani tajný klíč – stačí být
// přihlášený v adminu.

const IMAGE_MAX_WIDTH = 1400;   // detail receptu je široký ~650 px, tohle stačí i na retina displej
const IMAGE_QUALITY = 0.82;
const CLEANUP_MIN_AGE_MS = 60 * 60 * 1000; // čerstvé soubory nemažeme – může právě běžet AI generování

const ImageOptimizer = {
    isOptimized(fileName) {
        return /\.webp$/i.test(fileName || '');
    },

    webpName(fileName) {
        return fileName.replace(/\.[^.]+$/, '') + '.webp';
    },

    formatMb(bytes) {
        return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
    },

    // Převod libovolného obrázku (Blob/File) na zmenšený WebP
    async toWebp(blob) {
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, IMAGE_MAX_WIDTH / bitmap.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);

        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const webp = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', IMAGE_QUALITY));
        // Prohlížeč bez podpory WebP by potichu vrátil PNG – to nechceme
        if (!webp || webp.type !== 'image/webp') {
            throw new Error('Tento prohlížeč neumí ukládat WebP. Použij Chrome, Edge nebo Firefox.');
        }
        return webp;
    },

    // Příprava ručně nahrávaného souboru: WebP, pokud je menší; jinak originál
    async prepareUpload(file) {
        try {
            const webp = await this.toWebp(file);
            if (webp.size < file.size) {
                return { blob: webp, extension: 'webp' };
            }
        } catch (error) {
            console.warn('Obrázek se nepodařilo zmenšit, nahrávám originál:', error);
        }
        return { blob: file, extension: file.name.split('.').pop() };
    },

    // Převede obrázek jednoho receptu a přepne recept na novou verzi.
    // Původní soubor maže jen na vyžádání (u čerstvě vygenerovaných obrázků).
    async optimizeRecipe(recipe, { deleteOriginal = false } = {}) {
        const oldName = recipe.image_url;
        const response = await fetch(ImageService.getImageUrl(oldName));
        if (!response.ok) {
            throw new Error(`Obrázek se nepodařilo stáhnout (${response.status})`);
        }

        const original = await response.blob();
        const webp = await this.toWebp(original);
        if (webp.size >= original.size) {
            return { saved: 0, skipped: true };
        }

        const newName = this.webpName(oldName);
        await ImageService.uploadImage(webp, newName);
        await RecipeService.updateRecipe(recipe.id, { image_url: newName });
        if (deleteOriginal) {
            await ImageService.deleteImage(oldName);
        }
        return { saved: original.size - webp.size, newName };
    },

    // Zmenšení čerstvě vygenerovaného obrázku. Selhání není chyba – obrázek
    // zůstane v původní podobě a později ho dožene tlačítko „Zmenšit obrázky".
    async optimizeGenerated(recipeId, imageName) {
        if (!imageName || this.isOptimized(imageName)) return;
        try {
            await this.optimizeRecipe({ id: recipeId, image_url: imageName }, { deleteOriginal: true });
        } catch (error) {
            console.warn('Vygenerovaný obrázek se nepodařilo zmenšit:', error);
        }
    },

    // Všechny soubory v bucketu (po stránkách)
    async listAllFiles() {
        const files = [];
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabaseClient.storage
                .from(SUPABASE_CONFIG.bucketName)
                .list('', { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
            if (error) throw error;
            // složky mají id null, systémové soubory začínají tečkou
            files.push(...data.filter(file => file.id && !file.name.startsWith('.')));
            if (data.length < pageSize) break;
        }
        return files;
    },

    // Soubory, na které neodkazuje žádný recept ani stránka O projektu
    async findUnusedFiles() {
        const [files, recipesResult, aboutResult] = await Promise.all([
            this.listAllFiles(),
            supabaseClient.from('recipes').select('image_url, story'),
            supabaseClient.from('about_page').select('content')
        ]);
        if (recipesResult.error) throw recipesResult.error;
        if (aboutResult.error) throw aboutResult.error;

        const usedNames = new Set(recipesResult.data.map(recipe => recipe.image_url).filter(Boolean));
        // Pojistka: obrázek vložený přímo do textu příběhu nebo stránky O projektu
        const allText = [...recipesResult.data.map(recipe => recipe.story || ''),
                         ...aboutResult.data.map(page => page.content || '')].join('\n');
        const now = Date.now();

        return files.filter(file =>
            !usedNames.has(file.name) &&
            !allText.includes(file.name) &&
            now - new Date(file.created_at).getTime() > CLEANUP_MIN_AGE_MS
        );
    }
};

// ===== Ovládání v záložce Recepty =====

function setImageToolsStatus(message) {
    const status = document.getElementById('image-tools-status');
    if (status) status.textContent = message;
}

// Volá se po každém vykreslení seznamu receptů
function updateImageTools(recipes) {
    const button = document.getElementById('optimize-images');
    if (!button || button.dataset.busy === 'true') return;

    const pending = (recipes || []).filter(recipe => recipe.image_url && !ImageOptimizer.isOptimized(recipe.image_url));
    button.textContent = pending.length ? `Zmenšit obrázky (${pending.length})` : 'Obrázky jsou zmenšené';
    button.disabled = pending.length === 0;
}

async function handleOptimizeImages() {
    const button = document.getElementById('optimize-images');
    const pending = allRecipes.filter(recipe => recipe.image_url && !ImageOptimizer.isOptimized(recipe.image_url));
    if (pending.length === 0) return;

    if (!confirm(`Převést ${pending.length} obrázků na menší formát WebP? Původní soubory zůstanou v úložišti, dokud je nesmažeš tlačítkem „Smazat nepoužívané soubory". Nech okno otevřené.`)) {
        return;
    }

    button.dataset.busy = 'true';
    button.disabled = true;

    let saved = 0;
    let done = 0;
    const failed = [];
    for (const recipe of pending) {
        setImageToolsStatus(`Zmenšuji ${done + 1} z ${pending.length}: ${recipe.title}`);
        try {
            const result = await ImageOptimizer.optimizeRecipe(recipe);
            saved += result.saved;
        } catch (error) {
            console.error('Zmenšení obrázku selhalo:', recipe.title, error);
            failed.push(`${recipe.title} (${error.message})`);
        }
        done++;
    }

    button.dataset.busy = 'false';
    await loadRecipes();

    let summary = `Hotovo. Převedeno ${pending.length - failed.length} obrázků, nové verze jsou menší o ${ImageOptimizer.formatMb(saved)}.`;
    if (failed.length) {
        summary += ` Nepodařilo se ${failed.length}: ${failed.join('; ')}`;
    }
    setImageToolsStatus(summary);
}

async function handleCleanupImages() {
    const button = document.getElementById('cleanup-images');
    button.disabled = true;
    setImageToolsStatus('Hledám nepoužívané soubory…');

    try {
        const unused = await ImageOptimizer.findUnusedFiles();
        if (unused.length === 0) {
            setImageToolsStatus('V úložišti nejsou žádné nepoužívané soubory.');
            return;
        }

        const totalSize = unused.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
        if (!confirm(`V úložišti je ${unused.length} souborů (${ImageOptimizer.formatMb(totalSize)}), které nepoužívá žádný recept. Smazat je natrvalo? Tohle nejde vrátit.`)) {
            setImageToolsStatus('Mazání zrušeno.');
            return;
        }

        // Mažeme po dávkách, ať jeden požadavek není obří
        const names = unused.map(file => file.name);
        let deleted = 0;
        for (let i = 0; i < names.length; i += 100) {
            const { data, error } = await supabaseClient.storage
                .from(SUPABASE_CONFIG.bucketName)
                .remove(names.slice(i, i + 100));
            if (error) throw error;
            deleted += (data || []).length;
        }
        // Bez oprávnění DELETE Supabase nevrátí chybu, jen nic nesmaže
        if (deleted < names.length) {
            setImageToolsStatus(`Smazáno ${deleted} z ${names.length} souborů. Zbytek se smazat nepodařilo – nejspíš chybí oprávnění k mazání ve Storage.`);
        } else {
            setImageToolsStatus(`Smazáno ${deleted} nepoužívaných souborů, uvolněno ${ImageOptimizer.formatMb(totalSize)}.`);
        }
    } catch (error) {
        console.error('Úklid úložiště selhal:', error);
        setImageToolsStatus('Úklid se nepodařil: ' + error.message);
    } finally {
        button.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('optimize-images')?.addEventListener('click', handleOptimizeImages);
    document.getElementById('cleanup-images')?.addEventListener('click', handleCleanupImages);
});
