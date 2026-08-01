'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { ShieldAlert, Download, Printer, FileText, CheckCircle, Users, ClipboardList } from 'lucide-react';

export default function RadiationSafetyPage() {
  const [formData, setFormData] = useState({
    officeName: '',
    address: '',
    phone: '',
    radiationSafetyOfficer: '',
    licenseNumber: '',
    lastInspectionDate: '',
    nextInspectionDate: '',
  });
  
  const [generated, setGenerated] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint-100 to-teal-100 flex items-center justify-center">
            <ShieldAlert size={24} className="text-mint-600" />
          </div>
          <div>
            <h1 className="section-title mb-0">Radiation Safety Program Generator</h1>
            <p className="text-charcoal-600 mt-1">Create a compliant radiation safety program template</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <h2 className="font-display font-semibold text-lg mb-4">Office Information</h2>
            <p className="text-sm text-charcoal-500 mb-6">Enter your dental office details to generate a customized radiation safety program.</p>
            
            <form onSubmit={handleGenerate} className="space-y-4">
              <Input
                label="Office Name"
                name="officeName"
                value={formData.officeName}
                onChange={handleInputChange}
                placeholder="Smile Dental Clinic"
                required
              />
              
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main Street, City, State ZIP"
                required
              />
              
              <Input
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                required
              />
              
              <Input
                label="Radiation Safety Officer"
                name="radiationSafetyOfficer"
                value={formData.radiationSafetyOfficer}
                onChange={handleInputChange}
                placeholder="Dr. Jane Smith"
                required
              />
              
              <Input
                label="License/R permit Number"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                placeholder="DS-123456"
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Last Inspection"
                  name="lastInspectionDate"
                  type="date"
                  value={formData.lastInspectionDate}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Next Inspection"
                  name="nextInspectionDate"
                  type="date"
                  value={formData.nextInspectionDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <Button type="submit" variant="accent" className="w-full mt-4">
                <FileText size={18} className="mr-2" />
                Generate Program
              </Button>
            </form>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-2">
          {!generated ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-cream-200 flex items-center justify-center mb-4">
                <FileText size={32} className="text-charcoal-400" />
              </div>
              <h3 className="font-display font-semibold text-lg text-charcoal-900 mb-2">
                Your Program Preview
              </h3>
              <p className="text-charcoal-500 max-w-md">
                Fill out the form and click "Generate Program" to see your customized radiation safety program template here.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="mint">Program Generated</Badge>
                  <span className="text-sm text-charcoal-500">Last updated: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handlePrint}>
                    <Printer size={18} className="mr-2" />
                    Print
                  </Button>
                  <Button variant="accent">
                    <Download size={18} className="mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Program Document */}
              <Card className="p-8 print:shadow-none print:border-none">
                {/* Header */}
                <div className="text-center border-b border-charcoal-200 pb-6 mb-6">
                  <h2 className="font-display text-2xl font-bold text-charcoal-900 mb-2">
                    {formData.officeName || 'Dental Office'} 
                  </h2>
                  <p className="text-charcoal-600">
                    {formData.address || 'Address'} | {formData.phone || 'Phone'}
                  </p>
                  <h1 className="font-display text-xl font-semibold text-charcoal-900 mt-4 mb-2">
                    RADIATION SAFETY PROGRAM
                  </h1>
                  <p className="text-sm text-charcoal-500">
                    License #: {formData.licenseNumber || 'N/A'}
                  </p>
                </div>

                {/* Content Sections */}
                <div className="space-y-8">
                  {/* Section 1: Policy Statement */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle size={20} className="text-mint-600" />
                      <h3 className="font-display font-semibold text-lg">Policy Statement</h3>
                    </div>
                    <p className="text-charcoal-700 leading-relaxed">
                      {formData.officeName || 'This dental office'} is committed to maintaining the highest standards of radiation safety in accordance with federal and state regulations. Our radiation safety program ensures that all dental radiographic procedures are conducted with minimum exposure to patients, staff, and the public while obtaining necessary diagnostic information.
                    </p>
                  </section>

                  {/* Section 2: Responsibilities */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={20} className="text-mint-600" />
                      <h3 className="font-display font-semibold text-lg">Responsibilities</h3>
                    </div>
                    <div className="bg-cream-100 rounded-xl p-4 space-y-3">
                      <div>
                        <h4 className="font-medium text-charcoal-900">Radiation Safety Officer (RSO)</h4>
                        <p className="text-sm text-charcoal-600">{formData.radiationSafetyOfficer || 'Dr. Jane Smith'}</p>
                        <ul className="text-sm text-charcoal-600 list-disc list-inside mt-2 space-y-1">
                          <li>Oversees all radiation safety activities</li>
                          <li>Maintains compliance with federal and state regulations</li>
                          <li>Reviews and updates the radiation safety program annually</li>
                          <li>Investigates any radiation-related incidents</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section 3: ALARA Principles */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert size={20} className="text-mint-600" />
                      <h3 className="font-display font-semibold text-lg">ALARA Principles</h3>
                    </div>
                    <p className="text-charcoal-700 leading-relaxed mb-4">
                      ALARA (As Low As Reasonably Achievable) principles are followed to minimize radiation exposure:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-mint-50 border border-mint-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-mint-700 mb-2">Time</div>
                        <p className="text-sm text-charcoal-600">Minimize exposure time through efficient procedures</p>
                      </div>
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-teal-700 mb-2">Distance</div>
                        <p className="text-sm text-charcoal-600">Maximize distance from radiation sources</p>
                      </div>
                      <div className="bg-charcoal-100 border border-charcoal-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-charcoal-700 mb-2">Shielding</div>
                        <p className="text-sm text-charcoal-600">Use appropriate shielding (lead aprons, thyroid collars)</p>
                      </div>
                    </div>
                  </section>

                  {/* Section 4: Training Requirements */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardList size={20} className="text-mint-600" />
                      <h3 className="font-display font-semibold text-lg">Training Requirements</h3>
                    </div>
                    <div className="bg-cream-100 rounded-xl p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-charcoal-200">
                            <th className="pb-2 font-medium">Training Topic</th>
                            <th className="pb-2 font-medium">Frequency</th>
                            <th className="pb-2 font-medium">Responsible</th>
                          </tr>
                        </thead>
                        <tbody className="text-charcoal-600">
                          <tr className="border-b border-charcoal-100">
                            <td className="py-2">Initial radiation safety training</td>
                            <td className="py-2">Before handling equipment</td>
                            <td className="py-2">All new staff</td>
                          </tr>
                          <tr className="border-b border-charcoal-100">
                            <td className="py-2">Annual refresher training</td>
                            <td className="py-2">Every 12 months</td>
                            <td className="py-2">All staff</td>
                          </tr>
                          <tr className="border-b border-charcoal-100">
                            <td className="py-2">Equipment operation training</td>
                            <td className="py-2">Annual</td>
                            <td className="py-2">Operators</td>
                          </tr>
                          <tr>
                            <td className="py-2">Emergency procedures</td>
                            <td className="py-2">Every 2 years</td>
                            <td className="py-2">RSO + operators</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Section 5: Equipment Inspection */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle size={20} className="text-mint-600" />
                      <h3 className="font-display font-semibold text-lg">Equipment Inspection Schedule</h3>
                    </div>
                    <div className="bg-cream-100 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-charcoal-700 font-medium">Inspection Status</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-charcoal-500">Last: <span className="text-charcoal-900">{formData.lastInspectionDate || 'N/A'}</span></span>
                          <span className="text-charcoal-500">Next: <span className="text-charcoal-900">{formData.nextInspectionDate || 'N/A'}</span></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-mint-500"></div>
                          <span className="text-charcoal-600">Equipment calibration current</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-mint-500"></div>
                          <span className="text-charcoal-600">Dosimetry badges assigned</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-mint-500"></div>
                          <span className="text-charcoal-600">Shielding integrity verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-mint-500"></div>
                          <span className="text-charcoal-600">Warning signs posted</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Section 6: Audit Checklist */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardList size={20} className="text-mint-600" />
                      <h3 className="font-display font-semibold text-lg">Monthly Audit Checklist</h3>
                    </div>
                    <div className="space-y-2">
                      {[
                        'Review exposure records for unusual readings',
                        'Verify all staff have current radiation safety certification',
                        'Check lead aprons for cracks or degradation',
                        'Inspect X-ray equipment for proper functioning',
                        'Review and restock personal protective equipment',
                        'Update radiation safety log with monthly data',
                        'Verify proper storage of radiographic chemicals',
                        'Confirm emergency procedures are posted',
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-cream-50 p-3 rounded-lg">
                          <input type="checkbox" className="w-5 h-5 rounded border-charcoal-300 text-mint-600 focus:ring-mint-500" />
                          <span className="text-charcoal-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="border-t border-charcoal-200 mt-8 pt-6 text-center">
                  <p className="text-sm text-charcoal-500">
                    This radiation safety program was generated by Revive Dental Solutions
                  </p>
                  <p className="text-xs text-charcoal-400 mt-1">
                    For questions, contact your local radiation regulatory authority
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
