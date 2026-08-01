'use server';

import { aiService, prompts } from '@/lib/ai';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

export async function generateNarrative(formData: {
  toothNumber: string;
  procedureCode: string;
  diagnosis: string;
  notes: string;
}) {
  try {
    const prompt = prompts.insuranceNarrative(formData);
    const narrative = await aiService.generateText(prompt);

    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO narratives (id, tooth_number, procedure_code, diagnosis, notes, narrative) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, formData.toothNumber, formData.procedureCode, formData.diagnosis, formData.notes, narrative],
    });

    revalidatePath('/narrative-generator');
    return { success: true, narrative, id };
  } catch (error) {
    console.error('Narrative Generation Error:', error);
    return { success: false, error: 'Failed to generate narrative' };
  }
}

export async function getNarrativeHistory() {
  try {
    const result = await db.execute('SELECT * FROM narratives ORDER BY created_at DESC LIMIT 10');
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return [];
  }
}
