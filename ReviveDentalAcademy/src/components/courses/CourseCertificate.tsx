import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
interface Certificate { id: string; learner_name: string; course_title: string; issued_at: string }
export function CourseCertificate({ courseId }: { courseId: string }) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setCertificate(null); setEnabled(false); setError('');
    Promise.all([
      supabase.from('course_certificates').select('id,learner_name,course_title,issued_at').eq('course_id', courseId).maybeSingle(),
      supabase.from('course_completion_rules').select('enabled').eq('course_id', courseId).maybeSingle(),
    ]).then(([cert, rules]) => {
      if (cancelled) return;
      if (cert.error || rules.error) { setError('Certificate status could not be loaded. Please reload to retry.'); return; }
      setCertificate(cert.data); setEnabled(rules.data?.enabled === true);
    }).catch(() => { if (!cancelled) setError('Certificate status could not be loaded.'); });
    return () => { cancelled = true; };
  }, [courseId]);
  return <section className="mt-8 p-6 border border-secondary/30 rounded-xl text-gray-300">
    <h2 className="text-xl text-white mb-3">Course certificate</h2>
    {certificate ? <>
      <div id="academy-certificate" className="p-8 border-2 border-secondary text-center">
        <p className="uppercase tracking-widest">Revive Dental Academy</p>
        <h2 className="text-3xl my-6">Certificate of Completion</h2>
        <p>Presented to</p><p className="text-2xl my-4">{certificate.learner_name}</p>
        <p>For completing</p><p className="text-xl my-4">{certificate.course_title}</p>
        <p>Issued {new Date(certificate.issued_at).toLocaleDateString()}</p>
        <p className="text-xs mt-6">Certificate ID: {certificate.id}</p>
        <p className="text-xs mt-3">Training completion only. This certificate does not award accredited continuing education credit.</p>
      </div>
      <button className="mt-4 bg-secondary text-primary rounded-lg px-6 py-3" onClick={() => window.print()}>Print / save certificate as PDF</button>
      <style>{`@media print { body * { visibility:hidden; } #academy-certificate, #academy-certificate * { visibility:visible; color:#111!important; } #academy-certificate { position:absolute; left:0; top:0; width:100%; box-sizing:border-box; background:white; } }`}</style>
    </> : <>
      <p>{enabled ? 'Complete all lessons, pass the current quizzes, and obtain any required practical approval. Your eligibility is checked when you request your certificate.' : 'Certificates are not enabled for this course yet.'}</p>
      {enabled && <button disabled={busy} className="mt-4 bg-secondary text-primary rounded-lg px-6 py-3 disabled:opacity-40" onClick={async () => {
        setBusy(true); setError('');
        try {
          const { data, error } = await supabase.rpc('issue_course_certificate', {p_course_id:courseId});
          if (error) throw new Error(error.message);
          setCertificate(data);
        } catch (err) { setError(err instanceof Error ? err.message : 'Certificate could not be issued. Please retry.'); }
        finally { setBusy(false); }
      }}>{busy ? 'Checking completion…' : 'Get my certificate'}</button>}
    </>}
    {error && <p role="alert" className="text-red-300 mt-3">{error}</p>}
  </section>;
}
