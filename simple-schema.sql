-- Jednoduchá verze schema pro testování (bez RLS politik)

-- Smažeme existující tabulku pokud existuje
DROP TABLE IF EXISTS recipes;

-- Vytvoření tabulky pro recepty (bez RLS)
CREATE TABLE recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    story TEXT NOT NULL,
    ingredients TEXT[] NOT NULL,
    instructions TEXT[] NOT NULL,
    image_url VARCHAR(500),
    image_alt VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_published BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    cooking_time INTEGER,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    servings INTEGER DEFAULT 4,
    category VARCHAR(50) DEFAULT 'hlavní jídlo'
);

-- Indexy
CREATE INDEX idx_recipes_slug ON recipes(slug);
CREATE INDEX idx_recipes_published ON recipes(is_published);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);

-- Trigger pro updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at 
    BEFORE UPDATE ON recipes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Vložení testovacích dat
INSERT INTO recipes (title, slug, story, ingredients, instructions, category, cooking_time, servings, featured) VALUES
(
    'Gulášová polévka podle babičky Boženy',
    'gulasova-polevka',
    'Tuto polévku vařila babička Božena každou neděli po návratu z kostela. Vůně se linula celým domem a všichni věděli, že je čas sednout si ke stolu.',
    ARRAY[
        '500g hovězího masa na guláš',
        '2 velké cibule',
        '3 lžíce sádla nebo oleje',
        '2 lžíce sladké papriky',
        '1 lžíce rajčatového protlaku',
        '2 stroužky česneku',
        '1,5 l hovězího vývaru',
        '3 brambory',
        'Majoránka, sůl, pepř',
        '1 lžíce mouky'
    ],
    ARRAY[
        'Maso nakrájíme na kostky, osolíme a opepříme.',
        'Na sádle zpěníme nakrájenou cibuli dozlatova.',
        'Přidáme maso a opečeme ze všech stran.',
        'Zasypeme paprikou, rychle promícháme a přidáme protlak.',
        'Zalijeme vývarem, přidáme majoránku a dusíme 1 hodinu.',
        'Přidáme nakrájené brambory a vaříme dalších 20 minut.',
        'Nakonec zahustíme moukou rozšlehanou v troše vody.',
        'Podáváme s čerstvým chlebem a kyselými okurkami.'
    ],
    'polévky',
    90,
    4,
    true
),
(
    'Smažený sýr jako od maminky',
    'smazeny-syr',
    'Maminka ho dělala vždy v pátek, když už nevěděla, co na oběd. Jednoduché jídlo, které ale vyžadovalo perfektní timing.',
    ARRAY[
        '4 plátky hermelínu nebo eidamu (1 cm tlusté)',
        '2 vejce',
        '4 lžíce hladké mouky',
        '100g strouhanky',
        'Olej na smažení',
        'Sůl, pepř',
        'Brambory na přílohu',
        'Tatarská omáčka'
    ],
    ARRAY[
        'Sýr očistíme od kůrky a nakrájíme na plátky.',
        'Připravíme si trojici: mouku, rozšlehané vejce, strouhanku.',
        'Sýr nejprve obalíme v mouce, pak ve vejci a nakonec ve strouhance.',
        'V pánvi rozehřejeme dostatek oleje.',
        'Sýr smažíme z obou stran dozlatova.',
        'Podáváme ihned s vařenými bramborami a tatarskou omáčkou.'
    ],
    'hlavní jídlo',
    25,
    2,
    false
);

-- Kontrola
SELECT title, slug, is_published FROM recipes;