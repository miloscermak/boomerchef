// Netlify Background Function: generate-image
// Vstup (POST JSON): { recipe_id: string }
// Autorizace: Bearer <Supabase access token> v hlavičce Authorization
//
// Dogeneruje (nebo přegeneruje) ilustrační obrázek k EXISTUJÍCÍMU receptu:
//   1) ověří přihlášení
//   2) načte recept z DB (title, story, slug)
//   3) nechá Claude napsat výstižný anglický prompt na fotku pokrmu
//   4) vygeneruje obrázek přes xAI Grok → upload do Supabase Storage
//   5) uloží image_url (a image_alt) k receptu
//
// Tabulka recipes nemá uložený původní image_prompt, proto si ho pokaždé
// necháme znovu napsat z názvu a příběhu – výsledek je tak vždy aktuální.
//
// Vyžaduje stejné env proměnné jako generate-recipe-background.js.

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const XAI_IMAGE_MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image-quality';
const BUCKET = 'recipe-images';

const PROMPT_TOOL = {
  name: 'save_image_prompt',
  description: 'Uloží anglický prompt pro generátor obrázku a český alt text.',
  input_schema: {
    type: 'object',
    properties: {
      image_prompt: { type: 'string', description: 'ANGLICKÝ prompt pro ilustraci. Styl VŽDY: klasická francouzská kuchařská ilustrace – barevná kresba, černý inkoustový obrys a pastelové výplně, elegantní, horizontální kompozice (na šířku). Hotový pokrm na talíři/servírovací nádobě, vhodné detaily (příbory, ubrousek, decentní dekorace). Žádný text ani písmena. Zakomponuj hlavní ingredience a finální vzhled pokrmu.' },
      image_alt: { type: 'string', description: 'Krátký český alt text obrázku, 1 věta.' }
    },
    required: ['image_prompt', 'image_alt']
  }
};

function envOrError(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Chybí env proměnná: ${name}`);
  return v;
}

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

async function fetchRecipe(id) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const res = await fetch(
    `${supabaseUrl}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}&select=id,title,story,slug`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const rows = res.ok ? await res.json() : [];
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// Z názvu a příběhu necháme Claude napsat anglický prompt na fotku jídla.
async function buildImagePrompt(recipe) {
  // Příběh zkrátíme – stačí kontext, ne celý text.
  const storySnippet = (recipe.story || '').replace(/<[^>]+>/g, ' ').slice(0, 800);
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    tools: [PROMPT_TOOL],
    tool_choice: { type: 'tool', name: PROMPT_TOOL.name },
    messages: [{
      role: 'user',
      content: `Napiš anglický prompt pro ILUSTRACI hotového pokrmu k tomuto receptu, ve stylu klasické francouzské kuchařské ilustrace (barevná kresba, černý inkoustový obrys + pastelové výplně, horizontální kompozice). Zaměř se na hlavní ingredience a finální vzhled pokrmu na talíři.\n\nNázev: ${recipe.title}\n\nKontext (úryvek příběhu): ${storySnippet}`
    }]
  };
  const apiKey = envOrError('ANTHROPIC_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === PROMPT_TOOL.name);
  if (!toolUse || !toolUse.input?.image_prompt) {
    throw new Error('Claude nevrátil image_prompt.');
  }
  return toolUse.input;
}

async function generateImageBuffer(prompt) {
  const apiKey = envOrError('XAI_API_KEY');
  const res = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: XAI_IMAGE_MODEL, prompt, n: 1, response_format: 'b64_json' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`xAI Images ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  const item = data.data?.[0] || {};
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item.url) {
    const imgRes = await fetch(item.url);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  throw new Error('xAI nevrátil b64_json ani url.');
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
  if (!res.ok) throw new Error(`Supabase Storage upload ${res.status}: ${await res.text()}`);
}

async function updateRecipeImage(id, fileName, imageAlt) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const res = await fetch(`${supabaseUrl}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ image_url: fileName, image_alt: imageAlt })
  });
  if (!res.ok) throw new Error(`Supabase update ${res.status}: ${await res.text()}`);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    if (!(await verifyUser(authHeader))) {
      console.error('Neautorizovaný požadavek na generate-image – končím.');
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const input = JSON.parse(event.body || '{}');
    const recipeId = (input.recipe_id || '').trim();
    if (!recipeId) return { statusCode: 400, body: 'Missing recipe_id' };

    const recipe = await fetchRecipe(recipeId);
    if (!recipe) return { statusCode: 404, body: 'Recipe not found' };

    const { image_prompt, image_alt } = await buildImagePrompt(recipe);
    const buffer = await generateImageBuffer(image_prompt);
    const fileName = `${recipe.slug}-${Date.now()}.png`;
    await uploadImage(buffer, fileName);
    await updateRecipeImage(recipeId, fileName, image_alt || recipe.title);

    console.log(`[generate-image] hotovo: ${recipe.title} → ${fileName}`);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('generate-image error:', error.message);
    return { statusCode: 500, body: error.message };
  }
};
