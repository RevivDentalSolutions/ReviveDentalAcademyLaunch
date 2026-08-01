'use client';

import { useState } from 'react';
import { generateScript } from '@/app/actions/scripts';
import { MessageSquare, Sparkles, Loader2, Copy, Check, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';

export default function ScriptsGeneratorPage() {
  const [scenario, setScenario] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    const response = await generateScript(scenario, context);
    
    if (response.success && response.script) {
      setResult(response.script);
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
            <MessageSquare size={24} />
          </div>
          <h1 className="section-title mb-0">Front Desk Scripts Generator</h1>
        </div>
        <p className="section-subtitle">
          Generate professional, patient-friendly scripts for scheduling, insurance verification, and communication.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
        {/* Input Form */}
        <Card>
          <h2 className="text-xl font-semibold text-charcoal-900 mb-6 flex items-center gap-2">
            <Info size={20} className="text-teal-500" />
            Script Requirements
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Scenario"
              placeholder="e.g. Explaining a high copay to a patient"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              required
            />

            <Textarea
              label="Context / Specific Details (Optional)"
              className="min-h-[150px] resize-none"
              placeholder="e.g. Patient is upset, we offer third-party financing like CareCredit, the procedure is a crown."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />

            <Button
              type="submit"
              disabled={isLoading || !scenario.trim()}
              variant="accent"
              className="w-full flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Script...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Script
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
                <h2 className="text-xl font-semibold text-charcoal-900">Generated Script</h2>
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
              
              <div className="bg-white rounded-xl p-6 border border-charcoal-100 flex-grow text-charcoal-800 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
                {result}
              </div>
              
              <div className="mt-6 p-4 rounded-xl bg-teal-50 border border-teal-100 flex items-start gap-3">
                <div className="text-teal-600 mt-0.5">
                  <Info size={18} />
                </div>
                <p className="text-sm text-teal-800">
                  <strong>Tip:</strong> You can refine the script by adding more context to the input on the left.
                </p>
              </div>
            </Card>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center text-center p-12 border-dashed border-2 border-charcoal-200 bg-cream-50">
              <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center text-charcoal-400 mb-4">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-lg font-medium text-charcoal-900 mb-2">No script generated</h3>
              <p className="text-charcoal-500 max-w-xs">
                Fill in the scenario and context on the left to generate a professional script.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
