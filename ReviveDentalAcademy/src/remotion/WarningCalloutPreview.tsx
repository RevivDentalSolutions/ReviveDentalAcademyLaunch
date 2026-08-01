import { AbsoluteFill } from "remotion";
import { CalloutCard, SectionBadge } from "./ReviveAcademyScene";

export function WarningCalloutPreview() {
  return <AbsoluteFill style={{ background: "radial-gradient(circle at 82% 18%, rgba(135,215,210,.16), transparent 22%), linear-gradient(135deg,#262D31,#1F262A)", color: "#fff", fontFamily: "Poppins, Inter, Arial, sans-serif", padding: "70px" }}>
    <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase" }}>Revive Dental Academy</div>
    <div style={{ alignItems: "center", display: "flex", flex: 1, justifyContent: "center" }}>
      <div style={{ width: 980 }}><SectionBadge>Important</SectionBadge><h1 style={{ fontSize: 60, margin: "30px 0 34px" }}>Verify Before You Estimate</h1><CalloutCard icon="warning">Always confirm the deductible, annual maximum, waiting period, and coverage limitations before presenting an estimate.</CalloutCard></div>
    </div>
  </AbsoluteFill>;
}
