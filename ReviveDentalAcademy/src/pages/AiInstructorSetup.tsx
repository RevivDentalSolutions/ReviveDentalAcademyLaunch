import { useState } from 'react';
import { Link } from 'react-router-dom';
import { instructorMockDefaults, getInstructorReadiness, type InstructorMockProfile } from '../lib/ai-twin/instructorMock';

const panel: React.CSSProperties = { background: '#fff', border: '1px solid #dce5e7', borderRadius: 16, padding: 24, boxShadow: '0 8px 28px rgba(22,42,49,.05)' };
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: '#35525b', marginBottom: 8 };
const input: React.CSSProperties = { display: 'block', width: '100%', border: '1px solid #b8cdd1', borderRadius: 8, padding: '11px 12px', background: '#fff', color: '#1b3038' };

export default function AiInstructorSetup() {
  // Intentionally ephemeral: mock fields never leave this React component or persist to browser storage.
  const [profile, setProfile] = useState<InstructorMockProfile>({ ...instructorMockDefaults });
  const [showPrivacy, setShowPrivacy] = useState(true);
  const readiness = getInstructorReadiness(profile);
  const update = <K extends keyof InstructorMockProfile>(key: K, value: InstructorMockProfile[K]) =>
    setProfile(previous => ({ ...previous, [key]: value }));
  return (
    <main style={{ background: '#f4f8f8', minHeight: '100vh', padding: 'clamp(20px,4vw,54px)', color: '#19333b', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1050, margin: 'auto' }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, color: '#238f91' }}>REVIVE DENTAL ACADEMY / DEVELOPMENT PREVIEW</p>
        <h1 style={{ fontSize: 'clamp(30px,4vw,44px)', margin: '10px 0' }}>My AI Instructor</h1>
        <p style={{ color: '#55727b', maxWidth: 750 }}>Design your future course instructor profile. This is a visual demonstration only: no AI models, uploads, recording, saving, or generation.</p>
        <div role="status" style={{ background: '#e5f3f1', border: '1px solid #afd6d0', borderRadius: 12, padding: 16, margin: '20px 0 26px', fontWeight: 700 }}>AI generation disabled · Mock profile only · Nothing is uploaded or stored</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 18 }}>
          <section style={panel} aria-labelledby="profile-heading">
            <h2 id="profile-heading">Instructor profile</h2>
            <label htmlFor="instructor-name" style={label}>Display name (demo only)</label>
            <input id="instructor-name" style={input} maxLength={60} value={profile.displayName} onChange={event => update('displayName',event.target.value)} />
            <label htmlFor="instructor-role" style={{ ...label, marginTop: 20 }}>Instructor title</label>
            <select id="instructor-role" style={input} value={profile.role} onChange={event => update('role',event.target.value as InstructorMockProfile['role'])}>
              <option value="Dental Insurance Instructor">Dental Insurance Instructor</option>
              <option value="Dental Practice Operations Instructor">Dental Practice Operations Instructor</option>
              <option value="Revive Academy Instructor">Revive Academy Instructor</option>
            </select>
            <label htmlFor="instructor-tone" style={{ ...label, marginTop: 20 }}>Teaching style</label>
            <select id="instructor-tone" style={input} value={profile.style} onChange={event => update('style',event.target.value as InstructorMockProfile['style'])}>
              <option value="Warm and professional">Warm and professional</option>
              <option value="Clear and concise">Clear and concise</option>
              <option value="Friendly and conversational">Friendly and conversational</option>
            </select>
            <p style={{ color: '#5b777e', fontSize: 13 }}>These settings are temporary. Refreshing this page resets them.</p>
          </section>
          <section style={panel} aria-labelledby="portrait-heading">
            <h2 id="portrait-heading">Portrait and voice</h2>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
              <div aria-label="Generic instructor silhouette placeholder" style={{ width: 108, height: 124, borderRadius: 12, background: 'linear-gradient(150deg,#d5e8e7,#a4c4c4)', display: 'grid', placeItems: 'center', fontSize: 52, color: '#396b70' }}>◯</div>
              <div><strong>Portrait: Not added</strong><p style={{ fontSize: 13, color: '#607b82' }}>Placeholder only. No image selection or upload available.</p></div>
            </div>
            <div style={{ background: '#f1f6f6', borderRadius: 12, padding: 18 }}>
              <strong>Voice sample: Not added</strong>
              <p style={{ color: '#607b82', fontSize: 13 }}>Microphone and audio upload are intentionally disabled.</p>
              <button disabled type="button" style={{ border: 0, background: '#d9e5e5', color: '#587178', padding: 12, borderRadius: 8, cursor: 'not-allowed' }}>Record or upload voice (coming later)</button>
            </div>
          </section>
          <section style={panel} aria-labelledby="consent-heading">
            <h2 id="consent-heading">Consent and privacy</h2>
            <label style={{ display: 'flex', gap: 12, alignItems: 'start', marginBottom: 16 }}>
              <input type="checkbox" checked={profile.ownsLikeness} onChange={event => update('ownsLikeness',event.target.checked)} />
              <span>I would use only a face and voice I own or am authorized to use.</span>
            </label>
            <label style={{ display: 'flex', gap: 12, alignItems: 'start', marginBottom: 16 }}>
              <input type="checkbox" checked={profile.understandsPrivacy} onChange={event => update('understandsPrivacy',event.target.checked)} />
              <span>I understand that a future live version will require separate consent, secure storage and deletion controls.</span>
            </label>
            <button type="button" onClick={() => setShowPrivacy(!showPrivacy)} aria-expanded={showPrivacy} style={{ border: 0, background: 'transparent', color: '#087f84', fontWeight: 700, padding: 0, cursor: 'pointer' }}>{showPrivacy ? 'Hide' : 'Show'} privacy details</button>
            {showPrivacy && <p style={{ background: '#f1f6f6', borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.6 }}>This preview does not request camera or microphone access, send files to servers, or save profile details to local storage or a database. Checkboxes are not legally binding consent. Real consent and revocation will be designed before model activation.</p>}
          </section>
          <section style={panel} aria-labelledby="readiness-heading">
            <h2 id="readiness-heading">Setup status</h2>
            <p><strong>Profile:</strong> {profile.displayName.trim() || 'Name required'}</p>
            <p><strong>Portrait:</strong> Not added</p>
            <p><strong>Voice:</strong> Not added</p>
            <p><strong>Consent checklist:</strong> {readiness.consentChecklistComplete ? 'Acknowledged for demo' : 'Incomplete'}</p>
            <p><strong>AI engine:</strong> Disabled</p>
            <div role="status" style={{ background: '#fff5e6', borderRadius: 10, padding: 14, color: '#7d581a', margin: '18px 0' }}>Not ready for generation. No AI processing is connected.</div>
            <button type="button" disabled style={{ background: '#c7d6d8', color: '#52676b', border: 0, padding: '12px 18px', borderRadius: 9, cursor: 'not-allowed' }}>Generate instructor video (disabled)</button>
          </section>
        </div>
        <p style={{ marginTop: 25 }}><Link style={{ color: '#087f84', fontWeight: 700 }} to="/ai-twin-prototype-preview">Watch the 60-second storyboard preview</Link></p>
      </div>
    </main>
  );
}
