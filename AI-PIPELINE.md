# AI generování receptů – nastavení

Tahle pipeline umožní v administraci vložit **surový recept** a nechat Claude (Opus 4.8)
vygenerovat hotový recept pro BoomerChef – příběh, standardizované suroviny, postup
a volitelně ilustrační obrázek (přes xAI Grok). Výsledek se uloží jako **koncept**
(`is_published = false`), který v adminu zkontroluješ a teprve pak publikuješ.

```
┌─────────────────┐   ┌──────────────────┐   ┌───────────────────┐
│ Admin: surový   │ → │  Netlify funkce  │ → │  Claude Opus 4.8  │
│ recept (text)   │   │ generate-recipe  │   │  (Tool Use → JSON)│
└─────────────────┘   └────────┬─────────┘   └─────────┬─────────┘
                               │                       │
                  ┌────────────┘            ┌──────────┘
                  ↓                         ↓
          ┌──────────────┐          ┌──────────────────┐
          │  xAI Grok    │ → upload │   Supabase       │
          │  (obrázek)   │  Storage │   recipes        │
          └──────────────┘          │ is_published=    │
                                    │      false       │
                                    └────────┬─────────┘
                                             ↓
                              ┌──────────────────────────┐
                              │ Admin → koncept → kontrola│
                              │ → Publikovat              │
                              └──────────────────────────┘
```

Architektura je převzatá z osvědčené pipeline projektu `vedci` (viz tam `DRAFT-PIPELINE.md`).

---

## 1) Přesun hostingu na Netlify

Web dosud běžel na Vercelu. Serverless funkce (s tajným API klíčem) ale potřebujeme
na Netlify, kde je zbytek pipeline.

1. Na [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
2. Vyber GitHub repo `miloscermak/boomerchef`, větev `main`.
3. Build nastavení Netlify načte z `netlify.toml` automaticky (publish = root, funkce v `netlify/functions`).
4. Deploy. Web pojede na `nazev.netlify.app`.
5. Případnou vlastní doménu přesměruj na Netlify (Domain settings) a starý Vercel projekt
   můžeš pak vypnout.

> Statická část webu funguje úplně stejně jako dřív – jen přibyla funkce navíc.

---

## 2) Klíče v Supabase a xAI

- **Supabase Service Role klíč:** Supabase → Project Settings → API → `service_role`.
  POZOR: má plný přístup k DB, patří jen do Netlify env, **nikdy** do `config.js`.
- **Supabase anon klíč:** tamtéž, `anon` (veřejný, je už v `config.js`).
- **Anthropic API klíč:** [console.anthropic.com](https://console.anthropic.com) → API Keys.
- **xAI API klíč:** [console.x.ai](https://console.x.ai) → API Keys (na obrázky přes Grok).

---

## 3) Netlify environment variables

Netlify → Site → **Site settings → Environment variables** přidej:

| Klíč | Hodnota | Účel |
|------|---------|------|
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Claude API (generování receptu) |
| `XAI_API_KEY` | `xai-…` | xAI Grok (generování obrázku) |
| `SUPABASE_URL` | `https://odggjljpjvshwcagxcza.supabase.co` | přístup k DB a Storage |
| `SUPABASE_SERVICE_ROLE` | `eyJ…` (service_role) | zápis konceptu (bypass RLS) |
| `SUPABASE_ANON_KEY` | `eyJ…` (anon) | ověření přihlášeného admina |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` *(volitelné)* | model pro text |
| `XAI_IMAGE_MODEL` | `grok-imagine-image` *(volitelné)* | model pro obrázek |

Po uložení spusť **Deploys → Trigger deploy → Deploy site**.

---

## 4) Jak to používat

1. V administraci (`admin.html`) otevři záložku **🤖 Generovat z AI**.
2. Vlož surový recept (suroviny + postup, klidně rozsypaně zkopírované).
3. Nech zaškrtnuté „Vygenerovat i ilustrační obrázek" (nebo odškrtni).
4. Klikni **Vygenerovat recept**. Běží to ~1–2 minuty (nech okno otevřené).
5. Až je hotovo, koncept se automaticky otevře v editačním formuláři.
   Zkontroluj příběh, suroviny, postup, obrázek.
6. Zaškrtni **Publikovat recept** a ulož.

Koncepty (nepublikované recepty) vidíš i v záložce **Recepty** se štítkem „Koncept".

---

## 5) Troubleshooting

- **Recept se neobjeví do pár minut:** Netlify → Functions → `generate-recipe-background` → Logs.
- **„Chybí env proměnná …" v logu:** nezapomněl jsi přidat všech 5 povinných proměnných a redeploy?
- **Anthropic 401:** špatný `ANTHROPIC_API_KEY`.
- **Anthropic 400 (overloaded):** zkus dočasně `ANTHROPIC_MODEL=claude-sonnet-4-6`.
- **Obrázek chybí, text je OK:** zkontroluj `XAI_API_KEY` a model `grok-imagine-image`
  (název modelu se může u xAI časem změnit – nastav `XAI_IMAGE_MODEL`). Text se uloží
  i bez obrázku, obrázek pak dodáš ručně v editaci.
- **Supabase insert 401/403:** použil jsi anon místo `service_role`? RLS write potřebuje service role.
- **401 Unauthorized hned po kliknutí:** vypršela přihlašovací session – odhlas a přihlas se.

---

*Verze 1.0 · červen 2026*
