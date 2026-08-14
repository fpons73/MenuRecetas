import { GoogleGenAI } from '@google/genai';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

const OLLAMA_URL = 'http://localhost:11434';
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Fallback para Ollama si no hubiera conexión o clave
async function ollamaFallback(system: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'qwen3.5:9b',
      system,
      prompt,
      stream: false,
    });

    const req = http.request(
      `${OLLAMA_URL}/api/generate`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.response || '');
          } catch {
            resolve(data);
          }
        });
      }
    );
    req.on('error', err => reject(err));
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout Ollama')); });
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
  throw new Error('No se encontró estructura JSON válida');
}

/**
 * Extraer receta completa a partir de texto libre o desestructurado
 */
export async function parseRecipeFromText(text: string): Promise<any> {
  const gemini = getGeminiClient();

  const systemInstruction = `Eres un extractor y estructurador experto de recetas de cocina para StockChef.
Analiza el texto y devuelve EXACTAMENTE un objeto JSON válido con la siguiente estructura (sin formato markdown adicional ni explicaciones):
{
  "title": "Nombre de la receta",
  "description": "Breve descripción apetecible",
  "base_servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "difficulty": "medium", // 'easy' | 'medium' | 'hard'
  "category": "Principal", // 'Desayuno' | 'Ensalada' | 'Sopa' | 'Principal' | 'Snack' | 'Postre' | 'General'
  "instructions": "Paso 1: ...\\nPaso 2: ...",
  "calories": 450, // Estimación numérica por ración o null
  "protein": 25,   // Gramos por ración o null
  "carbs": 40,     // Gramos por ración o null
  "fat": 15,       // Gramos por ración o null
  "sat_fat": 3,    // Gramos por ración o null
  "fiber": 5,      // Gramos por ración o null
  "salt": 1.2,     // Gramos por ración o null
  "ingredients": [
    {
      "name": "Tomate frito",
      "quantity": 200,
      "unit": "g", // unidad | g | kg | ml | L | cucharada | cucharadita | taza | pizca | lata | paquete
      "category": "Conservas y caldos" // 'Verduras' | 'Frutas' | 'Carnes' | 'Pescados' | 'Lácteos y huevos' | 'Pastas y cereales' | 'Legumbres' | 'Especias' | 'Aceites y condimentos' | 'Frutos secos' | 'Panadería' | 'Congelados' | 'Conservas y caldos' | 'Repostería' | 'Otros'
    }
  ]
}`;

  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Texto de la receta a procesar:\n${text}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const jsonStr = response.text || '';
      return JSON.parse(extractJson(jsonStr));
    } catch (err: any) {
      console.warn('Fallo con Gemini API, intentando fallback...', err.message);
    }
  }

  // Fallback Ollama
  const fallbackRes = await ollamaFallback(systemInstruction, text);
  return JSON.parse(extractJson(fallbackRes));
}

/**
 * Sugerencias de recetas con ingredientes de la despensa
 */
export async function suggestRecipesFromPantry(pantryItems: string, libraryRecipes: string): Promise<string> {
  const gemini = getGeminiClient();
  const systemInstruction = 'Eres un chef profesional de alta cocina y cocina de aprovechamiento. Responde con un tono cercano, claro y directo en español con formato Markdown limpio.';
  const prompt = `Despensa actual:\n${pantryItems}\n\nRecetario disponible:\n${libraryRecipes}\n\nSugiere 3 platos apetecibles dando prioridad absoluta a lo que está a punto de caducar. Para cada plato detalla: nombre, qué ingredientes de la despensa se aprovechan, qué faltaría comprar (si aplica) y tiempo estimado.`;

  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });
      return response.text || 'Sin respuesta';
    } catch (err: any) {
      console.warn('Gemini error:', err);
    }
  }

  return ollamaFallback(systemInstruction, prompt);
}

/**
 * Generador de plan semanal inteligente
 */
export async function generateWeeklyMealPlan(pantryItems: string, recipeTitles: string, preferences: string): Promise<string> {
  const gemini = getGeminiClient();
  const systemInstruction = 'Eres un nutricionista y chef experto en planificación semanal equilibrada.';
  const prompt = `Diseña un plan semanal completo de comidas (Lunes a Domingo: Desayuno, Almuerzo, Cena y Snack) equilibrado y variado.\nDespensa disponible:\n${pantryItems}\n\nRecetas guardadas:\n${recipeTitles}\n\nPreferencias: ${preferences || 'Mediterránea, equilibrada, saludable'}. Prioriza el uso de ingredientes existentes en la despensa para minimizar el desperdicio.`;

  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      });
      return response.text || 'Sin respuesta';
    } catch (err: any) {
      console.warn('Gemini error:', err);
    }
  }

  return ollamaFallback(systemInstruction, prompt);
}

/**
 * Asistente de Cocina y Consultas Culinarias
 */
export async function askChefAssistant(message: string, context?: { pantry?: string; recipes?: string }): Promise<string> {
  const gemini = getGeminiClient();
  const systemInstruction = `Eres StockChef Assistant, un chef profesional de prestigio y asesor culinario inteligente, rápido y cercano.
Ayudas con:
- Sustituciones inteligentes de ingredientes según lo que haya en la cocina.
- Técnicas y tiempos de cocción precisos.
- Consejos de conservación, maridaje y aprovechamiento de sobras.
- Adaptaciones para alergias e intolerancias.
Responde de forma concisa, atractiva, estructurada con viñetas claras y en español.`;

  let prompt = message;
  if (context?.pantry || context?.recipes) {
    prompt = `[CONTEXTO DEL HOGAR]\n${context.pantry ? `Despensa actual: ${context.pantry}\n` : ''}${context.recipes ? `Recetas guardadas: ${context.recipes}\n` : ''}\n[PREGUNTA DEL USUARIO]:\n${message}`;
  }

  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.5,
        },
      });
      return response.text || 'Sin respuesta de Gemini';
    } catch (err: any) {
      console.error('Error llamando a Gemini API:', err);
      return `Error con Google Gemini API: ${err.message || err}`;
    }
  }

  return ollamaFallback(systemInstruction, prompt);
}
