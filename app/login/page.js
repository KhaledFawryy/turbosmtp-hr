"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else        { router.push("/dashboard"); router.refresh(); }
  }

  const s = {
    page:    { minHeight:"100vh", background:"#0f0f13", display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
    card:    { background:"#1c1c26", border:"1px solid #2a2a38", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:400, animation:"fadeUp .35s ease both" },
    logo:    { fontSize:13, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", color:"#7c7cff", marginBottom:6 },
    title:   { fontSize:24, fontWeight:800, color:"#e4e4ef", marginBottom:6 },
    sub:     { fontSize:13, color:"#555568", marginBottom:32 },
    label:   { fontSize:11, fontWeight:700, color:"#666677", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:6 },
    input:   { width:"100%", background:"#13131a", border:"1px solid #2a2a38", borderRadius:9, padding:"11px 14px", fontSize:14, color:"#e4e4ef", outline:"none", marginBottom:16 },
    btn:     { width:"100%", background:"#6366f1", border:"none", color:"#fff", borderRadius:9, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em" },
    btnDis:  { opacity:0.6, cursor:"not-allowed" },
    error:   { background:"#ef444418", border:"1px solid #ef444440", color:"#ef4444", borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:16 },
    footer:  { marginTop:24, textAlign:"center", fontSize:12, color:"#444458" },
    spinner: { display:"inline-block", width:16, height:16, border:"2px solid #ffffff40", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin 0.8s linear infinite", verticalAlign:"middle", marginRight:8 },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⚡ turboSMTP</div>
        <div style={s.title}>Welcome back</div>
        <div style={s.sub}>Sign in to the HR portal · First Line Support</div>

        {error && <div style={s.error}>✗ {error}</div>}

        <form onSubmit={handleLogin}>
          <label style={s.label}>Work email</label>
          <input
            style={s.input}
            type="email"
            placeholder="you@turbosmtp.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button style={{ ...s.btn, ...(loading ? s.btnDis : {}) }} disabled={loading}>
            {loading && <span style={s.spinner}/>}
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <div style={s.footer}>
          turboSMTP HR · Internal use only
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px #6366f120; }
        button:hover:not(:disabled) { background: #5254cc !important; }
      `}</style>
    </div>
  );
}
