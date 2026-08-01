'use server';

import { aiService, prompts } from '@/lib/ai';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

export async function troubleshootClaim(description: string) {
  try {
    const prompt = prompts.claimsTroubleshooting(description);
    const suggestion = await aiService.generateText(prompt);

    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO claims_interactions (id, claim_description, suggestion) VALUES (?, ?, ?)',
      args: [id, description, suggestion],
    });

    revalidatePath('/tools/claims-assistant');
    return { success: true, suggestion, id };
  } catch (error) {
    console.error('Claims Troubleshooting Error:', error);
    return { success: false, error: 'Failed to troubleshoot claim' };
  }
}
