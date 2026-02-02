/**
 * Export Service - Xuất đề thi ra các định dạng file
 */

import { Exam, Question } from '../types';

// Dynamic import for docx library (browser-compatible)
let docxModule: any = null;

async function loadDocx() {
    if (!docxModule) {
        // @ts-ignore - dynamic import for browser
        docxModule = await import('https://esm.sh/docx@9.0.2');
    }
    return docxModule;
}

/**
 * Export exam to Word document (.docx)
 */
export async function exportToWord(exam: Exam): Promise<Blob> {
    const docx = await loadDocx();
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, BorderStyle, WidthType, HeadingLevel,
        Header, Footer, PageNumber, ShadingType, LevelFormat } = docx;

    // Table border style
    const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

    // Create question paragraphs
    const questionChildren: any[] = [];

    exam.questions.forEach((q: Question, idx: number) => {
        // Question number and content
        questionChildren.push(
            new Paragraph({
                spacing: { before: 300, after: 100 },
                children: [
                    new TextRun({ text: `Câu ${idx + 1}: `, bold: true }),
                    new TextRun({ text: q.content })
                ]
            })
        );

        // Options A, B, C, D
        ['A', 'B', 'C', 'D'].forEach((opt) => {
            const optionText = q.options[opt as keyof typeof q.options];
            const isCorrect = q.answer === opt;
            questionChildren.push(
                new Paragraph({
                    indent: { left: 720 },
                    spacing: { after: 60 },
                    children: [
                        new TextRun({
                            text: `${opt}. ${optionText}`,
                            bold: isCorrect,
                            underline: isCorrect ? { type: 'single' } : undefined
                        })
                    ]
                })
            );
        });
    });

    // Create matrix table
    const matrixRows = [
        // Header row
        new TableRow({
            tableHeader: true,
            children: ['Chuyên đề', 'NB', 'TH', 'VD', 'VDC', 'Tổng'].map(text =>
                new TableCell({
                    borders: cellBorders,
                    width: { size: text === 'Chuyên đề' ? 3000 : 1000, type: WidthType.DXA },
                    shading: { fill: "4A90E2", type: ShadingType.CLEAR },
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text, bold: true, color: "FFFFFF" })]
                    })]
                })
            )
        }),
        // Data rows
        ...exam.matrix.map(row =>
            new TableRow({
                children: [
                    new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun(row.topic)] })] }),
                    new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(String(row.recognize))] })] }),
                    new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(String(row.understand))] })] }),
                    new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(String(row.apply))] })] }),
                    new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(String(row.highApply))] })] }),
                    new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.total), bold: true })] })] }),
                ]
            })
        )
    ];

    const doc = new Document({
        styles: {
            default: {
                document: { run: { font: "Times New Roman", size: 26 } } // 13pt
            }
        },
        sections: [{
            properties: {
                page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } // 2cm, 2cm, 2cm, 3cm
            },
            headers: {
                default: new Header({
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "SỞ GD&ĐT ............", size: 22, italics: true })]
                    })]
                })
            },
            footers: {
                default: new Footer({
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "Trang " }),
                            new TextRun({ children: [PageNumber.CURRENT] }),
                            new TextRun({ text: " / " }),
                            new TextRun({ children: [PageNumber.TOTAL_PAGES] })
                        ]
                    })]
                })
            },
            children: [
                // Title
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [new TextRun({ text: exam.title.toUpperCase(), bold: true, size: 32 })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [new TextRun({ text: `Môn: VẬT LÝ - Thời gian: 50 phút`, italics: true })]
                }),

                // Questions section
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 200 },
                    children: [new TextRun({ text: "PHẦN TRẮC NGHIỆM", bold: true })]
                }),
                ...questionChildren,

                // Matrix section
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 500, after: 200 },
                    children: [new TextRun({ text: "MA TRẬN KIẾN THỨC", bold: true })]
                }),
                new Table({
                    columnWidths: [3000, 1000, 1000, 1000, 1000, 1000],
                    rows: matrixRows
                })
            ]
        }]
    });

    return await Packer.toBlob(doc);
}

/**
 * Export exam to JSON file
 */
export function exportToJson(exam: Exam): Blob {
    const dataStr = JSON.stringify(exam, null, 2);
    return new Blob([dataStr], { type: 'application/json' });
}

/**
 * Trigger file download in browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
