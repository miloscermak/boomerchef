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

-- Tabulka je připravena pro vkládání receptů přes administrační rozhraní

-- Kontrola
SELECT title, slug, is_published FROM recipes;