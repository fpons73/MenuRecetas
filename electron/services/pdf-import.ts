import PdfParse from 'pdf-parse';

interface ParsedRecipeData {
  title: string;
  description: string;
  prep_time: number;
  cook_time: number;
  difficulty: string;
  instructions: string;
  category: string;
  base_servings: number;
  ingredients: { name: string; quantity: number; unit: string; category: string }[];
}

function extractNumber(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function guessCategory(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  const categories: Record<string, string[]> = {
    'Verduras': ['cebolla', 'ajo', 'tomate', 'lechuga', 'zanahoria', 'pimiento', 'pepino', 'calabacín', 'berenjena', 'patata', 'puerro', 'apio', 'espárrago', 'brócoli', 'coliflor', 'alcachofa', 'champiñón', 'seta', 'espinaca', 'acelga', 'judía', 'guisante', 'albahaca', 'perejil', 'cilantro'],
    'Frutas': ['manzana', 'pera', 'plátano', 'naranja', 'limón', 'lima', 'fresa', 'arándano', 'mango', 'piña', 'melocotón', 'aguacate', 'uva', 'cereza', 'sandía', 'melón', 'kiwi', 'frambuesa', 'mora'],
    'Carnes': ['pollo', 'ternera', 'cerdo', 'cordero', 'pavo', 'conejo', 'jamón', 'panceta', 'chorizo', 'salchicha', 'carne picada', 'bacon', 'lomo', 'solomillo', 'costilla', 'pechuga'],
    'Pescados': ['pescado', 'salmón', 'bacalao', 'atún', 'merluza', 'sardina', 'anchoa', 'boquerón', 'gamba', 'langostino', 'calamar', 'pulpo', 'mejillón', 'almeja', 'trucha', 'lubina', 'dorada'],
    'Lácteos y huevos': ['leche', 'queso', 'yogur', 'mantequilla', 'nata', 'huevo', 'mozzarella', 'parmesano', 'cheddar', 'ricotta', 'requesón', 'kefir', 'mascarpone', 'pecorino'],
    'Pastas y cereales': ['pasta', 'arroz', 'harina', 'pan', 'fideo', 'espagueti', 'macarrón', 'cuscús', 'quinoa', 'avena', 'cereal', 'granola', 'trigo', 'maíz', 'tortilla'],
    'Legumbres': ['garbanzo', 'lenteja', 'judía', 'alubia', 'haba', 'soja', 'guisante seco'],
    'Especias': ['sal', 'pimienta', 'orégano', 'tomillo', 'romero', 'laurel', 'pimentón', 'comino', 'cúrcuma', 'canela', 'nuez moscada', 'clavo', 'azafrán', 'curry', 'eneldo', 'albahaca seca', 'perejil seco', 'jengibre', 'ajo en polvo'],
    'Aceites y condimentos': ['aceite', 'vinagre', 'salsa', 'mayonesa', 'mostaza', 'kétchup', 'soja', 'tahini', 'miel', 'sirope'],
    'Frutos secos': ['almendra', 'nuez', 'pistacho', 'anacardo', 'cacahuete', 'avellana', 'piñón', 'semilla', 'pipas', 'castaña'],
    'Panadería': ['pan', 'molde', 'baguette', 'chapata', 'hogaza', 'bollo', 'croissant', 'pan rallado'],
    'Congelados': ['helado', 'congelado', 'hielo', 'guisante congelado', 'verdura congelada', 'pescado congelado'],
    'Conservas y caldos': ['caldo', 'conserva', 'lata', 'bote', 'enlatado', 'tomate triturado', 'leche de coco', 'maíz dulce'],
    'Repostería': ['azúcar', 'chocolate', 'cacao', 'levadura', 'bicarbonato', 'vainilla', 'esencia', 'gelatina', 'harina de repostería', 'azúcar glas', 'azúcar moreno'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return 'Otros';
}

export async function parsePdfRecipe(dataBuffer: Buffer): Promise<ParsedRecipeData> {
  let pdfText: string;

  try {
    const data = await PdfParse(dataBuffer);
    pdfText = data.text;
  } catch {
    try {
      const data = await PdfParse(dataBuffer);
      pdfText = data.text;
    } catch {
      pdfText = dataBuffer.toString('utf-8');
    }
  }

  const lines = pdfText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let title = 'Receta importada';
  let description = '';
  let prepTime = 15;
  let cookTime = 30;
  let difficulty = 'medium';
  let instructions = '';
  let category = 'General';
  let baseServings = 4;
  const ingredients: { name: string; quantity: number; unit: string; category: string }[] = [];

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].length > 3 && lines[i].length < 120) {
      title = lines[i];
      break;
    }
  }

  let inInstructions = false;
  let inIngredients = false;
  let instructionsLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes('ingrediente') || lower.startsWith('para ') || lower === 'ingredientes') {
      inIngredients = true;
      inInstructions = false;
      continue;
    }

    if (lower.includes('preparación') || lower.includes('elaboración') || lower.includes('instrucciones') || lower.includes('pasos') || lower === 'procedimiento') {
      inInstructions = true;
      inIngredients = false;
      continue;
    }

    if (lower.includes('ración') || lower.includes('raciones') || lower.includes('comensales') || lower.includes('personas')) {
      const num = extractNumber(line);
      if (num > 0) baseServings = num;
      continue;
    }

    if (lower.includes('tiempo') && (lower.includes('preparación') || lower.includes('prep'))) {
      const num = extractNumber(line);
      if (num > 0) prepTime = num;
      continue;
    }

    if (lower.includes('tiempo') && (lower.includes('cocción') || lower.includes('cocinado'))) {
      const num = extractNumber(line);
      if (num > 0) cookTime = num;
      continue;
    }

    if (inIngredients && line.length > 2 && line.length < 200) {
      const quantityMatch = line.match(/^[\s]*(\d+[.,]?\d*)\s*(g|kg|ml|l|L|unidad|unidades|cdta|cda|cucharadita|cucharada|taza|tazas|pizca|filete|lomo|diente|dientes|rebanada|ramas|hojas|hoja|trozo|rodaja|litro|litros|cubos|latas|lata|vaso|vasos)?[\s]*(.*)/i);
      if (quantityMatch) {
        const qty = parseFloat(quantityMatch[1].replace(',', '.'));
        const unit = quantityMatch[2] || 'unidad';
        const name = quantityMatch[3] ? quantityMatch[3].replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ ]/g, '').trim() : '';

        if (name && name.length > 2 && !/^\d+$/.test(name)) {
          ingredients.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            quantity: qty,
            unit,
            category: guessCategory(name),
          });
        }
      }
    }

    if (inInstructions && line.length > 3) {
      instructionsLines.push(line);
    }
  }

  instructions = instructionsLines.join('\n');
  if (!instructions) {
    instructions = 'Sin instrucciones detalladas. Consulta el PDF original.';
  }

  const titleLower = title.toLowerCase();
  const categoryMap: Record<string, string> = {
    'ensalada': 'Ensalada',
    'sopa': 'Sopa',
    'crema': 'Sopa',
    'pasta': 'Principal',
    'arroz': 'Principal',
    'carne': 'Principal',
    'pollo': 'Principal',
    'pescado': 'Principal',
    'pizza': 'Principal',
    'desayuno': 'Desayuno',
    'tostada': 'Desayuno',
    'tortita': 'Desayuno',
    'batido': 'Snack',
    'postre': 'Postre',
    'tarta': 'Postre',
    'bizcocho': 'Postre',
    'galleta': 'Postre',
    'brownie': 'Postre',
    'flan': 'Postre',
    'helado': 'Postre',
    'snack': 'Snack',
    'tapas': 'Snack',
    'croqueta': 'Snack',
    'hummus': 'Snack',
  };

  for (const [key, cat] of Object.entries(categoryMap)) {
    if (titleLower.includes(key)) {
      category = cat;
      break;
    }
  }

  return {
    title,
    description,
    prep_time: prepTime,
    cook_time: cookTime,
    difficulty,
    instructions,
    category,
    base_servings: baseServings,
    ingredients,
  };
}
