// Netlify Background Function: generate-recipe
// Vstup (POST JSON): { recipe_text: string, generate_image?: boolean }
// Autorizace: Bearer <Supabase access token> v hlavičce Authorization
//
// Pipeline:
//   1) ověří přihlášení (Supabase token)
//   2) zavolá Claude (Opus 4.8) s Tool Use → strukturovaný recept jako JSON
//   3) (volitelně) vygeneruje obrázek přes xAI Grok → upload do Supabase Storage
//   4) vloží recept do tabulky `recipes` jako KONCEPT (is_published=false)
//
// Background funkce (suffix -background) má limit 15 minut, takže pohodlně
// stihne i pomalejší generování textu + obrázku. Klient dostane hned 202 a
// průběžně se dotazuje databáze, jestli se koncept už objevil.
//
// Vyžaduje Netlify env proměnné (viz AI-PIPELINE.md):
//   ANTHROPIC_API_KEY      – klíč k Anthropic API
//   ANTHROPIC_MODEL        – volitelné, default 'claude-opus-4-8'
//   XAI_API_KEY            – klíč k xAI (Grok) pro generování obrázku
//   XAI_IMAGE_MODEL        – volitelné, default 'grok-2-image-1212'
//   SUPABASE_URL           – např. https://odggjljpjvshwcagxcza.supabase.co
//   SUPABASE_SERVICE_ROLE  – service role klíč (zápis do recipes přes RLS)
//   SUPABASE_ANON_KEY      – anon klíč (jen na ověření tokenu uživatele)

const fetch = (() => {
  try { return require('node-fetch'); }
  catch (e) { return globalThis.fetch; }
})();

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const XAI_IMAGE_MODEL = process.env.XAI_IMAGE_MODEL || 'grok-2-image-1212';
const BUCKET = 'recipe-images';

// Kategorie musí odpovídat <select> v admin.html
const CATEGORIES = ['hlavní jídlo', 'polévky', 'předkrmy', 'dezerty', 'pečivo', 'nápoje', 'ostatní'];

// --- System prompt: hlas a struktura článku podle projektu RecepiWriter ---
// Jeden plný příklad slouží jako "few-shot" kotva pro autorský hlas (lehký,
// vtipný, digresivní, plný zajímavostí, většinou ve třetí osobě).
const SYSTEM_PROMPT = `Jsi zkušený kuchařský bloger píšící pro web BoomerChef – web s tradičními recepty a nostalgickými příběhy. Tvým úkolem je přetvořit dodaný základní recept do poutavého, standardizovaného formátu v češtině.

VŽDY zavolej tool save_recipe a předej do něj kompletní strukturovaný recept. Nikdy nepiš odpověď jako plain text, vždy jen jako tool call.

AUTORSKÝ HLAS (pole story_html):
- Autorem je muž středního věku: lehký, nebere se vážně, napadají ho nečekané souvislosti. Většinou píše ve třetí osobě (NE v ich-formě "já vařím").
- Článek se zaměřuje na HISTORII jídla nebo na jeho hlavní ingredienci – ne na postup vaření. Postup patří do pole instructions.
- Délka 700–900 slov. Humorně, zábavně, s konkrétními historkami, jmény, letopočty a překvapivými fakty. Bez klišé a superlativů.
- Formát: čisté HTML odstavce. Povolené tagy POUZE: <p>, <strong>, <em>. Žádné nadpisy, seznamy, <br>, <div>. Každý odstavec obal do <p>...</p>.

INGREDIENCE (pole ingredients): pole stringů, každý jedna surovina s množstvím. Pevné suroviny převeď na gramy (g), tekuté na mililitry (ml). Pokud recept neuvádí přesné množství, udělej rozumný odhad. Bez čísla na začátku, např. "vepřová plec (1000 g)".

POSTUP (pole instructions): pole stringů, každý jeden krok. NEpřidávej čísla na začátek (číslování dělá web sám). Kroky jasné a srozumitelné, se všemi detaily.

Dále odhadni metadata: title (název jídla), category (jedna z: hlavní jídlo, polévky, předkrmy, dezerty, pečivo, nápoje, ostatní), cooking_time (minuty), servings (porce), difficulty_level (1–5).

OBRÁZEK: image_prompt je ANGLICKÝ prompt pro generátor obrázků – fotorealistická, chutně nasvícená fotka hotového pokrmu na talíři, rustikální/nostalgická atmosféra, přírodní světlo, žádný text v obrázku. image_alt je krátký český popis obrázku (1 věta).

UKÁZKA HLASU (takto má znít story_html, jen místo holého textu vrať odstavce v <p>):
Je to jeden z nejoblíbenějších českých gastronomických omylů. A ochotně napravovaných, těmi znalými. Totiž že segedínský guláš nevznikl v maďarském městě Szegedu, a dokonce s ním ani nemá nic společného. Ale v Maďarsku vznikl, podle legendy v roce 1846, a proslavil ho básník Sándor Petőfi. Jeden z nejznámějších maďarských literátů (se slovenskými kořeny) ho však taky nevymyslel. To se připisuje jeho méně známému kolegovi Jozsefu Székelymu. A jako mnoho jiných jídel vzniklo i toto vlastně omylem. Třiadvacetiletý Petőfi a o dva roky mladší Székely se sešli v restauraci Komló Kert v Pešti. Bylo déle po poledni a hostinský už neměl žádné z původně připravených jídel. V kuchyni bylo jen vařené kysané zelí a zbytek vepřového guláše. „Smíchejte to a servírujte!", prohlásil Székely – věta pro segedínský guláš významem srovnatelná s Galileovou „A přece se točí!" pro astronomii. Z původní nouzovky se stal regulérní pokrm.`;

const RECIPE_TOOL = {
  name: 'save_recipe',
  description: 'Uloží strukturovaný recept pro web BoomerChef. Vždy zavolej s kompletními daty.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Český název jídla, max. 80 znaků, bez uvozovek.' },
      story_html: { type: 'string', description: 'Článek o historii jídla / hlavní ingredienci, 700–900 slov, HTML odstavce <p>. Povolené tagy jen <p>, <strong>, <em>.' },
      ingredients: { type: 'array', items: { type: 'string' }, description: 'Suroviny, každá s množstvím v g nebo ml. Bez číslování.' },
      instructions: { type: 'array', items: { type: 'string' }, description: 'Kroky postupu, každý jako jeden prvek pole. Bez čísel na začátku.' },
      category: { type: 'string', enum: CATEGORIES, description: 'Kategorie jídla.' },
      cooking_time: { type: 'integer', description: 'Čas přípravy v minutách.' },
      servings: { type: 'integer', description: 'Počet porcí.' },
      difficulty_level: { type: 'integer', description: 'Obtížnost 1–5.' },
      image_prompt: { type: 'string', description: 'Anglický prompt pro generátor obrázku hotového pokrmu.' },
      image_alt: { type: 'string', description: 'Krátký český alt text obrázku, 1 věta.' }
    },
    required: ['title', 'story_html', 'ingredients', 'instructions', 'image_prompt', 'image_alt']
  }
};

function envOrError(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Chybí env proměnná: ${name}`);
  return v;
}

// Slug generátor – stejná logika jako Utils.createSlug v config.js
function makeSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

// Ověření přihlášeného uživatele přes Supabase Auth (aby endpoint nešel zneužít).
async function verifyUser(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const supabaseUrl = envOrError('SUPABASE_URL');
  const anonKey = envOrError('SUPABASE_ANON_KEY');
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function callClaude(recipeText) {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [RECIPE_TOOL],
    tool_choice: { type: 'tool', name: RECIPE_TOOL.name },
    messages: [{ role: 'user', content: `Zpracuj tento recept:\n\n${recipeText}` }]
  };

  const apiKey = envOrError('ANTHROPIC_API_KEY');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
  }

  const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === RECIPE_TOOL.name);
  if (!toolUse) {
    throw new Error(`Claude nezavolal tool. stop_reason=${data.stop_reason}`);
  }
  const parsed = toolUse.input || {};
  for (const k of ['title', 'story_html', 'ingredients', 'instructions']) {
    if (!parsed[k] || (Array.isArray(parsed[k]) && parsed[k].length === 0)) {
      throw new Error(`Tool input neobsahuje povinné pole "${k}".`);
    }
  }
  return parsed;
}

// Generování obrázku přes xAI Grok + upload do Supabase Storage.
async function generateImage(prompt, slug) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('XAI_API_KEY není nastavený – přeskakuji obrázek.');
    return null;
  }
  try {
    const res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: XAI_IMAGE_MODEL, prompt, n: 1, response_format: 'b64_json' })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`xAI Images ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
    }
    const item = data.data?.[0] || {};
    let buffer;
    if (item.b64_json) {
      buffer = Buffer.from(item.b64_json, 'base64');
    } else if (item.url) {
      const imgRes = await fetch(item.url);
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      throw new Error('xAI nevrátil b64_json ani url.');
    }
    const fileName = `${slug}-${Date.now()}.png`;
    await uploadImage(buffer, fileName);
    return fileName; // do DB ukládáme jen název souboru (ImageService.getImageUrl složí URL)
  } catch (e) {
    console.error('Generování obrázku selhalo:', e.message);
    return null;
  }
}

async function uploadImage(buffer, fileName) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'image/png',
      'x-upsert': 'true'
    },
    body: buffer
  });
  if (!res.ok) {
    throw new Error(`Supabase Storage upload ${res.status}: ${await res.text()}`);
  }
}

// Najde volný slug (slug je v DB UNIQUE) – zkusí base, base-2, base-3 ...
async function findFreeSlug(base) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const res = await fetch(
    `${supabaseUrl}/rest/v1/recipes?select=slug&slug=like.${encodeURIComponent(base + '*')}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const rows = res.ok ? await res.json() : [];
  const taken = new Set((rows || []).map(r => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

async function insertRecipe(payload) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const res = await fetch(`${supabaseUrl}/rest/v1/recipes`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Supabase insert ${res.status}: ${data.message || JSON.stringify(data)}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Background funkce stejně vrací 202; veškerou práci děláme "na pozadí".
  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    const authed = await verifyUser(authHeader);
    if (!authed) {
      console.error('Neautorizovaný požadavek na generate-recipe – končím.');
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const input = JSON.parse(event.body || '{}');
    const recipeText = (input.recipe_text || '').trim();
    const wantImage = !!input.generate_image;
    if (!recipeText) {
      console.error('Prázdný recipe_text.');
      return { statusCode: 400, body: 'Missing recipe_text' };
    }

    // 1) Claude → strukturovaný recept
    const recipe = await callClaude(recipeText);

    // 2) Slug + volitelný obrázek
    const slug = await findFreeSlug(makeSlug(recipe.title));
    let imageUrl = null;
    if (wantImage && recipe.image_prompt) {
      imageUrl = await generateImage(recipe.image_prompt, slug);
    }

    // 3) Vložení jako KONCEPT (is_published=false)
    const category = CATEGORIES.includes(recipe.category) ? recipe.category : 'hlavní jídlo';
    const difficulty = Math.min(5, Math.max(1, parseInt(recipe.difficulty_level) || 2));
    await insertRecipe({
      title: recipe.title,
      slug,
      story: recipe.story_html,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      image_url: imageUrl,
      image_alt: recipe.image_alt || recipe.title,
      category,
      servings: parseInt(recipe.servings) || 4,
      cooking_time: parseInt(recipe.cooking_time) || null,
      difficulty_level: difficulty,
      is_published: false,
      featured: false
    });

    console.log(`[generate-recipe] hotovo: ${recipe.title} (slug ${slug}, obrázek: ${!!imageUrl})`);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('generate-recipe error:', error.message);
    return { statusCode: 500, body: error.message };
  }
};
