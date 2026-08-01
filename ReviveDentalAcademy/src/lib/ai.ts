import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openaiApiKey = process.env.OPENAI_API_KEY;
const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const isDemoMode = process.env.DEMO_MODE === 'true';

export type AIServiceProvider = 'openai' | 'google' | 'mock';

export interface AIRequestOptions {
  provider?: AIServiceProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
const defaultProvider: AIServiceProvider = openaiApiKey ? 'openai' : 'mock';

export class AIService {
  private openai: OpenAI | null = null;
  private google: GoogleGenerativeAI | null = null;

  constructor() {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
    if (googleApiKey) {
      this.google = new GoogleGenerativeAI(googleApiKey);
    }
  }

  async generateText(prompt: string, options: AIRequestOptions = {}): Promise<string> {
    const provider = options.provider || defaultProvider;

    if (provider === 'mock') {
      return this.generateMockResponse(prompt);
    }

    try {
      if (provider === 'google' && this.google) {
        const model = this.google.getGenerativeModel({ model: options.model || 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      }

      if (provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: options.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
        });
        return response.choices[0].message.content || '';
      }

      // Fallback to mock if requested provider is not available
      return this.generateMockResponse(prompt);
    } catch (error) {
      console.error(`AI Generation Error (${provider}):`, error);
      return this.generateMockResponse(prompt);
    }
  }

  private generateMockResponse(prompt: string): string {
    // Professional, high-quality sample responses as requested by lead
    if (prompt.includes('insurance narrative')) {
      return "CLINICAL NARRATIVE:\nPatient presented with symptomatic tooth #14. Clinical examination and radiographic evidence reveal a deep carious lesion extending into the dentin, with evidence of a fractured disto-lingual cusp. The current restoration has recurrent decay at the margins and is failing. Due to the extent of the decay and loss of tooth structure, a full-coverage porcelain-fused-to-metal crown (D2740) is medically necessary to restore function and prevent further fracture or pulpal involvement. Radiographs and clinical photos are attached for review.";
    }
    if (prompt.includes('denied or delayed claim')) {
      return "ANALYSIS OF CLAIM DENIAL:\n\n1. Summary: The denial for 'lack of clinical necessity' typically occurs when the submitted narrative or radiographs do not sufficiently demonstrate the extent of decay or fracture.\n\n2. Next Steps:\n- Re-evaluate the submitted X-rays to ensure they clearly show the pulp and margins.\n- Gather intraoral photos if available.\n- Submit a formal appeal with the following wording.\n\n3. Suggested Appeal Wording:\n'We are appealing the denial of claim #[ClaimID] for D2740 on tooth #14. Clinical findings show a fractured cusp and recurrent decay that compromises the structural integrity of the tooth. A direct restoration is contraindicated as it would not provide adequate support or longevity. Attached are pre-operative intraoral photos that clearly illustrate the condition described.'\n\n4. Common Fixes:\n- Always include pre-op photos for crown and bridge cases.\n- Ensure the narrative uses specific clinical terms (e.g., 'fractured cusp', 'recurrent decay', 'loss of tooth structure').";
    }
    if (prompt.includes('front desk trainer')) {
      return "DENTAL FRONT DESK SCRIPT (Demo Mode):\n\n'Hi [Patient Name], this is [Your Name] from Revive Dental Solutions. I'm calling because Dr. Smith noticed a small area of concern on your last visit that we'd like to address before it causes you any discomfort. We have an opening this Thursday at 10:00 AM, or would next Tuesday at 2:00 PM work better for your schedule?'\n\nHandling Objection (Cost):\n'I completely understand that cost is a concern. We have several flexible payment options, and we can also check your insurance benefits to see how we can maximize your coverage for this procedure. Shall we find a time that works for you?'";
    }
    if (prompt.includes('radiation safety')) {
      return "RADIATION SAFETY PROGRAM TEMPLATE (Demo Mode):\n\n1. POLICY STATEMENT:\nThis office is committed to the ALARA (As Low As Reasonably Achievable) principle for patient and staff safety.\n\n2. TRAINING LOG:\n- [Date]: Initial training for all staff on X-ray machine operation.\n- [Date]: Annual refresher on safety protocols and PPE usage.\n\n3. AUDIT CHECKLIST:\n- [ ] Aprons inspected for cracks/integrity.\n- [ ] Dosimetry badges being worn and tracked.\n- [ ] Technique charts posted by every X-ray unit.\n\n4. COMPLIANCE NOTES:\nEnsure all new hires complete the radiation safety orientation within 30 days of employment. Maintain these records for a minimum of 5 years.";
    }
    return "This is a demonstration response from Revive Dental Solutions. In a live environment, this would be generated by AI based on your specific clinical inputs.";
  }
}

export const aiService = new AIService();

// Prompt Templates
export const prompts = {
  insuranceNarrative: (inputs: {
    toothNumber: string;
    procedureCode: string;
    diagnosis: string;
    notes: string;
  }) => `
    You are an expert dental biller and office manager. Write a professional insurance narrative for the following dental procedure to ensure maximum claim approval.
    
    Details:
    - Tooth Number: ${inputs.toothNumber}
    - Procedure Code: ${inputs.procedureCode}
    - Diagnosis: ${inputs.diagnosis}
    - Additional Notes: ${inputs.notes}
    
    The narrative should be concise, professional, and use clinical terminology. Focus on why the procedure was medically necessary.
  `,
  claimsTroubleshooting: (description: string) => `
    You are a dental claims expert. A dental office is facing an issue with a denied or delayed claim.
    
    Claim Issue Description:
    ${description}
    
    Provide:
    1. A summary of why this likely happened.
    2. Specific next steps to take.
    3. Suggested wording for an appeal letter.
    4. Common fixes for this type of issue.
  `,
  frontDeskScript: (scenario: string, context: string, tone?: string) => `
    You are a professional dental front desk trainer. Generate a patient-friendly, professional script for the following dental office scenario.
    
    Scenario: ${scenario}
    Context/Details: ${context}
    Preferred Tone: ${tone || 'Professional and Friendly'}
    
    The script should:
    1. Be easy to read and natural to say.
    2. Handle common patient objections if applicable.
    3. Include a clear call to action (e.g., scheduling an appointment).
    4. Be tailored to the provided context.
  `,
};
