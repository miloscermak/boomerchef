# BoomerChef – pokyny pro Claude Code

Web s tradičními recepty s nostalgickými příběhy. Vibecoding projekt – uživatel je novinář, ne programátor. Komunikuj česky, kód piš čistý a čitelný.

## Stack

- **Frontend:** čisté HTML + CSS + vanilla JavaScript. Žádné frameworky (React, Vue), žádný build krok. Otevírá se přímo v prohlížeči nebo nasazuje jako statika.
- **Fonts:** Playfair Display (nadpisy), Inter (text) – přes Google Fonts.
- **Backend:** Supabase (PostgreSQL + Storage + Auth). Klient se načítá přes CDN (`@supabase/supabase-js@2`).
- **Analytics:** Google Analytics (G-ZT7YEQJE43) v `index.html`.

## Struktura souborů

### Veřejné stránky
- `index.html` – titulní stránka, načítá **nejnovější** recept (i když se sekce jmenuje `latest-recipe`; dříve to byl náhodný "recept dne", `RecipeService.getRandomRecipe()` v `config.js` ještě existuje)
- `recepty.html` – grid všech receptů
- `recept.html` – detail jednoho receptu, parametr `?slug=...`
- `recept-tisk.html` – tisková verze receptu
- `o-projektu.html` – o projektu
- `admin.html` + `admin-script.js` + `admin-styles.css` – správa receptů (vyžaduje přihlášení přes Supabase Auth)

### Sdílené
- `styles.css` – hlavní styly + CSS custom properties (paleta, spacing, fonty)
- `config.js` – Supabase klient + servisní moduly: `RecipeService`, `ImageService`, `AuthService`, `Utils`
- `images/` – statické obrázky (placeholdery); reálné fotky receptů jdou do Supabase Storage

### Mrtvé / legacy soubory (nepoužívat, ale neexistují bezdůvodně)
- `index-old.html`, `index-spa.html`, `pages.js`, `router.js` – pozůstatky neúspěšného SPA pokusu (viz `FIXED-ISSUES.md`). Nepoužívají se.
- `test-formatting.html` – testovací stránka pro formátování odstavců.
- `create-admin.sql`, `create-about-table.sql`, `simple-schema.sql` – starší/pomocná SQL.

## AI generování receptů (Netlify funkce)

- V adminu je záložka **🤖 Generovat z AI** – vložíš surový recept, Netlify background funkce `netlify/functions/generate-recipe-background.js` zavolá Claude (Opus 4.8, Tool Use → strukturovaný JSON) a volitelně xAI Grok na obrázek, uloží recept jako **koncept** (`is_published=false`). Editor zkontroluje a publikuje.
- Klient (`admin-script.js`, `handleAiGenerate`) volá funkci s Bearer Supabase tokenem, pak pollne DB na nový koncept a otevře ho v editaci.
- Tajné klíče (Anthropic, xAI, Supabase service role) jsou **jen v Netlify env**, nikdy v repu. Kompletní návod: `AI-PIPELINE.md`.
- Hosting: web se přesouvá z Vercelu na **Netlify** (kvůli funkcím), `netlify.toml` + `package.json` jsou v repu.

## Supabase

- **URL a anon key** jsou v `config.js` (commitnuté – anon key je veřejný, OK; service role key tam **nikdy** nesmí být).
- **Tabulka `recipes`** – schema v `supabase-schema.sql`. Klíčová pole:
  - `slug` (unikátní, používá se v URL `recept.html?slug=...`)
  - `title`, `story` (text příběhu, může obsahovat HTML z editoru)
  - `ingredients TEXT[]`, `instructions TEXT[]`
  - `image_url` (jen název souboru v bucketu, plnou URL skládá `ImageService.getImageUrl()`)
  - `is_published`, `featured`, `cooking_time`, `difficulty_level`, `servings`, `category`
- **Storage bucket:** `recipe-images` (Public).
- **RLS:** veřejné čtení publikovaných receptů; zápis jen pro autentifikované.

## Konvence

- **Jazyk:** UI a komentáře v kódu česky. Identifikátory, git commity a názvy souborů anglicky.
- **Slug** generuje `Utils.createSlug()` – odstraňuje diakritiku, lowercase, spojuje pomlčkami.
- **Příběh receptu** formátuje `Utils.formatStoryText()` – pokud text už obsahuje `<p>` nebo `<div>` (z Quill editoru v adminu), použije ho přímo a jen dotuje styling. Jinak rozdělí na odstavce podle prázdných řádků. Při úpravách formátování **vždy** otestovat oba režimy (plain text i HTML z editoru).
- **CSS:** používáme custom properties (`--primary-color: #8B4513`, `--spacing-md`, atd.) definované v `styles.css`. Drž se palety: hnědá `#8B4513`, krémová `#FFF8E7`, šedá tóny.

## Workflow

- Po každém logickém kroku `git commit` (anglicky, imperativ: "Add X", "Fix Y").
- Před změnami zkontroluj `git status`.
- Repo: `https://github.com/miloscermak/boomerchef`, větev `main`.

## Pasti, na které jsme už narazili

- **Modal vs. samostatné URL:** recepty se otevírají na vlastní stránce `recept.html?slug=...`, **ne** v modalu. Při přidávání nové funkce na detail receptu uprav `recept.html`.
- **SPA routing byl opuštěn** – každá stránka má svou vlastní jednoduchou logiku, žádný klientský router.
- **Formátování odstavců v `story`** – viz výše, dva režimy (plain text / HTML).
- **Načítání na `index.html`** dříve nefungovalo, teď bere první z `getAllRecipes()` (řazeno `created_at DESC`).
