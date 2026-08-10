import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';

const OLLAMA_URL = 'http://localhost:11434';

function ollamaApi(system: string, prompt: string): Promise<{ response: string; thinking: string }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'stockchef-qwen',
      system,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 12288,
      },
    });

    const req = http.request(
      `${OLLAMA_URL}/api/generate`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const debugPath = path.join(os.tmpdir(), 'stockchef-ollama-debug.json');
            fs.writeFileSync(debugPath, JSON.stringify({
              response_len: (json.response || '').length,
              thinking_len: (json.thinking || '').length,
              done_reason: json.done_reason,
              eval_count: json.eval_count,
            }, null, 2));
            resolve({ response: json.response || '', thinking: json.thinking || '' });
          } catch {
            resolve({ response: data, thinking: '' });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(600000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function extractJson(text: string): string {
  try { JSON.parse(text); return text; } catch {}
  const mdMatch = text.match(/```(?:json)?\s*?(\{[\s\S]*?\})\s*?```/);
  if (mdMatch) { try { JSON.parse(mdMatch[1]); return mdMatch[1].trim(); } catch {} }
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (text[i] === '}') { depth--; if (depth === 0 && start >= 0) { const c = text.slice(start, i + 1); try { JSON.parse(c); return c; } catch {} } }
  }
  throw new Error('No JSON found in response');
}

export async function parseRecipeFromText(text: string): Promise<any> {
  const system = 'Eres un extractor de recetas. Devuelve SOLO un JSON válido, sin markdown ni explicaciones.';
  const prompt = `Extrae esta receta como JSON:
{"title":"","description":"","base_servings":4,"prep_time":15,"cook_time":30,"difficulty":"medium","category":"Principal","instructions":"","calories":null,"protein":null,"carbs":null,"fat":null,"ingredients":[{"name":"","quantity":1,"unit":"unidad","category":"Verduras"}]}
Categorías: Desayuno|Ensalada|Sopa|Principal|Snack|Postre|General. Dificultad: easy|medium|hard.
Cat. ingrediente: Verduras|Frutas|Carnes|Pescados|Lácteos y huevos|Pastas y cereales|Legumbres|Especias|Aceites y condimentos|Frutos secos|Panadería|Congelados|Conservas y caldos|Repostería|Otros.

RECETA:\n${text}\n\nJSON:`;

  const { response, thinking } = await ollamaApi(system, prompt);
  const content = response || thinking;
  if (!content) throw new Error('Respuesta vacía de Ollama');
  return JSON.parse(extractJson(response || thinking).replace(/,(\s*[}\]])/g, '$1'));
}

export async function suggestRecipesFromPantry(pantryItems: string, libraryRecipes: string): Promise<string> {
  const system = 'Eres un chef profesional. Responde en español.';
  const prompt = `Despensa:\n${pantryItems}\n\nRecetas:\n${libraryRecipes}\n\nSugiere 3 platos priorizando lo que caduca antes. Para cada uno: nombre, qué ingredientes uso, qué falta comprar, tiempo estimado.`;

  const { response, thinking } = await ollamaApi(system, prompt);
  return response || thinking || 'Sin respuesta de Ollama';
}

export async function generateWeeklyMealPlan(pantryItems: string, recipeTitles: string, preferences: string): Promise<string> {
  const system = 'Eres un planificador de comidas. Responde en español.';
  const prompt = `Plan semanal (lunes-domingo, 4 comidas/día).\nDespensa:\n${pantryItems}\n\nRecetas:\n${recipeTitles}\n\nPreferencias: ${preferences || 'Equilibrado, mediterráneo'}. Prioriza ingredientes de la despensa.`;

  const { response, thinking } = await ollamaApi(system, prompt);
  return response || thinking || 'Sin respuesta de Ollama';
}
