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

-- Tabulka je připravena pro vkládání receptů přes administrační rozhraní