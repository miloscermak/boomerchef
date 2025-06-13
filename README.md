# Boomerchef - Recepty s příběhem

Elegantní web zaměřený na uchovávání tradičních receptů s nostalgickými příběhy.

## Struktura projektu

```
boomerchef/
├── index.html          # Titulní stránka s receptem dne
├── recepty.html        # Přehled všech receptů
├── o-projektu.html     # Informace o projektu
├── styles.css          # Všechny CSS styly
├── script.js           # JavaScript funkcionalita
├── images/             # Obrázky receptů
└── README.md           # Tento soubor
```

## Funkce

- **Responsivní design** - optimalizované pro desktop i mobilní zařízení
- **Elegantní typografie** - serifové fonty pro nadpisy, bezpatkové pro text
- **Minimalistický design** - čistý, velkorysý layout
- **Recept dne** - náhodně vybraný recept na hlavní stránce
- **Modal okna** - detail receptu v překryvném okně
- **Optimalizace pro tisk** - recepty lze snadno vytisknout
- **Rychlé načítání** - statické HTML soubory

## Backend - Supabase

Web nyní používá Supabase jako backend pro:
- **Databázi receptů** - PostgreSQL databáze
- **Úložiště obrázků** - Supabase Storage
- **Autentizaci** - pro administrátorský přístup

### Rychlé nastavení

1. Vytvořte účet na [supabase.com](https://supabase.com)
2. Vytvořte nový projekt
3. Importujte SQL schema ze souboru `supabase-schema.sql`
4. Vytvořte Storage bucket `recipe-images`
5. Aktualizujte přístupové údaje v `config.js`

**Podrobný návod najdete v souboru `SUPABASE-SETUP.md`**

## Jak přidat nový recept

### Přes administrační rozhraní (doporučeno)
1. Otevřete `admin.html` v prohlížeči
2. Přihlaste se admin údaji
3. Klikněte na "Přidat recept"
4. Vyplňte formulář a nahrajte obrázek
5. Klikněte na "Uložit recept"

### Přímo do databáze
Recepty můžete přidat také přímo přes Supabase SQL Editor.

## Obrázky

Pro správné zobrazení potřebujete přidat obrázky receptů do složky `images/`:

- `gulasova-polevka.jpg`
- `smazeny-syr.jpg`
- `svickova.jpg`
- `knedliky.jpg`
- `gulas.jpg`
- `bramboraky.jpg`

Doporučené rozměry: 800x600px, formát JPG nebo PNG.

## Spuštění

Otevřete `index.html` v prohlížeči nebo nasaďte soubory na webový server.

## Barevná paleta

- **Primární barva:** #8B4513 (elegantní hnědá)
- **Krémová:** #FFF8E7
- **Světle šedá:** #F5F5F5
- **Střední šedá:** #666
- **Tmavě šedá:** #333
- **Bílá:** #FFFFFF
- **Černá:** #000000

## Typografie

- **Nadpisy:** Playfair Display (serif)
- **Běžný text:** Inter (sans-serif)