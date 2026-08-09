import PdfPrinter from 'pdfmake';
import { Buffer } from 'buffer';

interface ShoppingItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity_needed: number;
  unit: string;
  category: string;
  purchased: boolean;
  week_start: string;
}

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

function pdfToBuffer(docDefinition: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const printer = new (PdfPrinter as any)(fonts);
    const doc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function difficultyLabel(d: string): string {
  if (d === 'easy') return 'Fácil';
  if (d === 'hard') return 'Dificil';
  return 'Media';
}

export async function generateRecipePdf(recipe: any): Promise<Buffer> {
  const accentColor = '#16a34a';
  const darkColor = '#14532d';

  const totalTime = recipe.prep_time + recipe.cook_time;

  const ingredientesBody = (recipe.ingredients || []).map((ing: any) => [
    { text: ing.ingredient_name || ing.name || '', style: 'ingName' },
    { text: `${ing.quantity} ${ing.unit}`, style: 'ingQty', alignment: 'right' },
  ]);

  const instructionsText = recipe.instructions || '';
  const steps = instructionsText.split(/\d+\.\s+/).filter((s: string) => s.trim());
  const instructionsContent: any[] = [];

  if (steps.length > 1) {
    instructionsContent.push({
      ol: steps.map((step: string) => ({
        text: step.trim(),
        style: 'stepText',
        margin: [0, 0, 0, 6],
      })),
    });
  } else {
    instructionsContent.push({ text: instructionsText, style: 'stepText' });
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 30, 40, 40],
    content: [
      // ===== Colored header bar =====
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: recipe.title,
              style: 'title',
              color: 'white',
              fillColor: accentColor,
              margin: [16, 14, 16, 10],
            },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },

      // ===== Info badges row =====
      {
        table: {
          widths: ['auto', 'auto', 'auto', 'auto', '*'],
          body: [[
            { text: recipe.category, style: 'badge', fillColor: '#dcfce7', color: darkColor, margin: [0, 0, 6, 0] },
            { text: `${recipe.base_servings} personas`, style: 'badge', fillColor: '#f1f5f9', color: '#475569', margin: [0, 0, 6, 0] },
            { text: `${totalTime} min total`, style: 'badge', fillColor: '#f1f5f9', color: '#475569', margin: [0, 0, 6, 0] },
            { text: difficultyLabel(recipe.difficulty), style: 'badge', fillColor: '#f1f5f9', color: '#475569', margin: [0, 0, 6, 0] },
            { text: '', style: 'badge', fillColor: 'white', color: 'white' },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },

      // ===== Time details =====
      {
        table: {
          widths: ['*', '*', '*'],
          body: [[
            {
              stack: [
                { text: 'Preparacion', style: 'miniLabel' },
                { text: `${recipe.prep_time} min`, style: 'miniValue' },
              ],
              margin: [0, 4, 4, 4],
            },
            {
              stack: [
                { text: 'Coccion', style: 'miniLabel' },
                { text: `${recipe.cook_time} min`, style: 'miniValue' },
              ],
              margin: [4, 4, 4, 4],
            },
            {
              stack: [
                { text: 'Total', style: 'miniLabel' },
                { text: `${totalTime} min`, style: 'miniValue' },
              ],
              margin: [4, 4, 0, 4],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 1,
          vLineColor: () => '#e2e8f0',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
        margin: [0, 0, 0, 16],
      },

      // ===== Description =====
      recipe.description ? { text: recipe.description, style: 'description', margin: [0, 0, 0, 14] } : {},

      // ===== Ingredients section =====
      {
        table: {
          widths: ['auto', '*'],
          body: [[
            {
              width: 100,
              text: 'INGREDIENTES',
              style: 'sectionHeader',
              fillColor: accentColor,
              color: 'white',
              margin: [0, 0, 0, 0],
            },
            { text: '', fillColor: accentColor },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: ingredientesBody.length > 0
            ? ingredientesBody.map((row: any, i: number) => [
                { text: row[0].text, style: 'ingName', margin: [4, 3, 4, 3], fillColor: i % 2 === 0 ? 'white' : '#f8fafc' },
                { text: row[1].text, style: 'ingQty', margin: [4, 3, 4, 3], fillColor: i % 2 === 0 ? 'white' : '#f8fafc', alignment: 'right' },
              ])
            : [[{ text: 'Sin ingredientes', style: 'ingName', colSpan: 2 }, {}]],
        },
        layout: {
          hLineWidth: () => 0.5,
          hLineColor: () => '#e5e7eb',
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 18],
      },

      // ===== Instructions section =====
      {
        table: {
          widths: ['auto', '*'],
          body: [[
            {
              width: 120,
              text: 'PREPARACION',
              style: 'sectionHeader',
              fillColor: accentColor,
              color: 'white',
              margin: [0, 0, 0, 0],
            },
            { text: '', fillColor: accentColor },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      instructionsContent,

      // ===== Footer =====
      {
        text: 'Generado con StockChef',
        style: 'footer',
        alignment: 'center',
        margin: [0, 30, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 20, bold: true },
      badge: { fontSize: 8, bold: true, margin: [4, 2, 4, 2] },
      miniLabel: { fontSize: 7, bold: true, color: '#94a3b8', alignment: 'center' },
      miniValue: { fontSize: 16, bold: true, color: accentColor, alignment: 'center' },
      description: { fontSize: 10, color: '#64748b', italics: true },
      sectionHeader: { fontSize: 10, bold: true, color: 'white', margin: [8, 4, 8, 4] },
      ingName: { fontSize: 10, color: '#334155' },
      ingQty: { fontSize: 10, color: '#64748b', bold: true },
      stepText: { fontSize: 10, lineHeight: 1.5, color: '#334155' },
      footer: { fontSize: 8, color: '#cbd5e1', italics: true },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
  };

  return pdfToBuffer(docDefinition);
}

export async function generateShoppingListPdf(items: ShoppingItem[], weekStart: string): Promise<Buffer> {
  const grouped: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const content: any[] = [
    {
      table: {
        widths: ['*'],
        body: [[{ text: 'Lista de la Compra', style: 'title', color: 'white', fillColor: '#16a34a', margin: [16, 12, 16, 8] }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 6],
    },
    { text: `Semana del ${weekStart}`, style: 'subtitle', margin: [0, 0, 0, 16] },
  ];

  const totalItems = items.length;
  const purchasedItems = items.filter(i => i.purchased).length;

  if (totalItems > 0) {
    content.push({
      text: `${purchasedItems} de ${totalItems} comprados`,
      style: 'progressText',
      margin: [0, 0, 0, 12],
    });
  }

  for (const [category, catItems] of Object.entries(grouped)) {
    content.push({
      table: {
        widths: ['auto', '*'],
        body: [[
          { text: category, style: 'sectionHeader', fillColor: '#dcfce7', color: '#14532d', margin: [8, 4, 8, 4] },
          { text: '', fillColor: '#dcfce7' },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 10, 0, 4],
    });

    const tableBody = catItems.map((item, i) => [
      {
        text: item.purchased ? '[x]' : '[ ]',
        style: 'checkCell',
        alignment: 'center',
        margin: [2, 2, 2, 2],
        fillColor: i % 2 === 0 ? 'white' : '#f8fafc',
      },
      {
        text: item.purchased
          ? { text: item.ingredient_name, decoration: 'lineThrough', color: '#aaaaaa' }
          : item.ingredient_name,
        style: 'cell',
        margin: [2, 2, 2, 2],
        fillColor: i % 2 === 0 ? 'white' : '#f8fafc',
      },
      {
        text: `${item.quantity_needed} ${item.unit}`,
        style: 'cellRight',
        margin: [2, 2, 2, 2],
        fillColor: i % 2 === 0 ? 'white' : '#f8fafc',
      },
    ]);

    content.push({
      table: {
        widths: [24, '*', 'auto'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        hLineColor: () => '#f1f5f9',
        vLineWidth: () => 0,
        paddingLeft: () => 2,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
      margin: [0, 0, 0, 10],
    });
  }

  content.push({
    text: 'Generado con StockChef',
    style: 'footer',
    alignment: 'center',
    margin: [0, 20, 0, 0],
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 30, 40, 40],
    content,
    styles: {
      title: { fontSize: 18, bold: true },
      subtitle: { fontSize: 10, color: '#64748b', italics: true },
      sectionHeader: { fontSize: 10, bold: true, margin: [4, 3, 4, 3] },
      cell: { fontSize: 10, color: '#334155' },
      cellRight: { fontSize: 10, color: '#64748b', alignment: 'right', bold: true },
      checkCell: { fontSize: 10, color: '#16a34a' },
      progressText: { fontSize: 9, color: '#94a3b8', italics: true },
      footer: { fontSize: 8, color: '#cbd5e1', italics: true },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
  };

  return pdfToBuffer(docDefinition);
}

export async function generateMealPlanPdf(meals: any[], notes: any[], weekStart: string): Promise<Buffer> {
  const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
  const MEALS = [
    { key: 'breakfast', label: 'Desayuno' },
    { key: 'lunch', label: 'Almuerzo' },
    { key: 'dinner', label: 'Cena' },
    { key: 'snack', label: 'Tentempie' },
  ];

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const mealMap: Record<string, string> = {};
  for (const m of meals) {
    mealMap[`${m.date}-${m.meal_type}`] = m.recipe_title || '';
  }

  const notesMap: Record<string, string> = {};
  for (const n of notes) {
    notesMap[n.date] = n.note || '';
  }

  const tableBody: any[] = [
    [{ text: '', style: 'cellHeader' }].concat(DAYS.map(d => ({ text: d, style: 'dayHeader' }))),
  ];

  for (const meal of MEALS) {
    const row: any[] = [{ text: meal.label, style: 'mealLabel' }];
    for (let i = 0; i < 7; i++) {
      const title = mealMap[`${weekDates[i]}-${meal.key}`] || '';
      row.push({ text: title || '-', style: title ? 'mealCell' : 'emptyCell' });
    }
    tableBody.push(row);
  }

  tableBody.push(
    [{ text: 'Notas', style: 'mealLabel' }].concat(
      weekDates.map(d => ({ text: notesMap[d] || '', style: 'noteCell' }))
    )
  );

  const content: any[] = [
    { text: 'Menu Semanal', style: 'title', alignment: 'center', margin: [0, 0, 0, 4] },
    { text: `Semana del ${weekStart}`, style: 'subtitle', alignment: 'center', margin: [0, 0, 0, 16] },
    {
      table: {
        headerRows: 1,
        widths: [60, '*', '*', '*', '*', '*', '*', '*'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        hLineColor: () => '#e5e7eb',
        vLineWidth: () => 0.5,
        vLineColor: () => '#e5e7eb',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
    },
    { text: 'Generado con StockChef', style: 'footer', alignment: 'center', margin: [0, 12, 0, 0] },
  ];

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 30],
    content,
    styles: {
      title: { fontSize: 18, bold: true, color: '#15803d' },
      subtitle: { fontSize: 10, color: '#64748b', italics: true },
      dayHeader: { fontSize: 9, bold: true, fillColor: '#dcfce7', color: '#14532d', alignment: 'center' },
      cellHeader: { fontSize: 8, bold: true, fillColor: '#f8fafc', color: '#94a3b8' },
      mealLabel: { fontSize: 8, bold: true, color: '#475569', fillColor: '#f8fafc' },
      mealCell: { fontSize: 8, color: '#334155' },
      emptyCell: { fontSize: 8, color: '#cbd5e1', italics: true },
      noteCell: { fontSize: 7, color: '#64748b', italics: true },
      footer: { fontSize: 7, color: '#cbd5e1', italics: true },
    },
    defaultStyle: { font: 'Roboto', fontSize: 8 },
  };

  return pdfToBuffer(docDefinition);
}
