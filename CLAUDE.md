# BoomerChef – pokyny pro Claude Code

Web s tradičními recepty s nostalgickými příběhy. Vibecoding projekt – uživatel je novinář, ne programátor. Komunikuj česky, kód piš čistý a čitelný.

## Stack

- **Frontend:** čisté HTML + CSS + vanilla JavaScript. Žádné frameworky (React, Vue), žádný build krok. Otevírá se přímo v prohlížeči nebo nasazuje jako statika.
- **Fonts:** Playfair Display (nadpisy), Inter (text) – přes Google Fonts.
- **Backend:** Supabase (PostgreSQL + Storage + Auth). Klient se načítá přes CDN (`@supabase/supabase-js@2`).
- **Analytics:** Google Analytics (G-ZT7YEQJE43) v `index.html`.

## Struktura souborů

### Veřejné stránky
- `index.html` – titulní stránka, načítá **nejnovější** recept přes `RecipeService.getLatestRecipe()` (dříve to byl náhodný "recept dne", `RecipeService.getRandomRecipe()` v `config.js` ještě existuje)
- `recepty.html` – grid všech receptů
- `recept.html` – detail jednoho receptu, parametr `?slug=...`
- `recept-tisk.html` – tisková verze receptu
- `o-projektu.html` – o projektu
- `admin.html` + `admin-script.js` + `admin-styles.css` – správa receptů (vyžaduje přihlášení přes Supabase Auth)
- `admin-images.js` – zmenšování obrázků v prohlížeči admina (`ImageOptimizer`): převod na WebP (max. šířka 1400 px) při ručním nahrání i po AI generování, hromadný převod starých obrázků a úklid nepoužívaných souborů ve Storage

### Sdílené
- `styles.css` – hlavní styly + CSS custom properties (paleta, spacing, fonty)
- `config.js` – Supabase klient + servisní moduly: `RecipeService`, `ImageService`, `AuthService`, `Utils`
- `images/` – statické obrázky (placeholdery); reálné fotky receptů jdou do Supabase Storage

### Mrtvé / legacy soubory (nepoužívat, ale neexistují bezdůvodně)
- `index-old.html`, `index-spa.html`, `pages.js`, `router.js`, `app.js` – pozůstatky neúspěšného SPA pokusu (viz `FIXED-ISSUES.md`). Nepoužívají se.
- `test-formatting.html` – testovací stránka pro formátování odstavců.
- `create-admin.sql`, `create-about-table.sql`, `simple-schema.sql` – starší/pomocná SQL.

## AI generování receptů (Netlify funkce)

- V adminu je záložka **🤖 Generovat z AI** – vložíš surový recept, Netlify background funkce `netlify/functions/generate-recipe-background.js` zavolá Claude (Tool Use → strukturovaný JSON) a volitelně xAI Grok na obrázek, uloží recept jako **koncept** (`is_published=false`). Editor zkontroluje a publikuje.
- **Model pro text receptů: Claude Fable 5** (`claude-fable-5`, od července 2026; dražší než Opus – $10/$50 za MTok). Ve funkci je server-side fallback na `claude-opus-4-8` – kdyby Fable požadavek odmítl, API automaticky dogeneruje Opusem v rámci téhož volání. Který model reálně psal, je vidět v Netlify logu (`text napsal model: …`). Prompty na obrázky (`generate-image-background.js`) jedou dál na Opus 4.8. Pozor: env proměnná `ANTHROPIC_MODEL` v Netlify přebíjí default v kódu.
- Klient (`admin-script.js`, `handleAiGenerate`) volá funkci s Bearer Supabase tokenem, pak pollne DB na nový koncept a otevře ho v editaci.
- Tajné klíče (Anthropic, xAI, Supabase service role) jsou **jen v Netlify env**, nikdy v repu. Kompletní návod: `AI-PIPELINE.md`.
- Hosting: web běží na **Netlify** (kvůli funkcím), doména **boomerchef.cz** (DNS u Active24, A + CNAME na Netlify). Deploy automaticky z větve `main`. `netlify.toml` + `package.json` jsou v repu.
- Druhá funkce `netlify/functions/generate-image-background.js` dogeneruje obrázek k existujícímu receptu (tlačítko „Vygenerovat obrázek" / „Nový obrázek" v seznamu). Styl obrázků: **klasická francouzská kuchařská ilustrace** (barevná kresba, černý obrys + pastelové výplně, na šířku).

## Supabase

- **URL a anon key** jsou v `config.js` (commitnuté – anon key je veřejný, OK; service role key tam **nikdy** nesmí být).
- **Tabulka `recipes`** – schema v `supabase-schema.sql`. Klíčová pole:
  - `slug` (unikátní, používá se v URL `recept.html?slug=...`)
  - `title`, `story` (text příběhu, může obsahovat HTML z editoru)
  - `ingredients TEXT[]`, `instructions TEXT[]`
  - `image_url` (jen název souboru v bucketu, plnou URL skládá `ImageService.getImageUrl()`)
  - `is_published`, `featured`, `cooking_time`, `difficulty_level`, `servings`, `category`
- **Storage bucket:** `recipe-images` (Public). Obrázky se ukládají jako **WebP** (cca 100–400 kB místo 2–4 MB PNG) kvůli limitům bezplatného tarifu Supabase. Netlify funkce ukládají původní soubor z xAI a na WebP ho převede až admin v prohlížeči – když admin okno zavře dřív, dožene to tlačítko „Zmenšit obrázky". Soubory mají roční cache, proto se nikdy nepřepisují pod stejným názvem.
- **RLS:** veřejné čtení publikovaných receptů; zápis jen pro autentifikované. Platí pro `recipes` i `about_page`. V listopadu 2026 se ukázalo, že na produkci bylo RLS na obou tabulkách vypnuté (koncepty šly číst anonymně) – po každém zásahu do schématu zkontroluj Supabase → Advisors → Security. Registrace nových uživatelů musí být v Supabase Auth vypnutá, protože zápis smí každý přihlášený.

## Konvence

- **Jazyk:** UI a komentáře v kódu česky. Identifikátory, git commity a názvy souborů anglicky.
- **Slug** generuje `Utils.createSlug()` – odstraňuje diakritiku, lowercase, spojuje pomlčkami. U existujícího receptu se slug při změně názvu **nepřegenerovává** (změnila by se URL).
- **Vkládání dat do HTML:** názvy a alt texty vždy přes `Utils.escapeHtml()` (v názvech jsou běžně uvozovky), suroviny a postup přes `Utils.toListItems()`, náhledy příběhu přes `Utils.storyPreview()`.
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
- **Načítání na `index.html`** dříve nefungovalo, teď bere `getLatestRecipe()` (řazeno `created_at DESC`, limit 1).
- **Náhled `story` v kartách/seznamech:** `story` může být HTML. Při zkracování přes `substring()` nikdy neřež syrové HTML – použij `Utils.storyPreview()` (nejdřív odstraní tagy), jinak se do karty dostane neuzavřený `<p>` a rozbije grid na `recepty.html` (následující recepty se zobrazí po jednom). Detail (`recept.html`) používá `formatStoryText()`, který HTML zvládá; s parametrem `maxLength` (titulka) vrací zkrácený textový náhled.
- **Sloupce v `recipes`:** čas je `cooking_time` (ne `prep_time`/`cook_time`), pole `notes` neexistuje. Stránky dřív četly neexistující sloupce a čas se proto nikdy nezobrazil.
- **Skrytá `<textarea required>`** (pod Quill editorem) tiše zablokuje odeslání formuláře – povinnost příběhu se proto hlídá v JS (`handleRecipeSubmit`).
- **Model přes env:** `ANTHROPIC_MODEL` čtou obě Netlify funkce. Novější modely (Fable 5.1+, Opus 5.5, Sonnet 5.5) odmítají vynucený `tool_choice`, na kterém obě funkce stojí.
- **Hosting je jen Netlify.** Web původně běžel na Vercelu a jeho GitHub napojení zůstalo aktivní i po přechodu na Netlify – rok nasazoval každý commit na `boomerchef.vercel.app` (duplicitní kopie bez AI funkcí). Vercel projekt byl smazán 14. 10. 2026. Pokud se u commitů na GitHubu znovu objeví status „Vercel", někdo napojení obnovil. Netlify na GitHub stav nasazení nehlásí, takže chybějící zelené zatržítko u commitu je v pořádku.
