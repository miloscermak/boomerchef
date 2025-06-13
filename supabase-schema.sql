-- Vytvoření tabulky pro recepty
CREATE TABLE IF NOT EXISTS recipes (
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
    cooking_time INTEGER, -- v minutách
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    servings INTEGER DEFAULT 4,
    category VARCHAR(50) DEFAULT 'hlavní jídlo'
);

-- Index pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_published ON recipes(is_published);
CREATE INDEX IF NOT EXISTS idx_recipes_featured ON recipes(featured);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

-- Trigger pro automatickou aktualizaci updated_at
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

-- RLS (Row Level Security) politiky
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Každý může číst publikované recepty
CREATE POLICY "Všichni mohou číst publikované recepty" ON recipes
    FOR SELECT USING (is_published = true);

-- Pouze autentifikovaní uživatelé mohou upravovat recepty
CREATE POLICY "Pouze autentifikovaní uživatelé mohou upravovat" ON recipes
    FOR ALL USING (auth.role() = 'authenticated');

-- Vložení ukázkových dat
INSERT INTO recipes (title, slug, story, ingredients, instructions, image_url, image_alt, featured, category, cooking_time, servings) VALUES
(
    'Gulášová polévka podle babičky Boženy',
    'gulasova-polevka',
    'Tuto polévku vařila babička Božena každou neděli po návratu z kostela. Vůně se linula celým domem a všichni věděli, že je čas sednout si ke stolu. Recept předávala ústně, bez váhy, jen podle citu a zkušenosti. „Hrst tohoto, trochu tamtoho," říkávala s úsměvem.',
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
    'gulasova-polevka.jpg',
    'Gulášová polévka',
    true,
    'polévky',
    90,
    4
),
(
    'Smažený sýr jako od maminky',
    'smazeny-syr',
    'Maminka ho dělala vždy v pátek, když už nevěděla, co na oběd. Jednoduché jídlo, které ale vyžadovalo perfektní timing. Sýr musel být zlatavý, ale ne spálený, strouhanková křupavá a brambory nadýchané. „Není to žádná věda," říkávala, „ale chce to cit."',
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
    'smazeny-syr.jpg',
    'Smažený sýr',
    false,
    'hlavní jídlo',
    25,
    2
),
(
    'Svíčková na smetaně',
    'svickova',
    'Královské jídlo českých stolů. Teta Anežka ji dělala jen při velkých příležitostech - křtiny, svatby, významná výročí. Příprava trvala celý den, ale výsledek stál za to. „Svíčková se nedělá, svíčková se tvoří," říkávala a omáčku míchala hodiny, dokud nebyla jako samet.',
    ARRAY[
        '1 kg hovězí svíčkové',
        '2 mrkve',
        '2 petržele',
        '1 celer',
        '2 cibule',
        '250ml smetany ke šlehání',
        '2 lžíce hladké mouky',
        '1 lžíce másla',
        'Koření: bobkový list, nové koření, pepř',
        'Houskové knedlíky',
        'Brusinky na ozdobu'
    ],
    ARRAY[
        'Maso osolíme a na rozpáleném másle opečeme ze všech stran.',
        'Přidáme nakrájenou zeleninu a koření.',
        'Zalijeme vodou a dusíme 2 hodiny do měkka.',
        'Maso vyjmeme a necháme vychladnout.',
        'Zeleninu s vývarem rozmixujeme.',
        'Mouku zasmahneme na másle, přidáme protlak a smetanu.',
        'Omáčku precedíme a dochutíme.',
        'Maso nakrájíme, zalijeme omáčkou a podáváme s knedlíky.'
    ],
    'svickova.jpg',
    'Svíčková na smetaně',
    true,
    'hlavní jídlo',
    180,
    6
);