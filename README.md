# BoomerChef - Recepty s příběhem

Elegantní web zaměřený na uchovávání tradičních receptů s nostalgickými příběhy.
Statický frontend (HTML + CSS + vanilla JS) nad Supabase, s AI pipeline pro
generování receptů přes Claude a xAI Grok. Hostováno na Netlify, doména
[boomerchef.cz](https://boomerchef.cz).

## Struktura projektu

```
boomerchef/
├── index.html                  # Titulní stránka (nejnovější recept)
├── recepty.html                # Přehled všech receptů (grid)
├── recept.html                 # Detail receptu (?slug=...)
├── recept-tisk.html            # Tisková verze receptu
├── o-projektu.html             # O projektu
├── admin.html                  # Administrace (přihlášení přes Supabase Auth)
├── admin-script.js             # Logika administrace + AI generování
├── admin-styles.css            # Styly administrace
├── styles.css                  # Hlavní styly + CSS custom properties
├── config.js                   # Supabase klient + servisní moduly
├── netlify/functions/          # Serverless funkce pro AI generování
│   ├── generate-recipe-background.js   # surový recept → Claude → koncept
│   └── generate-image-background.js    # dogenerování obrázku k receptu
├── netlify.toml                # Konfigurace Netlify
├── images/                     # Statické obrázky (placeholder)
├── AI-PIPELINE.md              # Návod na AI pipeline
├── SUPABASE-SETUP.md           # Návod na Supabase
└── README.md                   # Tento soubor
```

## Funkce

- **Responsivní design** - optimalizované pro desktop i mobil
- **Elegantní typografie** - Playfair Display (nadpisy), Inter (text)
- **Recepty na vlastních URL** - každý recept má adresu `recept.html?slug=...` (žádné modaly)
- **AI generování receptů** - z surového receptu vznikne příběh, suroviny a postup (Claude Opus 4.8)
- **AI ilustrace** - obrázky ve stylu klasické francouzské kuchařské ilustrace (xAI Grok)
- **Administrace** - správa receptů, koncepty, publikování jedním klikem
- **Optimalizace pro tisk** - dedikovaná tisková verze receptu

## Backend - Supabase

- **Databáze receptů** - PostgreSQL (tabulka `recipes`, schema v `supabase-schema.sql`)
- **Úložiště obrázků** - Supabase Storage, bucket `recipe-images`
- **Autentizace** - Supabase Auth pro přístup do administrace
- **RLS** - veřejné čtení publikovaných receptů, zápis jen pro přihlášené

Podrobný návod: `SUPABASE-SETUP.md`. Přístupové údaje (URL + anon key) jsou v `config.js`
(anon key je veřejný, OK; service role key tam **nikdy** nesmí být - je jen v Netlify env).

## AI pipeline

V administraci (záložka **🤖 Generovat z AI**) vložíš surový recept a Netlify funkce
zavolá Claude (strukturovaný JSON přes Tool Use) a volitelně xAI Grok na ilustraci.
Výsledek se uloží jako **koncept** (`is_published=false`), který zkontroluješ a publikuješ.

Tajné klíče (Anthropic, xAI, Supabase service role) jsou jen v Netlify env, nikdy v repu.
Kompletní návod a seznam env proměnných: **`AI-PIPELINE.md`**.

## Jak přidat nový recept

1. Otevři `admin.html` (na produkci `boomerchef.cz/admin.html`) a přihlas se.
2. Buď **🤖 Generovat z AI** (vlož surový recept, nech vygenerovat), nebo **Přidat recept** (ručně).
3. Recept zkontroluj a publikuj (tlačítko „Publikovat" u receptu v seznamu).

## Hosting

- **Netlify** (kvůli serverless funkcím), automatický deploy z větve `main` na GitHubu.
- **Doména** `boomerchef.cz` vedená u Active24, DNS míří na Netlify (A + CNAME), HTTPS přes Let's Encrypt.
- Statickou část lze otevřít i lokálně přímo v prohlížeči; AI funkce běží jen na Netlify.

## Barevná paleta

- **Primární (hnědá):** `#8B4513`
- **Krémová:** `#FFF8E7`
- **Šedé tóny:** světlá `#F5F5F5`, střední `#666`, tmavá `#333`

## Typografie

- **Nadpisy:** Playfair Display (serif)
- **Běžný text:** Inter (sans-serif)
