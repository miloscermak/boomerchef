# Nastavení Supabase pro Boomerchef

Tento návod vás provede nastavením Supabase backendu pro web Boomerchef.

## 1. Vytvoření Supabase projektu

1. Jděte na [supabase.com](https://supabase.com)
2. Zaregistrujte se nebo se přihlaste
3. Klikněte na "New project"
4. Zadejte název projektu: `boomerchef`
5. Vytvořte silné heslo pro databázi
6. Vyberte region (doporučujeme EU West pro Českou republiku)
7. Klikněte na "Create new project"

## 2. Nastavení databáze

1. V Supabase dashboardu jděte na záložku "SQL Editor"
2. Klikněte na "New query"
3. Zkopírujte obsah souboru `supabase-schema.sql` do editoru
4. Klikněte na "Run" pro spuštění SQL příkazů

## 3. Nastavení Storage

1. Jděte na záložku "Storage"
2. Klikněte na "Create new bucket"
3. Název bucket: `recipe-images`
4. Bucket type: `Public` (aby obrázky byly veřejně přístupné)
5. Klikněte na "Create bucket"

## 4. Nastavení RLS politik pro Storage

1. V Storage sekci klikněte na bucket `recipe-images`
2. Jděte na záložku "Policies"
3. Klikněte na "New policy"
4. Vyberte template "Give users access to own folder"
5. Nebo vytvořte vlastní politiku:

```sql
-- Každý může číst obrázky
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-images');

-- Pouze autentifikovaní uživatelé mohou nahrávat obrázky
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');

-- Pouze autentifikovaní uživatelé mohou mazat obrázky
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');
```

## 5. Získání přístupových klíčů

1. Jděte na záložku "Settings" > "API"
2. Zkopírujte tyto hodnoty:
   - Project URL
   - Anon public key

## 6. Konfigurace aplikace

1. Otevřete soubor `config.js`
2. Nahraďte placeholder hodnoty:

```javascript
const SUPABASE_CONFIG = {
    url: 'VÁŠ_SUPABASE_URL', // Nahraďte Project URL
    anonKey: 'VÁŠ_SUPABASE_ANON_KEY', // Nahraďte Anon public key
    bucketName: 'recipe-images'
};
```

## 7. Vytvoření admin uživatele

1. Jděte na záložku "Authentication" > "Users"
2. Klikněte na "Invite user"
3. Zadejte email a heslo pro administrátora
4. Uživatel dostane email s potvrzovacím odkazem

## 8. Test funkčnosti

1. Otevřete `admin.html` v prohlížeči
2. Přihlaste se pomocí admin údajů
3. Zkuste přidat první recept s obrázkem
4. Ověřte, že se recept zobrazuje na hlavním webu

## 9. Nahrání ukázkových dat

Ukázkové recepty jsou již v SQL schema, ale pokud chcete přidat více:

1. Použijte administrační rozhraní (`admin.html`)
2. Nebo vložte data přímo přes SQL Editor v Supabase

## 10. Nasazení (volitelné)

Pro produkční nasazení doporučujeme:

### Vercel (zdarma)
1. Nahrajte kód na GitHub
2. Propojte s Vercel
3. Nasaďte

### Netlify (zdarma)
1. Nahrajte kód na GitHub
2. Propojte s Netlify
3. Nasaďte

### Vlastní hosting
Stačí nahrát všechny soubory na webový server s podporou statických stránek.

## Struktura souborů po nastavení

```
boomerchef/
├── index.html              # Hlavní stránka
├── recepty.html            # Seznam receptů
├── o-projektu.html         # O projektu
├── admin.html              # Administrace
├── styles.css              # Hlavní styly
├── admin-styles.css        # Admin styly
├── script.js               # Frontend logika
├── admin-script.js         # Admin logika
├── config.js               # Supabase konfigurace
├── supabase-schema.sql     # SQL schema
├── SUPABASE-SETUP.md       # Tento návod
└── README.md               # Dokumentace
```

## Bezpečnostní doporučení

1. **Nikdy nesdílejte service role key** - používejte pouze anon key
2. **Používejte RLS politiky** pro zabezpečení dat
3. **Pravidelně zálohujte databázi** přes Supabase dashboard
4. **Omezte velikost nahrávaných obrázků** (doporučujeme max. 2MB)

## Řešení častých problémů

### Recepty se nenačítají
- Zkontrolujte konfiguraci v `config.js`
- Ověřte RLS politiky v Supabase
- Zkontrolujte Network tab v Developer Tools

### Obrázky se nezobrazují
- Ověřte bucket `recipe-images` v Storage
- Zkontrolujte RLS politiky pro Storage
- Ujistěte se, že bucket je Public

### Admin se nemůže přihlásit
- Ověřte email a heslo
- Zkontrolujte Authentication nastavení
- Ujistěte se, že uživatel potvrdil email

## Podpora

Pro další pomoc navštivte:
- [Supabase dokumentaci](https://supabase.com/docs)
- [Supabase komunitu](https://github.com/supabase/supabase/discussions)