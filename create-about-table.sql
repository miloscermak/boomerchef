-- Vytvoření tabulky pro obsah stránky "O projektu"
CREATE TABLE IF NOT EXISTS about_page (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT 'O projektu Boomerchef',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vložení výchozího obsahu
INSERT INTO about_page (content, title) VALUES (
    '<p>Boomerchef je osobní projekt Miloše Čermáka, který vznikl v rámci iniciativy Inspiruj.se. Jeho cílem je ukázat, jak může generativní umělá inteligence měnit svět žurnalistiky, tvorby obsahu – a třeba i receptů.</p>

<p>Tento web byl vytvořen s pomocí AI a generativní umělá inteligence se podílí také na jeho provozu. Zároveň platí, že všechny recepty jsou skutečně vyzkoušené a navazují na kuchařské texty, které Miloš od roku 2020 publikuje na svém blogu Jednoprocento.cz.</p>

<p>Boomerchef tak spojuje tradiční chutě s moderní technologií – a ukazuje, že AI nemusí být jen pro ajťáky a programátory, ale i pro ty, kdo rádi vaří, píší nebo tvoří. Zajímá vás, jak podpořit vlastní kreativitu a vášně pomocí AI? Přesně to učíme na našich kurzech a workshopech na Inspiruj.se.</p>

<p>A ano – na fotkách jsou opravdu ta jídla, která jsme doma uvařili. A někdy i snědli dřív, než jsme je stihli vyfotit.</p>',
    'O projektu Boomerchef'
) ON CONFLICT DO NOTHING;

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_about_page_updated_at 
    BEFORE UPDATE ON about_page 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();