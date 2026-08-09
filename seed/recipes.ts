import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../electron/services/database';

interface SeedRecipe {
  title: string;
  description: string;
  base_servings: number;
  prep_time: number;
  cook_time: number;
  difficulty: string;
  instructions: string;
  category: string;
  ingredients: { name: string; quantity: number; unit: string; category: string }[];
}

const RECIPES: SeedRecipe[] = [
  {
    title: 'Tortilla de patatas',
    description: 'Clásica tortilla española con cebolla, jugosa por dentro y dorada por fuera.',
    base_servings: 4,
    prep_time: 15,
    cook_time: 25,
    difficulty: 'medium',
    instructions: '1. Pelar y cortar las patatas en láminas finas. Picar la cebolla en juliana.\n2. Freír las patatas y la cebolla en abundante aceite de oliva a fuego medio hasta que estén tiernas.\n3. Escurrir el aceite y mezclar las patatas con los huevos batidos y sal.\n4. Cuajar la tortilla en una sartén antiadherente, primero por un lado y luego dar la vuelta.\n5. Dejar reposar 2 minutos antes de servir.',
    category: 'Principal',
    ingredients: [
      { name: 'Patatas', quantity: 4, unit: 'unidades', category: 'Verduras' },
      { name: 'Huevos', quantity: 6, unit: 'unidades', category: 'Lácteos y huevos' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Aceite de oliva', quantity: 250, unit: 'ml', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Ensalada César',
    description: 'Ensalada fresca con pollo a la plancha, croutons y salsa César casera.',
    base_servings: 2,
    prep_time: 20,
    cook_time: 10,
    difficulty: 'easy',
    instructions: '1. Lavar y trocear la lechuga romana.\n2. Salpimentar y cocinar la pechuga de pollo a la plancha hasta que esté dorada.\n3. Preparar la salsa mezclando mayonesa, anchoas picadas, ajo, limón y parmesano rallado.\n4. Cortar el pan en cubos y tostar en el horno con un poco de aceite.\n5. Montar la ensalada con la lechuga, pollo en tiras, croutons, queso parmesano y salsa.',
    category: 'Ensalada',
    ingredients: [
      { name: 'Lechuga romana', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Pechuga de pollo', quantity: 1, unit: 'unidad', category: 'Carnes' },
      { name: 'Pan de molde', quantity: 2, unit: 'rebanadas', category: 'Panadería' },
      { name: 'Queso parmesano', quantity: 50, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Mayonesa', quantity: 3, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Anchoas', quantity: 3, unit: 'filetes', category: 'Pescados' },
      { name: 'Limón', quantity: 1, unit: 'unidad', category: 'Frutas' },
      { name: 'Ajo', quantity: 1, unit: 'diente', category: 'Verduras' },
    ],
  },
  {
    title: 'Sopa de verduras',
    description: 'Sopa reconfortante de verduras de temporada con fideos finos.',
    base_servings: 4,
    prep_time: 15,
    cook_time: 40,
    difficulty: 'easy',
    instructions: '1. Lavar y pelar todas las verduras. Cortarlas en cubos pequeños.\n2. Sofreír la cebolla y el ajo en aceite de oliva hasta que estén transparentes.\n3. Añadir zanahoria, apio y puerro. Cocinar 5 minutos.\n4. Agregar caldo de verduras y llevar a ebullición.\n5. Cocer a fuego medio 25 minutos.\n6. Añadir los fideos y cocer 5 minutos más.\n7. Salpimentar al gusto y servir caliente.',
    category: 'Sopa',
    ingredients: [
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Zanahoria', quantity: 2, unit: 'unidades', category: 'Verduras' },
      { name: 'Puerro', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Apio', quantity: 2, unit: 'ramas', category: 'Verduras' },
      { name: 'Caldo de verduras', quantity: 1.5, unit: 'L', category: 'Conservas y caldos' },
      { name: 'Ajo', quantity: 2, unit: 'dientes', category: 'Verduras' },
      { name: 'Aceite de oliva', quantity: 2, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Fideos finos', quantity: 100, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Pollo al curry con arroz',
    description: 'Pollo en salsa cremosa de curry con leche de coco, acompañado de arroz basmati.',
    base_servings: 4,
    prep_time: 15,
    cook_time: 35,
    difficulty: 'medium',
    instructions: '1. Cortar el pollo en cubos y salpimentar.\n2. Dorar el pollo en aceite y reservar.\n3. Sofreír la cebolla, ajo y jengibre picados.\n4. Añadir el curry en polvo y cocinar 1 minuto.\n5. Incorporar la leche de coco y el pollo. Cocer 20 minutos.\n6. Cocer el arroz basmati según instrucciones del paquete.\n7. Servir el pollo al curry sobre el arroz.',
    category: 'Principal',
    ingredients: [
      { name: 'Pechuga de pollo', quantity: 2, unit: 'unidades', category: 'Carnes' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Ajo', quantity: 3, unit: 'dientes', category: 'Verduras' },
      { name: 'Jengibre fresco', quantity: 1, unit: 'trozo', category: 'Verduras' },
      { name: 'Leche de coco', quantity: 400, unit: 'ml', category: 'Conservas y caldos' },
      { name: 'Curry en polvo', quantity: 2, unit: 'cucharadas', category: 'Especias' },
      { name: 'Arroz basmati', quantity: 300, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Aceite de oliva', quantity: 2, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Lentejas estofadas',
    description: 'Lentejas cocinadas a fuego lento con verduras y chorizo, plato de cuchara tradicional.',
    base_servings: 4,
    prep_time: 20,
    cook_time: 50,
    difficulty: 'easy',
    instructions: '1. Poner las lentejas en remojo 2 horas antes (si no son pardinas).\n2. Picar cebolla, ajo, zanahoria y pimiento verde.\n3. Sofreír las verduras en aceite de oliva.\n4. Añadir el chorizo en rodajas y cocinar 3 minutos.\n5. Incorporar las lentejas escurridas, laurel, pimentón y cubrir con agua.\n6. Cocer a fuego medio-bajo 45 minutos hasta que estén tiernas.\n7. Rectificar de sal y servir.',
    category: 'Principal',
    ingredients: [
      { name: 'Lentejas', quantity: 300, unit: 'g', category: 'Legumbres' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Zanahoria', quantity: 2, unit: 'unidades', category: 'Verduras' },
      { name: 'Pimiento verde', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Ajo', quantity: 2, unit: 'dientes', category: 'Verduras' },
      { name: 'Chorizo', quantity: 150, unit: 'g', category: 'Carnes' },
      { name: 'Laurel', quantity: 2, unit: 'hojas', category: 'Especias' },
      { name: 'Pimentón', quantity: 1, unit: 'cucharadita', category: 'Especias' },
      { name: 'Aceite de oliva', quantity: 3, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Salmón al horno con verduras',
    description: 'Salmón jugoso al horno acompañado de espárragos y tomates cherry.',
    base_servings: 2,
    prep_time: 10,
    cook_time: 20,
    difficulty: 'easy',
    instructions: '1. Precalentar el horno a 200°C.\n2. Colocar los lomos de salmón en una bandeja con papel de horno.\n3. Rodear con espárragos y tomates cherry.\n4. Aliñar con aceite de oliva, limón, sal y eneldo.\n5. Hornear 18-20 minutos hasta que el salmón esté en su punto.',
    category: 'Principal',
    ingredients: [
      { name: 'Salmón', quantity: 2, unit: 'lomos', category: 'Pescados' },
      { name: 'Espárragos verdes', quantity: 200, unit: 'g', category: 'Verduras' },
      { name: 'Tomates cherry', quantity: 150, unit: 'g', category: 'Verduras' },
      { name: 'Limón', quantity: 1, unit: 'unidad', category: 'Frutas' },
      { name: 'Aceite de oliva', quantity: 2, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Eneldo', quantity: 1, unit: 'cucharadita', category: 'Especias' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Tostadas de aguacate con huevo',
    description: 'Desayuno completo y saludable con aguacate cremoso, huevo poché y pan integral.',
    base_servings: 2,
    prep_time: 10,
    cook_time: 8,
    difficulty: 'easy',
    instructions: '1. Tostar las rebanadas de pan integral.\n2. Machacar el aguacate con un tenedor y añadir zumo de limón y sal.\n3. Escalfar los huevos en agua con vinagre durante 3-4 minutos.\n4. Untar el aguacate sobre las tostadas.\n5. Colocar el huevo poché encima y espolvorear con pimienta y sal en escamas.',
    category: 'Desayuno',
    ingredients: [
      { name: 'Pan integral', quantity: 2, unit: 'rebanadas', category: 'Panadería' },
      { name: 'Aguacate', quantity: 1, unit: 'unidad', category: 'Frutas' },
      { name: 'Huevos', quantity: 2, unit: 'unidades', category: 'Lácteos y huevos' },
      { name: 'Limón', quantity: 0.5, unit: 'unidad', category: 'Frutas' },
      { name: 'Vinagre blanco', quantity: 1, unit: 'cucharada', category: 'Aceites y condimentos' },
      { name: 'Pimienta negra', quantity: 0.5, unit: 'cucharadita', category: 'Especias' },
      { name: 'Sal en escamas', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Tortitas americanas',
    description: 'Tortitas esponjosas al estilo americano, perfectas con sirope de arce y fruta fresca.',
    base_servings: 4,
    prep_time: 10,
    cook_time: 15,
    difficulty: 'easy',
    instructions: '1. Mezclar harina, azúcar, levadura y sal en un bol.\n2. En otro bol, batir huevo, leche y mantequilla derretida.\n3. Incorporar los líquidos a los secos y mezclar sin batir en exceso.\n4. Calentar una sartén antiadherente a fuego medio.\n5. Verter porciones de masa y cocinar hasta que salgan burbujas, luego voltear.\n6. Servir apiladas con sirope de arce y fruta.',
    category: 'Desayuno',
    ingredients: [
      { name: 'Harina de trigo', quantity: 200, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Azúcar', quantity: 30, unit: 'g', category: 'Repostería' },
      { name: 'Levadura en polvo', quantity: 10, unit: 'g', category: 'Repostería' },
      { name: 'Huevos', quantity: 1, unit: 'unidad', category: 'Lácteos y huevos' },
      { name: 'Leche', quantity: 250, unit: 'ml', category: 'Lácteos y huevos' },
      { name: 'Mantequilla', quantity: 30, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Sirope de arce', quantity: 4, unit: 'cucharadas', category: 'Repostería' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Espaguetis a la carbonara',
    description: 'Pasta italiana clásica con salsa cremosa de huevo, panceta y queso pecorino.',
    base_servings: 4,
    prep_time: 10,
    cook_time: 15,
    difficulty: 'medium',
    instructions: '1. Cocer la pasta en abundante agua con sal según las instrucciones del paquete.\n2. Dorar la panceta en una sartén sin aceite hasta que esté crujiente.\n3. Batir los huevos con el queso rallado y pimienta negra.\n4. Escurrir la pasta reservando un poco de agua de cocción.\n5. Mezclar la pasta caliente con la panceta fuera del fuego.\n6. Incorporar la mezcla de huevo removiendo rápidamente para que emulsione.\n7. Añadir agua de cocción si es necesario para aligerar la salsa.',
    category: 'Principal',
    ingredients: [
      { name: 'Espaguetis', quantity: 400, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Panceta', quantity: 200, unit: 'g', category: 'Carnes' },
      { name: 'Huevos', quantity: 3, unit: 'unidades', category: 'Lácteos y huevos' },
      { name: 'Queso pecorino', quantity: 100, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Pimienta negra', quantity: 1, unit: 'cucharadita', category: 'Especias' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Ensalada de garbanzos con atún',
    description: 'Ensalada fresca y saciante de garbanzos, atún, tomate y pimiento, aliñada con aceite.',
    base_servings: 2,
    prep_time: 10,
    cook_time: 0,
    difficulty: 'easy',
    instructions: '1. Escurrir y lavar los garbanzos de bote.\n2. Picar el tomate, pimiento y cebolla en cubos pequeños.\n3. Escurrir el atún.\n4. Mezclar todos los ingredientes en un bol.\n5. Aliñar con aceite de oliva, vinagre y sal al gusto.',
    category: 'Ensalada',
    ingredients: [
      { name: 'Garbanzos cocidos', quantity: 400, unit: 'g', category: 'Legumbres' },
      { name: 'Atún en conserva', quantity: 2, unit: 'latas', category: 'Conservas y caldos' },
      { name: 'Tomate', quantity: 2, unit: 'unidades', category: 'Verduras' },
      { name: 'Pimiento verde', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Cebolla', quantity: 0.5, unit: 'unidad', category: 'Verduras' },
      { name: 'Aceite de oliva', quantity: 2, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Vinagre', quantity: 1, unit: 'cucharada', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Hummus casero',
    description: 'Crema de garbanzos con tahini, limón y ajo. Perfecto para untar o como snack con crudités.',
    base_servings: 4,
    prep_time: 10,
    cook_time: 0,
    difficulty: 'easy',
    instructions: '1. Escurrir los garbanzos reservando un poco del líquido.\n2. Triturar los garbanzos con tahini, zumo de limón, ajo, aceite y sal.\n3. Añadir el líquido de los garbanzos poco a poco hasta obtener la textura deseada.\n4. Servir en un plato hondo, rociar con aceite de oliva y espolvorear con pimentón.',
    category: 'Snack',
    ingredients: [
      { name: 'Garbanzos cocidos', quantity: 400, unit: 'g', category: 'Legumbres' },
      { name: 'Tahini', quantity: 3, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Limón', quantity: 1, unit: 'unidad', category: 'Frutas' },
      { name: 'Ajo', quantity: 1, unit: 'diente', category: 'Verduras' },
      { name: 'Aceite de oliva', quantity: 3, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Pimentón', quantity: 1, unit: 'cucharadita', category: 'Especias' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Wrap de pollo y verduras',
    description: 'Wrap ligero relleno de pollo, lechuga, tomate y salsa de yogur.',
    base_servings: 2,
    prep_time: 15,
    cook_time: 10,
    difficulty: 'easy',
    instructions: '1. Salpimentar la pechuga y cocinar a la plancha. Cortar en tiras.\n2. Mezclar yogur natural con zumo de limón, ajo en polvo y sal para la salsa.\n3. Calentar las tortillas de trigo en sartén.\n4. Montar los wraps con lechuga, tomate en rodajas, tiras de pollo y salsa de yogur.\n5. Enrollar apretado, cortar por la mitad y servir.',
    category: 'Principal',
    ingredients: [
      { name: 'Pechuga de pollo', quantity: 1, unit: 'unidad', category: 'Carnes' },
      { name: 'Tortillas de trigo', quantity: 2, unit: 'unidades', category: 'Panadería' },
      { name: 'Lechuga', quantity: 4, unit: 'hojas', category: 'Verduras' },
      { name: 'Tomate', quantity: 2, unit: 'unidades', category: 'Verduras' },
      { name: 'Yogur natural', quantity: 100, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Limón', quantity: 0.5, unit: 'unidad', category: 'Frutas' },
      { name: 'Ajo en polvo', quantity: 0.5, unit: 'cucharadita', category: 'Especias' },
      { name: 'Aceite de oliva', quantity: 1, unit: 'cucharada', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Berenjenas rellenas de carne',
    description: 'Berenjenas asadas al horno rellenas de carne picada con tomate y bechamel gratinada.',
    base_servings: 4,
    prep_time: 20,
    cook_time: 35,
    difficulty: 'medium',
    instructions: '1. Cortar las berenjenas por la mitad y vaciar la pulpa con cuidado.\n2. Picar la pulpa y reservar.\n3. Sofreír cebolla y ajo. Añadir la carne picada y dorar.\n4. Incorporar la pulpa de berenjena picada y el tomate triturado. Cocinar 15 minutos.\n5. Rellenar las berenjenas con la mezcla.\n6. Cubrir con bechamel y queso rallado. Gratinar al horno 10 minutos a 200°C.',
    category: 'Principal',
    ingredients: [
      { name: 'Berenjena', quantity: 2, unit: 'unidades', category: 'Verduras' },
      { name: 'Carne picada de ternera', quantity: 400, unit: 'g', category: 'Carnes' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Ajo', quantity: 2, unit: 'dientes', category: 'Verduras' },
      { name: 'Tomate triturado', quantity: 200, unit: 'ml', category: 'Conservas y caldos' },
      { name: 'Queso rallado', quantity: 100, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Harina de trigo', quantity: 2, unit: 'cucharadas', category: 'Pastas y cereales' },
      { name: 'Leche', quantity: 300, unit: 'ml', category: 'Lácteos y huevos' },
      { name: 'Mantequilla', quantity: 30, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Aceite de oliva', quantity: 2, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Brownie de chocolate',
    description: 'Brownie denso y jugoso con nueces, perfecto para los amantes del chocolate.',
    base_servings: 8,
    prep_time: 15,
    cook_time: 25,
    difficulty: 'easy',
    instructions: '1. Precalentar el horno a 180°C.\n2. Derretir el chocolate con la mantequilla al baño maría.\n3. Batir los huevos con el azúcar hasta que blanqueen.\n4. Incorporar el chocolate derretido y mezclar.\n5. Tamizar la harina y añadir con las nueces picadas.\n6. Verter en un molde cuadrado engrasado.\n7. Hornear 22-25 minutos. Debe quedar ligeramente húmedo en el centro.',
    category: 'Postre',
    ingredients: [
      { name: 'Chocolate negro', quantity: 200, unit: 'g', category: 'Repostería' },
      { name: 'Mantequilla', quantity: 150, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Huevos', quantity: 3, unit: 'unidades', category: 'Lácteos y huevos' },
      { name: 'Azúcar', quantity: 200, unit: 'g', category: 'Repostería' },
      { name: 'Harina de trigo', quantity: 80, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Nueces', quantity: 80, unit: 'g', category: 'Frutos secos' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Batido de frutas tropical',
    description: 'Batido cremoso de mango, piña y plátano con leche de coco. Refrescante y nutritivo.',
    base_servings: 2,
    prep_time: 5,
    cook_time: 0,
    difficulty: 'easy',
    instructions: '1. Pelar y trocear el mango, la piña y el plátano.\n2. Poner toda la fruta en la batidora.\n3. Añadir la leche de coco y el hielo.\n4. Triturar hasta obtener una textura suave y cremosa.\n5. Servir inmediatamente en vasos altos.',
    category: 'Snack',
    ingredients: [
      { name: 'Mango', quantity: 1, unit: 'unidad', category: 'Frutas' },
      { name: 'Piña', quantity: 2, unit: 'rodajas', category: 'Frutas' },
      { name: 'Plátano', quantity: 1, unit: 'unidad', category: 'Frutas' },
      { name: 'Leche de coco', quantity: 200, unit: 'ml', category: 'Conservas y caldos' },
      { name: 'Hielo', quantity: 6, unit: 'cubos', category: 'Congelados' },
    ],
  },
  {
    title: 'Pimientos del piquillo rellenos de bacalao',
    description: 'Pimientos del piquillo rellenos de brandada de bacalao, gratinados con bechamel ligera.',
    base_servings: 4,
    prep_time: 25,
    cook_time: 20,
    difficulty: 'medium',
    instructions: '1. Desalar el bacalao 24 horas antes cambiando el agua varias veces.\n2. Cocer el bacalao en leche 5 minutos. Desmenuzar.\n3. Sofreír ajo y cebolla picados en aceite.\n4. Mezclar el bacalao desmenuzado con el sofrito y un poco de bechamel.\n5. Rellenar los pimientos con la mezcla.\n6. Colocar en fuente de horno, napar con bechamel y gratinar 5 minutos.',
    category: 'Principal',
    ingredients: [
      { name: 'Pimientos del piquillo', quantity: 12, unit: 'unidades', category: 'Conservas y caldos' },
      { name: 'Bacalao desalado', quantity: 300, unit: 'g', category: 'Pescados' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Ajo', quantity: 2, unit: 'dientes', category: 'Verduras' },
      { name: 'Leche', quantity: 400, unit: 'ml', category: 'Lácteos y huevos' },
      { name: 'Harina de trigo', quantity: 30, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Mantequilla', quantity: 30, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Aceite de oliva', quantity: 3, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Gazpacho andaluz',
    description: 'Sopa fría tradicional andaluza de tomate, pimiento, pepino y ajo. Refrescante y saludable.',
    base_servings: 4,
    prep_time: 15,
    cook_time: 0,
    difficulty: 'easy',
    instructions: '1. Lavar y trocear los tomates, pimiento verde, pepino y ajo.\n2. Poner todo en batidora con el pan, aceite de oliva, vinagre y sal.\n3. Triturar hasta obtener una crema fina.\n4. Pasar por un colador si se desea más fino.\n5. Refrigerar al menos 2 horas antes de servir.\n6. Servir con guarnición de pepino, pimiento y cebolla picados.',
    category: 'Sopa',
    ingredients: [
      { name: 'Tomate maduro', quantity: 6, unit: 'unidades', category: 'Verduras' },
      { name: 'Pimiento verde', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Pepino', quantity: 1, unit: 'unidad', category: 'Verduras' },
      { name: 'Ajo', quantity: 1, unit: 'diente', category: 'Verduras' },
      { name: 'Pan blanco', quantity: 50, unit: 'g', category: 'Panadería' },
      { name: 'Aceite de oliva', quantity: 4, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Vinagre', quantity: 2, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Pizza casera margarita',
    description: 'Pizza fina y crujiente con tomate, mozzarella fresca y albahaca. Masa casera.',
    base_servings: 4,
    prep_time: 30,
    cook_time: 15,
    difficulty: 'medium',
    instructions: '1. Mezclar harina, levadura, agua templada, aceite y sal. Amasar 10 minutos.\n2. Dejar reposar la masa 1 hora cubierta hasta que doble su volumen.\n3. Precalentar el horno a 250°C.\n4. Estirar la masa muy fina sobre papel de horno.\n5. Cubrir con tomate triturado, mozzarella en trozos, albahaca y un hilo de aceite.\n6. Hornear 12-15 minutos hasta que la base esté dorada y el queso burbujeante.',
    category: 'Principal',
    ingredients: [
      { name: 'Harina de trigo', quantity: 300, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Levadura fresca', quantity: 15, unit: 'g', category: 'Repostería' },
      { name: 'Tomate triturado', quantity: 200, unit: 'ml', category: 'Conservas y caldos' },
      { name: 'Mozzarella fresca', quantity: 250, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Albahaca fresca', quantity: 8, unit: 'hojas', category: 'Verduras' },
      { name: 'Aceite de oliva', quantity: 3, unit: 'cucharadas', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'cucharadita', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Croquetas de jamón',
    description: 'Croquetas cremosas de jamón serrano con bechamel, rebozadas y fritas hasta dorar.',
    base_servings: 6,
    prep_time: 30,
    cook_time: 20,
    difficulty: 'medium',
    instructions: '1. Picar el jamón en trocitos muy pequeños.\n2. Preparar la bechamel: derretir mantequilla, añadir harina, cocer 2 min y añadir leche caliente poco a poco.\n3. Incorporar el jamón picado y nuez moscada. Cocinar 10 min removiendo.\n4. Extender la masa en una bandeja, tapar con film y enfriar al menos 4 horas.\n5. Formar las croquetas, pasar por harina, huevo batido y pan rallado.\n6. Freír en abundante aceite caliente hasta dorar.',
    category: 'Snack',
    ingredients: [
      { name: 'Jamón serrano', quantity: 150, unit: 'g', category: 'Carnes' },
      { name: 'Mantequilla', quantity: 80, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Harina de trigo', quantity: 80, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Leche', quantity: 600, unit: 'ml', category: 'Lácteos y huevos' },
      { name: 'Huevos', quantity: 2, unit: 'unidades', category: 'Lácteos y huevos' },
      { name: 'Pan rallado', quantity: 150, unit: 'g', category: 'Panadería' },
      { name: 'Nuez moscada', quantity: 0.5, unit: 'cucharadita', category: 'Especias' },
      { name: 'Aceite de girasol', quantity: 500, unit: 'ml', category: 'Aceites y condimentos' },
      { name: 'Sal', quantity: 1, unit: 'pizca', category: 'Aceites y condimentos' },
    ],
  },
  {
    title: 'Bowl de yogur con granola y frutos rojos',
    description: 'Desayuno rápido y equilibrado con yogur cremoso, granola crujiente y frutos rojos frescos.',
    base_servings: 2,
    prep_time: 5,
    cook_time: 0,
    difficulty: 'easy',
    instructions: '1. Repartir el yogur en dos boles.\n2. Añadir la granola en un lado del bol.\n3. Lavar y colocar los frutos rojos.\n4. Rociar con miel al gusto.\n5. Servir inmediatamente.',
    category: 'Desayuno',
    ingredients: [
      { name: 'Yogur natural', quantity: 250, unit: 'g', category: 'Lácteos y huevos' },
      { name: 'Granola', quantity: 60, unit: 'g', category: 'Pastas y cereales' },
      { name: 'Fresas', quantity: 100, unit: 'g', category: 'Frutas' },
      { name: 'Arándanos', quantity: 50, unit: 'g', category: 'Frutas' },
      { name: 'Miel', quantity: 2, unit: 'cucharaditas', category: 'Repostería' },
    ],
  },
];

export function seedRecipes(): void {
  const database = getDatabase();

  const existingRecipes = database.prepare('SELECT COUNT(*) as count FROM recipes').get() as { count: number };
  if (existingRecipes.count > 0) return;

  const findIngredient = database.prepare('SELECT id FROM ingredients WHERE name = ?');
  const insertIngredient = database.prepare(
    'INSERT INTO ingredients (id, name, default_unit, category) VALUES (?, ?, ?, ?)'
  );
  const insertRecipe = database.prepare(
    'INSERT INTO recipes (id, title, description, base_servings, prep_time, cook_time, difficulty, instructions, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertRecipeIngredient = database.prepare(
    'INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?, ?)'
  );

  function getOrCreateIngredient(name: string, unit: string, category: string): string {
    const existing = findIngredient.get(name) as { id: string } | undefined;
    if (existing) return existing.id;
    const id = uuidv4();
    insertIngredient.run(id, name, unit, category);
    return id;
  }

  const insertPantry = database.prepare(
    'INSERT INTO pantry (id, ingredient_id, quantity, unit, category, expiry_date) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const updatePantry = database.prepare(
    'UPDATE pantry SET quantity = quantity + ?, unit = ?, category = ?, updated_at = datetime(\'now\') WHERE ingredient_id = ?'
  );
  const findPantryByIngredient = database.prepare('SELECT id FROM pantry WHERE ingredient_id = ?');

  const transaction = database.transaction(() => {
    for (const recipe of RECIPES) {
      const recipeId = uuidv4();
      insertRecipe.run(recipeId, recipe.title, recipe.description, recipe.base_servings, recipe.prep_time, recipe.cook_time, recipe.difficulty, recipe.instructions, recipe.category);

      for (const ing of recipe.ingredients) {
        const ingredientId = getOrCreateIngredient(ing.name, ing.unit, ing.category);
        insertRecipeIngredient.run(uuidv4(), recipeId, ingredientId, ing.quantity, ing.unit);
      }

      // Add some pantry items for the first few recipes
      if (RECIPES.indexOf(recipe) < 8) {
        for (const ing of recipe.ingredients) {
          const ingId = findIngredient.get(ing.name) as { id: string } | undefined;
          if (ingId) {
            const existingPantry = findPantryByIngredient.get(ingId.id);
            const halfQty = Math.round(ing.quantity * 0.5 * 100) / 100;
            if (existingPantry) {
              updatePantry.run(halfQty, ing.unit, ing.category, ingId.id);
            } else {
              insertPantry.run(uuidv4(), ingId.id, halfQty, ing.unit, ing.category, null);
            }
          }
        }
      }
    }
  });

  transaction();
}
