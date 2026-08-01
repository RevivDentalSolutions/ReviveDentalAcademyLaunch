'use client';

import { useState } from 'react';
import { generateNarrative } from '@/app/actions/narrative';
import { FileText, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';

export default function InsuranceNarrativePage() {
  const [formData, setFormData] = useState({
    toothNumber: '',
    procedureCode: '',
    diagnosis: '',
    notes: '',
  });
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    
    const response = await generateNarrative(formData);
    
    if (response.success && response.narrative) {
      setResult(response.narrative);
    } else {
      alert(response.error || 'Something went wrong');
    }
    
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <div className="tool-icon">
            <Sparkles size={24} />
          </div>
          <h1 className="section-title mb-0">AI Insurance Narrative Generator</h1>
        </div>
        <p className="section-subtitle">
          Generate professional, clinical narratives for dental insurance claims in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
        {/* Input Form */}
        <Card>
          <h2 className="text-xl font-semibold text-charcoal-900 mb-6 flex items-center gap-2">
            <FileText size={20} className="text-mint-500" />
            Procedure Details
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tooth Number(s)"
                placeholder="e.g. 3, 14, 19"
                value={formData.toothNumber}
                onChange={(e) => setFormData({ ...formData, toothNumber: e.target.value })}
                required
              />
              <Input
                label="Procedure Code"
                placeholder="e.g. D2740, D6740"
                value={formData.procedureCode}
                onChange={(e) => setFormData({ ...formData, procedureCode: e.target.value })}
                required
              />
            </div>

            <Input
              label="Diagnosis / Clinical Findings"
              placeholder="e.g. Recurrent decay, fractured cusp"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              required
            />

            <Textarea
              label="Additional Notes"
              className="min-h-[120px] resize-none"
              placeholder="Radiographic evidence shows..., Patient reports sensitivity to..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />

            <Button
              type="submit"
              disabled={isLoading}
              variant="accent"
              className="w-full flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Narrative
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Result Area */}
        <div className="flex flex-col gap-6">
          {result ? (
            <Card variant="accent" className="animate-slide-up h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-charcoal-900">Generated Narrative</h2>
                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-mint-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-charcoal-100 flex-grow text-charcoal-800 leading-relaxed whitespace-pre-wrap">
                {result}
              </div>
              
              <div className="mt-6 p-4 rounded-xl bg-teal-50 border border-teal-100 flex items-start gap-3">
                <div className="text-teal-600 mt-0.5">
                  <Sparkles size={18} />
                </div>
                <p className="text-sm text-teal-800">
                  <strong>Pro Tip:</strong> Always review the generated narrative for clinical accuracy before submitting to insurance.
                </p>
              </div>
            </Card>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center text-center p-12 border-dashed border-2 border-charcoal-200 bg-cream-50">
              <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center text-charcoal-400 mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-medium text-charcoal-900 mb-2">No narrative generated yet</h3>
              <p className="text-charcoal-500 max-w-xs">
                Fill out the procedure details on the left and click "Generate" to see your professional narrative here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
