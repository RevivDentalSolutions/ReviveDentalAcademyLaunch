'use server';

import { aiService, prompts } from '@/lib/ai';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

export async function generateScript(scenario: string, context: string) {
  try {
    const prompt = prompts.frontDeskScript(scenario, context);
    const script = await aiService.generateText(prompt);

    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO scripts_interactions (id, scenario, context, script) VALUES (?, ?, ?, ?)',
      args: [id, scenario, context, script],
    });

    revalidatePath('/tools/scripts');
    return { success: true, script, id };
  } catch (error) {
    console.error('Script Generation Error:', error);
    return { success: false, error: 'Failed to generate script' };
  }
}
