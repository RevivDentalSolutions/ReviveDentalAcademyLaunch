'use client';

import { useState } from 'react';
import { troubleshootClaim } from '@/app/actions/claims';
import { HelpCircle, Sparkles, Loader2, Copy, Check, MessageSquareWarning } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';

export default function ClaimsAssistantPage() {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    const response = await troubleshootClaim(description);
    
    if (response.success && response.suggestion) {
      setResult(response.suggestion);
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
            <HelpCircle size={24} />
          </div>
          <h1 className="section-title mb-0">Claims Troubleshooting Assistant</h1>
        </div>
        <p className="section-subtitle">
          Describe your denied or delayed claim and get AI-powered suggestions for next steps and appeal wording.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
        {/* Input Form */}
        <Card>
          <h2 className="text-xl font-semibold text-charcoal-900 mb-6 flex items-center gap-2">
            <MessageSquareWarning size={20} className="text-teal-500" />
            Claim Issue Description
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              label="Describe the issue"
              className="min-h-[200px] resize-none"
              placeholder="e.g. Claim for D2740 on tooth #14 was denied stating 'lack of clinical necessity'. Pre-op X-rays and narrative were provided..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <Button
              type="submit"
              disabled={isLoading || !description.trim()}
              variant="accent"
              className="w-full flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Analyzing Claim...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Get Troubleshooting Steps
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
                <h2 className="text-xl font-semibold text-charcoal-900">AI Recommendations</h2>
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
                  <Sparkles size={18} />
                </div>
                <p className="text-sm text-teal-800">
                  <strong>Disclaimer:</strong> AI suggestions should be verified by a qualified dental billing professional.
                </p>
              </div>
            </Card>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center text-center p-12 border-dashed border-2 border-charcoal-200 bg-cream-50">
              <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center text-charcoal-400 mb-4">
                <HelpCircle size={32} />
              </div>
              <h3 className="text-lg font-medium text-charcoal-900 mb-2">No analysis yet</h3>
              <p className="text-charcoal-500 max-w-xs">
                Provide the details of your claim issue on the left and click "Get Troubleshooting Steps" to see AI guidance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
