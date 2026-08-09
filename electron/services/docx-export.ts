import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType } from 'docx';
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

export async function generateShoppingListDocx(items: ShoppingItem[], weekStart: string): Promise<Buffer> {
  const grouped: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const categories = Object.keys(grouped).sort();
  const children: any[] = [];

  children.push(
    new Paragraph({
      text: 'Lista de la Compra',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      text: `Semana del ${weekStart}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      style: 'Subtitle',
    })
  );

  const totalItems = items.length;
  const purchasedItems = items.filter(i => i.purchased).length;

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${purchasedItems}/${totalItems} comprados`, italics: true, size: 20, color: '888888' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  for (const category of categories) {
    const catItems = grouped[category];

    children.push(
      new Paragraph({
        text: category,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        border: { bottom: { color: '4ade80', size: 2, space: 4, style: BorderStyle.SINGLE } },
      })
    );

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ text: '✓', alignment: AlignmentType.CENTER })],
          width: { size: 5, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'f0fdf4' },
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Ingrediente', style: 'TableHeader' })],
          width: { size: 55, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'f0fdf4' },
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Cantidad', alignment: AlignmentType.RIGHT, style: 'TableHeader' })],
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'f0fdf4' },
        }),
      ],
    });

    const rows: TableRow[] = [headerRow];

    for (const item of catItems) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: item.purchased ? '✓' : '☐', alignment: AlignmentType.CENTER })],
              width: { size: 5, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({
                    text: item.ingredient_name,
                    strike: item.purchased,
                    color: item.purchased ? 'aaaaaa' : '333333',
                  }),
                ],
              })],
              width: { size: 55, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({
                text: `${item.quantity_needed} ${item.unit}`,
                alignment: AlignmentType.RIGHT,
              })],
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      );
    }

    children.push(
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.DOTTED, color: 'e0e0e0' },
          insideVertical: { style: BorderStyle.NONE },
        },
      })
    );
  }

  children.push(
    new Paragraph({
      text: ' ',
      spacing: { before: 400 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Generado por StockChef', italics: true, size: 18, color: '999999' }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 22 },
        },
        heading1: {
          run: { font: 'Segoe UI', size: 36, bold: true, color: '15803d' },
        },
        heading2: {
          run: { font: 'Segoe UI', size: 26, bold: true, color: '166534' },
        },
      },
      paragraphStyles: [
        {
          id: 'Subtitle',
          name: 'Subtitle',
          run: { font: 'Segoe UI', size: 20, color: '888888', italics: true },
        },
        {
          id: 'TableHeader',
          name: 'TableHeader',
          run: { font: 'Segoe UI', size: 18, bold: true, color: '475569' },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 800, bottom: 800, left: 800, right: 800 },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
