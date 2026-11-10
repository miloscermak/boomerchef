# AI generování receptů – nastavení

Tahle pipeline umožní v administraci vložit **surový recept** a nechat Claude (Fable 5, záloha Opus 4.8)
vygenerovat hotový recept pro BoomerChef – příběh, standardizované suroviny, postup
a volitelně ilustrační obrázek (přes xAI Grok). Výsledek se uloží jako **koncept**
(`is_published = false`), který v adminu zkontroluješ a teprve pak publikuješ.

```
┌─────────────────┐   ┌──────────────────┐   ┌───────────────────┐
│ Admin: surový   │ → │  Netlify funkce  │ → │  Claude Fable 5   │
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
5. Případnou vlastní doménu přesměruj na Netlify (Domain settings).
6. Starý Vercel projekt **smaž** (Vercel → projekt → Settings → Delete Project). Samotné
   přesměrování domény nestačí – Vercel je napojený na GitHub a dál by nasazoval každý
   commit na `boomerchef.vercel.app` (bez AI funkcí, jako duplicitní kopie webu).

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
| `ANTHROPIC_MODEL` | *(volitelné – raději nenastavovat)* | přebíjí model v **obou** funkcích: text receptu (default `claude-fable-5`) i prompt na obrázek (default `claude-opus-4-8`) |
| `XAI_IMAGE_MODEL` | `grok-imagine-image-quality` *(volitelné)* | model pro obrázek |

Po uložení spusť **Deploys → Trigger deploy → Deploy site**.

> **Pozor při změně modelu:** obě funkce si výstup vynucují přes `tool_choice: {type: "tool"}`.
> Novější modely (Fable 5.1 a 5.2, Opus 5.5, Sonnet 5.5) vynucený tool odmítají chybou 400,
> takže pouhá změna `ANTHROPIC_MODEL` na ně nestačí – musel by se upravit i kód funkcí.

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
- **Anthropic 529 (overloaded):** zkus to za chvíli znovu, případně dočasně `ANTHROPIC_MODEL=claude-sonnet-4-6`.
- **Obrázek chybí, text je OK:** zkontroluj `XAI_API_KEY` a model `grok-imagine-image-quality`
  (název modelu se může u xAI časem změnit – nastav `XAI_IMAGE_MODEL`). Text se uloží
  i bez obrázku, obrázek pak dodáš ručně v editaci.
- **Supabase insert 401/403:** použil jsi anon místo `service_role`? RLS write potřebuje service role.
- **„Neautorizovaný požadavek" v logu funkce:** vypršela přihlašovací session – odhlas a přihlas se.
  Background funkce vrací adminu vždy hned 202, takže tuhle chybu uvidíš jen v Netlify logu
  (v adminu se projeví tak, že se recept neobjeví).

---

*Verze 1.0 · červen 2026*
