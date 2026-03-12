import React, { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, Music, HelpCircle, Users, Star,
  Trophy, Zap, Shield, Crown, Play, ChevronDown,
  Gamepad2, Globe, CheckCircle
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'site_updates_v3_shown';
const TODAY = new Date().toISOString().slice(0, 10);

/* ═══════════════════════════════════════════════════════════════════════
   FRAMES (no prices shown)
═══════════════════════════════════════════════════════════════════════ */
const FRAMES = [
  { src: '/frame/بوكمي.png',    name: 'بوكمي',   rarity: 'legendary' },
  { src: '/frame/نخبوي.png',   name: 'نخبوي',   rarity: 'epic'      },
  { src: '/frame/دايموند .png', name: 'دايموند', rarity: 'diamond'   },
  { src: '/frame/قولد.png',    name: 'قولد',    rarity: 'gold'      },
  { src: '/frame/جمجمة.png',   name: 'جمجمة',   rarity: 'rare'      },
  { src: '/frame/سلفر .png',   name: 'سيلفر',   rarity: 'silver'    },
  { src: '/frame/برونزي .png', name: 'برونزي',  rarity: 'bronze'    },
  { src: '/frame/1.png',       name: 'إطار ١',  rarity: 'common'    },
  { src: '/frame/2.png',       name: 'إطار ٢',  rarity: 'common'    },
  { src: '/frame/3.png',       name: 'إطار ٣',  rarity: 'common'    },
  { src: '/frame/4.png',       name: 'إطار ٤',  rarity: 'common'    },
  { src: '/frame/5.png',       name: 'إطار ٥',  rarity: 'common'    },
  { src: '/frame/6.png',       name: 'إطار ٦',  rarity: 'common'    },
  { src: '/frame/7.png',       name: 'إطار ٧',  rarity: 'common'    },
];

const RARITY: Record<string, { label: string; color: string; glow: string }> = {
  legendary: { label: '👑 أسطوري',  color: '#ff4d4d', glow: 'rgba(255,77,77,0.9)'   },
  epic:      { label: '⚡ ملحمي',   color: '#c084fc', glow: 'rgba(192,132,252,0.8)' },
  diamond:   { label: '💎 ماس',     color: '#67e8f9', glow: 'rgba(103,232,249,0.8)' },
  gold:      { label: '🥇 ذهبي',   color: '#fbbf24', glow: 'rgba(251,191,36,0.8)'  },
  rare:      { label: '💀 نادر',    color: '#f87171', glow: 'rgba(248,113,113,0.7)' },
  silver:    { label: '🥈 فضي',    color: '#94a3b8', glow: 'rgba(148,163,184,0.6)' },
  bronze:    { label: '🥉 برونزي', color: '#d97706', glow: 'rgba(217,119,6,0.6)'   },
  common:    { label: '⭐ عادي',    color: '#6b7280', glow: 'rgba(107,114,128,0.4)' },
};

/* ═══════════════════════════════════════════════════════════════════════
   GLOBAL CSS (injected once)
═══════════════════════════════════════════════════════════════════════ */
const CSS = `
@keyframes su-fadeIn      { from{opacity:0}                                           to{opacity:1} }
@keyframes su-slideUp     { from{opacity:0;transform:translateY(70px) scale(.94)}     to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes su-slideRight  { from{opacity:0;transform:translateX(-40px)}              to{opacity:1;transform:translateX(0)} }
@keyframes su-popIn       { 0%{opacity:0;transform:scale(.5) rotate(-8deg)} 65%{transform:scale(1.08) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
@keyframes su-shimmer     { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes su-scan        { 0%{top:-4px} 100%{top:calc(100% + 4px)} }
@keyframes su-orbit       { from{transform:rotate(0deg) translateX(180px) rotate(0deg)} to{transform:rotate(360deg) translateX(180px) rotate(-360deg)} }
@keyframes su-orbit2      { from{transform:rotate(180deg) translateX(240px) rotate(-180deg)} to{transform:rotate(540deg) translateX(240px) rotate(-540deg)} }
@keyframes su-pulse-red   { 0%,100%{box-shadow:0 0 20px rgba(220,38,38,.4),0 0 60px rgba(220,38,38,.15)} 50%{box-shadow:0 0 50px rgba(220,38,38,.9),0 0 120px rgba(220,38,38,.35)} }
@keyframes su-float       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes su-badge-beat  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
@keyframes su-border-spin { from{--su-angle:0deg} to{--su-angle:360deg} }
@keyframes su-number-in   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes su-tag-in      { from{opacity:0;transform:translateY(12px) scale(.85)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes su-frame-float { 0%,100%{transform:translateY(0) rotateY(0)} 50%{transform:translateY(-6px) rotateY(8deg)} }
@keyframes su-stripe-move { from{background-position:0 0} to{background-position:40px 0} }
@keyframes su-ping        { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.5);opacity:0} }
.su-scrollbar::-webkit-scrollbar        { width:4px }
.su-scrollbar::-webkit-scrollbar-track  { background:transparent }
.su-scrollbar::-webkit-scrollbar-thumb  { background:rgba(220,38,38,.6);border-radius:4px }
`;

/* ═══════════════════════════════════════════════════════════════════════
   FLOATING ORB PARTICLES
═══════════════════════════════════════════════════════════════════════ */
const OrbField: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    {/* Central red glow */}
    <div style={{
      position:'absolute', top:'50%', left:'50%',
      width:800, height:800,
      transform:'translate(-50%,-50%)',
      background:'radial-gradient(circle, rgba(220,38,38,.07) 0%, transparent 70%)',
      animation:'su-pulse-red 5s ease-in-out infinite',
    }} />
    {/* Orbiting dots */}
    {[0,1,2,3,4].map(i => (
      <div key={i} style={{
        position:'absolute', top:'50%', left:'50%',
        width:8, height:8, borderRadius:'50%',
        background:`hsl(${i*30},90%,60%)`,
        boxShadow:`0 0 16px hsl(${i*30},90%,60%)`,
        animation:`su-orbit ${6+i*1.4}s ${i*0.7}s linear infinite`,
        marginLeft:-4, marginTop:-4,
      }} />
    ))}
    {[0,1,2].map(i => (
      <div key={i} style={{
        position:'absolute', top:'50%', left:'50%',
        width:5, height:5, borderRadius:'50%',
        background:`hsl(${i*60+20},80%,65%)`,
        boxShadow:`0 0 12px hsl(${i*60+20},80%,65%)`,
        animation:`su-orbit2 ${9+i*2}s ${i*1.2}s linear infinite`,
        marginLeft:-2.5, marginTop:-2.5,
      }} />
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   FRAME CARD
═══════════════════════════════════════════════════════════════════════ */
const FrameCard: React.FC<{ f: typeof FRAMES[0]; delay: number }> = ({ f, delay }) => {
  const [hov, setHov] = useState(false);
  const r = RARITY[f.rarity];
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        animation: `su-popIn .4s ${delay}s both`,
        position:'relative', display:'flex', flexDirection:'column',
        alignItems:'center', padding:'14px 8px 10px',
        borderRadius:20,
        border: `2px solid ${hov ? r.color : 'rgba(255,255,255,.07)'}`,
        background: hov ? `rgba(220,38,38,.1)` : 'rgba(0,0,0,.45)',
        boxShadow: hov ? `0 0 30px ${r.glow}, 0 0 0 1px ${r.color}30` : 'none',
        transition:'all .3s',
        cursor:'pointer',
        transform: hov ? 'translateY(-6px) scale(1.04)' : 'scale(1)',
      }}
    >
      {/* Rarity badge top */}
      <div style={{
        position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)',
        padding:'2px 10px', borderRadius:20,
        background: hov ? r.color : 'rgba(255,255,255,.08)',
        fontSize:9, fontWeight:900, color:'white', whiteSpace:'nowrap',
        transition:'background .3s',
        boxShadow: hov ? `0 0 10px ${r.glow}` : 'none',
      }}>{r.label}</div>

      <img
        src={f.src} alt={f.name}
        style={{
          width:76, height:76, objectFit:'contain',
          filter: hov ? `drop-shadow(0 0 16px ${r.color})` : 'drop-shadow(0 2px 6px rgba(0,0,0,.5))',
          animation: hov ? 'su-frame-float 2s ease-in-out infinite' : 'none',
          transition:'filter .3s',
        }}
      />
      <div style={{ marginTop:8, fontWeight:900, fontSize:12, color:'white', textAlign:'center' }}>{f.name}</div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   UPDATE SECTION (left sidebar items)
═══════════════════════════════════════════════════════════════════════ */
interface Section {
  id: number;
  icon: React.ReactNode;
  label: string;
  badge: string;
  badgeBg: string;
  accent: string;
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN MODAL
═══════════════════════════════════════════════════════════════════════ */
export const SiteUpdatesModal: React.FC = () => {
  const [visible, setVisible]   = useState(false);
  const [closing, setClosing]   = useState(false);
  const [active,  setActive]    = useState(0);
  const styleRef                = useRef<HTMLStyleElement | null>(null);

  /* Inject CSS once */
  useEffect(() => {
    if (!document.getElementById('su-css')) {
      const el = document.createElement('style');
      el.id = 'su-css';
      el.textContent = CSS;
      document.head.appendChild(el);
      styleRef.current = el;
    }
    return () => { if (styleRef.current) styleRef.current.remove(); };
  }, []);

  /* Show once per day */
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== TODAY) {
        const t = setTimeout(() => setVisible(true), 500);
        return () => clearTimeout(t);
      }
    } catch { setVisible(true); }
  }, []);

  const close = () => {
    setClosing(true);
    try { localStorage.setItem(STORAGE_KEY, TODAY); } catch {}
    setTimeout(() => setVisible(false), 550);
  };

  if (!visible) return null;

  /* ── Navigation items ─────────────────────────────────────────── */
  const NAV: Section[] = [
    { id:0, icon:<Users      size={20}/>, label:'صفحة المتابعين',       badge:'جديد 🆕',    badgeBg:'#be123c', accent:'#ef4444' },
    { id:1, icon:<Music      size={20}/>, label:'الكراسي الموسيقية',    badge:'تحديث 🎵',   badgeBg:'#15803d', accent:'#22c55e' },
    { id:2, icon:<HelpCircle size={20}/>, label:'الفوازير الإسلامية',   badge:'تحديث ☪️',   badgeBg:'#1d4ed8', accent:'#3b82f6' },
    { id:3, icon:<img src="/photo/image76.png" alt="" style={{width:20,height:20,objectFit:'contain'}}/>, label:'لعبة الحروف الجديدة', badge:'جديد 🎮', badgeBg:'#9f1239', accent:'#f43f5e' },
    { id:4, icon:<Trophy     size={20}/>, label:'لوحة المتصدرين',       badge:'تطوير 🏆',   badgeBg:'#92400e', accent:'#f59e0b' },
    { id:5, icon:<Shield     size={20}/>, label:'استقرار المنصة',       badge:'أداء ⚡',    badgeBg:'#5b21b6', accent:'#a855f7' },
  ];

  const accentNow = NAV[active].accent;

  /* ── Content panels ───────────────────────────────────────────── */
  const PANELS = [
    /* 0 — Followers */
    <div key={0} style={{ animation:'su-fadeIn .35s both' }}>
      <SectionHeader
        icon={<Users size={28} color="#ef4444"/>}
        title="صفحة المتابعين الحصرية"
        subtitle="Followers Hub – Frame Store"
        badge="جديد كلياً"
        badgeBg="linear-gradient(135deg,#be123c,#7f1d1d)"
        accent="#ef4444"
      />
      <p style={{ color:'rgba(255,255,255,.7)', lineHeight:1.8, fontSize:14, marginBottom:20 }}>
        تم إطلاق صفحة المتابعين الكاملة! كل عضو الآن يمتلك ملفاً شخصياً ويمكنه <strong style={{color:'#ef4444'}}>شراء إطارات نادرة وحصرية بنقاطه</strong> المكتسبة من الألعاب. كل إطار يعكس مكانتك في الساحة.
      </p>
      <StatRow stats={[
        { v:'14',   l:'إطاراً متاحاً',   c:'#ef4444' },
        { v:'8',    l:'مستويات الندرة',  c:'#c084fc' },
        { v:'100%', l:'حصري للمتابعين',  c:'#22c55e' },
      ]} />
      <TagRow tags={['🖼 إطارات نادرة','🏆 نظام نقاط','⚡ تحديث فوري','🌟 حصري','💎 ندرات متعددة']} accent="#ef4444"/>
      <div style={{ marginTop:20 }}>
        <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700, marginBottom:12, textTransform:'uppercase', letterSpacing:2 }}>
          ● الإطارات المتاحة
        </div>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10,
          maxHeight:260, overflowY:'auto', paddingBottom:4,
        }} className="su-scrollbar">
          {FRAMES.map((f,i) => <FrameCard key={i} f={f} delay={i*0.035}/>)}
        </div>
      </div>
    </div>,

    /* 1 — Musical Chairs */
    <div key={1} style={{ animation:'su-fadeIn .35s both' }}>
      <SectionHeader
        icon={<Music size={28} color="#22c55e"/>}
        title="الكراسي الموسيقية – نسخة رمضان"
        subtitle="Musical Chairs – Ramadan Edition"
        badge="تحديث موسيقي"
        badgeBg="linear-gradient(135deg,#15803d,#14532d)"
        accent="#22c55e"
      />
      <p style={{ color:'rgba(255,255,255,.7)', lineHeight:1.8, fontSize:14, marginBottom:20 }}>
        جو رمضاني حقيقي! تم إضافة <strong style={{color:'#22c55e'}}>أكثر من 15 أغنية رمضانية</strong> أصيلة عالية الجودة. كل لعبة الآن تحتضن روح رمضان وتُشعر المشاهدين بالحماس.
      </p>
      <StatRow stats={[
        { v:'+15', l:'أغنية جديدة',   c:'#22c55e' },
        { v:'HD',  l:'جودة الصوت',    c:'#86efac' },
        { v:'🌙',  l:'رمضان أصيل',    c:'#fbbf24' },
      ]} />
      <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
        {[
          'ليلة القدر ✨','رمضان جانا 🌙','وحوي يا وحوي 🎊','ليالي رمضان 🌟',
          'يا رمضان الكريم ❤️','هلّ الهلال 🌙','سهرة رمضانية 🌙','نغم الروح 🎵',
          'أنوار السحر ✨','ترانيم الصيام 🤲','زمن الخير 💚','بهجة الإفطار 🍽️',
          'نداء الفجر 🌅','أنشودة التراويح 🕌','فرحة العيد 🎉','يالله يا كريم 🤲',
        ].map((s,i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'8px 12px', borderRadius:12,
            background:'rgba(34,197,94,.07)', border:'1px solid rgba(34,197,94,.18)',
            animation:`su-slideRight .3s ${i*.04}s both`,
          }}>
            <Play size={10} color="#22c55e" />
            <span style={{ color:'rgba(255,255,255,.8)', fontSize:12, fontWeight:700 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>,

    /* 2 — Fawazir */
    <div key={2} style={{ animation:'su-fadeIn .35s both' }}>
      <SectionHeader
        icon={<HelpCircle size={28} color="#3b82f6"/>}
        title="الفوازير – النسخة الإسلامية"
        subtitle="Islamic Edition – 300+ Questions"
        badge="إعادة تهيئة كاملة"
        badgeBg="linear-gradient(135deg,#1d4ed8,#1e3a8a)"
        accent="#3b82f6"
      />
      <p style={{ color:'rgba(255,255,255,.7)', lineHeight:1.8, fontSize:14, marginBottom:20 }}>
        تم <strong style={{color:'#3b82f6'}}>إعادة بناء بنك الأسئلة بالكامل</strong>. الآن 100% أسئلة إسلامية متوسطة الصعوبة موزعة على فئات متنوعة: سيرة نبوية، فقه، قرآن، أذكار، وتاريخ إسلامي. تجربة تثقيفية وترفيهية في آنٍ واحد.
      </p>
      <StatRow stats={[
        { v:'300+', l:'سؤال جديد',       c:'#3b82f6' },
        { v:'100%', l:'إسلامية كلياً',   c:'#60a5fa' },
        { v:'6',    l:'فئات متنوعة',     c:'#93c5fd' },
      ]} />
      <TagRow tags={['☪️ إسلامية 100%','📚 سيرة نبوية','🕌 فقه وعبادات','📖 قرآن كريم','🤲 أذكار وأدعية','🏛️ تاريخ إسلامي','⚖️ صعوبة متوسطة','✅ مُصحَّح كلياً']} accent="#3b82f6"/>
      <div style={{
        marginTop:20, padding:'16px 20px', borderRadius:16,
        background:'linear-gradient(135deg,rgba(59,130,246,.12),rgba(29,78,216,.08))',
        border:'1px solid rgba(59,130,246,.25)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <CheckCircle size={16} color="#3b82f6"/>
          <span style={{ color:'#60a5fa', fontWeight:900, fontSize:13 }}>لماذا متوسطة الصعوبة؟</span>
        </div>
        <p style={{ color:'rgba(255,255,255,.6)', fontSize:13, lineHeight:1.7, margin:0 }}>
          اخترنا مستوى المتوسط ليتمكن الجميع من المشاركة — سواء المُبتدئ أو العالِم — وتجعل الأسئلة التجربة مُمتعة وتنافسية بالوقت ذاته.
        </p>
      </div>
    </div>,

    /* 3 — Letter Game */
    <div key={3} style={{ animation:'su-fadeIn .35s both' }}>
      <SectionHeader
        icon={<img src="/photo/image76.png" alt="" style={{width:30,height:30,objectFit:'contain'}}/>}
        title="لعبة الحروف – أضخم إضافة"
        subtitle="New Letter Game – OBS Fully Integrated"
        badge="لعبة جديدة 🔥"
        badgeBg="linear-gradient(135deg,#be123c,#881337)"
        accent="#f43f5e"
      />
      <p style={{ color:'rgba(255,255,255,.7)', lineHeight:1.8, fontSize:14, marginBottom:20 }}>
        <strong style={{color:'#f43f5e'}}>أضخم إضافة في تاريخ iABS!</strong> لعبة حروف جديدة كلياً مع أكثر من 20 مرحلة بثلاثة مستويات صعوبة مختلفة. مدمجة بالكامل مع OBS للبث المباشر مع كروما كي وتصميم بصري استثنائي.
      </p>
      <StatRow stats={[
        { v:'20+', l:'مرحلة',         c:'#f43f5e' },
        { v:'3',   l:'مستويات',       c:'#fb7185' },
        { v:'OBS', l:'دعم كامل',      c:'#22c55e' },
      ]} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:20 }}>
        {[
          { l:'🟢 سهلة',  c:'linear-gradient(135deg,#16a34a,#14532d)', glow:'rgba(34,197,94,.5)', n:'8 مراحل', desc:'للمبتدئين' },
          { l:'🟡 متوسطة',c:'linear-gradient(135deg,#d97706,#92400e)', glow:'rgba(251,191,36,.5)', n:'8 مراحل', desc:'للمتمرسين' },
          { l:'🔴 صعبة',  c:'linear-gradient(135deg,#dc2626,#7f1d1d)', glow:'rgba(239,68,68,.5)', n:'7 مراحل', desc:'للمحترفين' },
        ].map((lvl,i) => (
          <div key={i} style={{
            padding:'18px 12px', borderRadius:20, textAlign:'center',
            background:lvl.c, boxShadow:`0 0 25px ${lvl.glow}, inset 0 1px 0 rgba(255,255,255,.15)`,
            animation:`su-popIn .4s ${i*.1}s both`,
          }}>
            <div style={{ fontWeight:900, fontSize:16, color:'white', marginBottom:4 }}>{lvl.l}</div>
            <div style={{ fontWeight:900, fontSize:22, color:'white' }}>{lvl.n}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>{lvl.desc}</div>
          </div>
        ))}
      </div>
      <TagRow tags={['🎥 كروما كي OBS','⚡ تصميم حصري','💬 تفاعل الشات','🏆 نظام نقاط','🎮 23+ لعبة الآن']} accent="#f43f5e"/>
    </div>,

    /* 4 — Leaderboard */
    <div key={4} style={{ animation:'su-fadeIn .35s both' }}>
      <SectionHeader
        icon={<Trophy size={28} color="#f59e0b"/>}
        title="لوحة المتصدرين المحسّنة"
        subtitle="Leaderboard & Points System Upgrade"
        badge="تطوير شامل"
        badgeBg="linear-gradient(135deg,#d97706,#92400e)"
        accent="#f59e0b"
      />
      <p style={{ color:'rgba(255,255,255,.7)', lineHeight:1.8, fontSize:14, marginBottom:20 }}>
        تحديث شامل للوحة المتصدرين. <strong style={{color:'#f59e0b'}}>تحديث فوري في الوقت الحقيقي</strong> بعد كل لعبة، دقة أعلى في النقاط، ونظام الإطارات مرتبط مباشرة بالمكانة في اللوحة.
      </p>
      <StatRow stats={[
        { v:'Realtime', l:'تحديث فوري',  c:'#f59e0b' },
        { v:'99.9%',    l:'دقة النقاط',  c:'#fbbf24' },
        { v:'−70%',     l:'وقت التحميل', c:'#22c55e' },
      ]} />
      <TagRow tags={['⚡ Realtime','🎯 دقة عالية','🚀 أداء محسّن','🏅 نظام رتب','🖼 ربط الإطارات']} accent="#f59e0b"/>
      <div style={{
        marginTop:20, display:'flex', gap:12,
      }}>
        {[
          { icon:'👑', title:'المتصدر الأول',  desc:'إطار ذهبي حصري + لقب أسطوري',  c:'#f59e0b' },
          { icon:'🥈', title:'المركز الثاني',  desc:'إطار نخبوي مميز',               c:'#94a3b8' },
          { icon:'🥉', title:'المركز الثالث',  desc:'إطار برونزي خاص',               c:'#d97706' },
        ].map((m,i) => (
          <div key={i} style={{
            flex:1, padding:'14px 12px', borderRadius:16, textAlign:'center',
            background:'rgba(0,0,0,.4)', border:`2px solid ${m.c}40`,
            boxShadow:`0 0 20px ${m.c}20`,
            animation:`su-popIn .4s ${i*.12}s both`,
          }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{m.icon}</div>
            <div style={{ fontWeight:900, fontSize:13, color:m.c }}>{m.title}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:4 }}>{m.desc}</div>
          </div>
        ))}
      </div>
    </div>,

    /* 5 — Stability */
    <div key={5} style={{ animation:'su-fadeIn .35s both' }}>
      <SectionHeader
        icon={<Shield size={28} color="#a855f7"/>}
        title="استقرار وأداء المنصة"
        subtitle="Platform Stability & Speed Upgrade"
        badge="تحسينات تقنية"
        badgeBg="linear-gradient(135deg,#7c3aed,#4c1d95)"
        accent="#a855f7"
      />
      <p style={{ color:'rgba(255,255,255,.7)', lineHeight:1.8, fontSize:14, marginBottom:20 }}>
        إصلاح شامل لجميع المشاكل المُبلَّغ عنها من المستخدمين. تحسين الاتصال بنظام الشات، <strong style={{color:'#a855f7'}}>سرعة أعلى في إظهار البيانات بنسبة 2×</strong>، وواجهة أكثر سلاسة على جميع الأجهزة.
      </p>
      <StatRow stats={[
        { v:'2×',  l:'أسرع تحميل',   c:'#a855f7' },
        { v:'12+', l:'إصلاح خطأ',    c:'#c084fc' },
        { v:'99%',  l:'استقرار الخادم', c:'#22c55e' },
      ]} />
      <TagRow tags={['🔧 إصلاح الأخطاء','⚡ Vercel محسّن','🌐 API أسرع','🎨 واجهة سلسة','📡 شات أقوى','🛡 حماية محسّنة']} accent="#a855f7"/>
      <div style={{ marginTop:20, padding:'16px 20px', borderRadius:16, background:'rgba(168,85,247,.08)', border:'1px solid rgba(168,85,247,.2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <Globe size={16} color="#a855f7"/>
          <span style={{ color:'#c084fc', fontWeight:900, fontSize:13 }}>المشاكل التي تم إصلاحها</span>
        </div>
        {['تأخر في عرض بيانات المتصدرين','بطء في تحميل صور API','انقطاع الشات في بعض الأحيان','خطأ في تحميل الصفحة على Vercel'].map((fix,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, animation:`su-slideRight .3s ${i*.07}s both` }}>
            <CheckCircle size={13} color="#22c55e"/>
            <span style={{ color:'rgba(255,255,255,.65)', fontSize:12, fontWeight:600 }}>{fix}</span>
          </div>
        ))}
      </div>
    </div>,
  ];

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:99999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'20px',
        background:'rgba(0,0,0,.93)',
        backdropFilter:'blur(24px)',
        animation: closing ? 'none' : 'su-fadeIn .4s both',
        opacity: closing ? 0 : 1,
        transition: closing ? 'opacity .55s' : 'none',
      }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <OrbField />

      {/* ═══ MODAL CONTAINER ══════════════════════════════════════ */}
      <div style={{
        position:'relative', zIndex:1,
        width:'100%', maxWidth:1100,
        height:'calc(100vh - 60px)', maxHeight:720,
        display:'flex', flexDirection:'column',
        borderRadius:28,
        border:'2px solid rgba(220,38,38,.35)',
        background:'linear-gradient(160deg,#0c0c0c 0%,#130608 60%,#0c0c0c 100%)',
        boxShadow:'0 0 80px rgba(220,38,38,.25), 0 50px 150px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.04)',
        overflow:'hidden',
        animation: closing ? 'none' : 'su-slideUp .55s cubic-bezier(.34,1.56,.64,1) both',
        opacity: closing ? 0 : 1,
        transform: closing ? 'scale(.92) translateY(30px)' : 'scale(1)',
        transition: closing ? 'opacity .5s, transform .5s' : 'none',
      }}>

        {/* Animated red stripe on top */}
        <div style={{
          height:4, width:'100%', flexShrink:0,
          background:'repeating-linear-gradient(90deg,#dc2626 0,#dc2626 20px,#7f1d1d 20px,#7f1d1d 40px)',
          animation:'su-stripe-move 1.2s linear infinite',
        }} />

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div style={{
          flexShrink:0,
          display:'flex', alignItems:'center', gap:16,
          padding:'18px 28px',
          background:'linear-gradient(90deg,rgba(220,38,38,.22) 0%,rgba(0,0,0,0) 70%)',
          borderBottom:'1px solid rgba(220,38,38,.2)',
          position:'relative', overflow:'hidden',
        }}>
          {/* Shimmer */}
          <div style={{
            position:'absolute', inset:0, pointerEvents:'none',
            background:'linear-gradient(90deg,transparent 0%,rgba(220,38,38,.06) 50%,transparent 100%)',
            backgroundSize:'200% 100%',
            animation:'su-shimmer 3s linear infinite',
          }}/>

          {/* Logo bubble */}
          <div style={{
            width:52, height:52, borderRadius:18, flexShrink:0,
            background:'radial-gradient(circle at 30% 30%,rgba(220,38,38,.5),rgba(0,0,0,.7))',
            border:'2px solid #dc2626',
            boxShadow:'0 0 30px rgba(220,38,38,.7), inset 0 0 15px rgba(220,38,38,.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'su-pulse-red 3s ease-in-out infinite',
          }}>
            <Sparkles size={26} color="#ef4444"/>
          </div>

          <div style={{ flex:1 }}>
            <h1 style={{
              margin:0, fontWeight:900, fontSize:22, color:'white', letterSpacing:-.5,
              textShadow:'0 0 30px rgba(220,38,38,.8)',
            }}>
              🚀 تحديثات iABS الجديدة
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
              {/* Live dot */}
              <div style={{ position:'relative', width:10, height:10 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#ef4444', animation:'su-ping 1.5s ease-out infinite' }}/>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', position:'relative' }}/>
              </div>
              <span style={{ color:'rgba(255,255,255,.45)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:3 }}>
                LIVE — اليوم فقط
              </span>
            </div>
          </div>

          {/* Update count badge */}
          <div style={{
            padding:'8px 20px', borderRadius:30,
            background:'rgba(220,38,38,.12)',
            border:'1px solid rgba(220,38,38,.3)',
            display:'flex', alignItems:'center', gap:8,
          }}>
            <Zap size={16} color="#ef4444"/>
            <span style={{ fontWeight:900, fontSize:14, color:'white' }}>6 تحديثات</span>
          </div>

          {/* Close */}
          <button
            onClick={close}
            style={{
              width:42, height:42, borderRadius:14, cursor:'pointer',
              background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
              color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .2s', flexShrink:0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(220,38,38,.3)'; (e.currentTarget as HTMLButtonElement).style.color='white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.04)'; (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.5)'; }}
          >
            <X size={20}/>
          </button>
        </div>

        {/* ── BODY: sidebar + content ───────────────────────────── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* LEFT SIDEBAR */}
          <div style={{
            width:240, flexShrink:0,
            borderRight:'1px solid rgba(255,255,255,.06)',
            padding:'16px 12px',
            display:'flex', flexDirection:'column', gap:6,
            overflowY:'auto',
            background:'rgba(0,0,0,.3)',
          }} className="su-scrollbar">
            {NAV.map(n => {
              const isAct = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 14px', borderRadius:16, cursor:'pointer', textAlign:'right',
                    background: isAct ? `rgba(${hexRgb(n.accent)},.15)` : 'transparent',
                    border: isAct ? `1px solid rgba(${hexRgb(n.accent)},.4)` : '1px solid transparent',
                    boxShadow: isAct ? `0 0 20px rgba(${hexRgb(n.accent)},.2)` : 'none',
                    transition:'all .25s',
                    position:'relative', overflow:'hidden',
                  }}
                  onMouseEnter={e => { if (!isAct) (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.05)'; }}
                  onMouseLeave={e => { if (!isAct) (e.currentTarget as HTMLButtonElement).style.background='transparent'; }}
                >
                  {/* Active shimmer */}
                  {isAct && (
                    <div style={{
                      position:'absolute', inset:0, pointerEvents:'none',
                      background:`linear-gradient(90deg,transparent,rgba(${hexRgb(n.accent)},.08),transparent)`,
                      backgroundSize:'200% 100%',
                      animation:'su-shimmer 2s linear infinite',
                    }}/>
                  )}
                  {/* Scan line */}
                  {isAct && (
                    <div style={{
                      position:'absolute', left:0, right:0, height:2, pointerEvents:'none',
                      background:`linear-gradient(90deg,transparent,${n.accent},transparent)`,
                      animation:'su-scan 2s linear infinite', opacity:.5,
                    }}/>
                  )}

                  {/* Active bar */}
                  {isAct && (
                    <div style={{
                      position:'absolute', left:0, top:'20%', bottom:'20%',
                      width:3, borderRadius:4,
                      background:`linear-gradient(180deg,${n.accent},transparent)`,
                      boxShadow:`0 0 8px ${n.accent}`,
                    }}/>
                  )}

                  <div style={{
                    color: isAct ? n.accent : 'rgba(255,255,255,.45)',
                    transition:'color .25s', flexShrink:0,
                  }}>{n.icon}</div>

                  <div style={{ flex:1, textAlign:'right' }}>
                    <div style={{
                      fontWeight:900, fontSize:13,
                      color: isAct ? 'white' : 'rgba(255,255,255,.55)',
                      transition:'color .25s',
                    }}>{n.label}</div>
                    <div style={{
                      marginTop:3, display:'inline-block',
                      padding:'1px 8px', borderRadius:20,
                      fontSize:9, fontWeight:900, color:'white',
                      background: isAct ? n.badgeBg : 'rgba(255,255,255,.1)',
                      transition:'background .25s',
                      animation: isAct ? 'su-badge-beat 1.5s ease-in-out infinite' : 'none',
                    }}>{n.badge}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT CONTENT */}
          <div
            className="su-scrollbar"
            style={{
              flex:1, padding:'28px 36px', overflowY:'auto',
              position:'relative',
            }}
          >
            {/* Accent glow behind content */}
            <div style={{
              position:'absolute', top:0, right:0, width:300, height:300, pointerEvents:'none',
              background:`radial-gradient(circle, rgba(${hexRgb(accentNow)},.07) 0%, transparent 70%)`,
              transition:'background 1s',
            }}/>
            <div style={{ position:'relative', zIndex:1 }}>
              {PANELS[active]}
            </div>
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <div style={{
          flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 28px',
          borderTop:'1px solid rgba(255,255,255,.06)',
          background:'rgba(0,0,0,.5)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Crown size={14} color="#f59e0b"/>
            <span style={{ color:'rgba(255,255,255,.3)', fontSize:12, fontWeight:700 }}>iABS Arena – يظهر مرة واحدة يومياً</span>
          </div>

          {/* Step indicators */}
          <div style={{ display:'flex', gap:6 }}>
            {NAV.map(n => (
              <div
                key={n.id}
                onClick={() => setActive(n.id)}
                style={{
                  width: active === n.id ? 24 : 8,
                  height:8, borderRadius:4, cursor:'pointer',
                  background: active === n.id ? '#dc2626' : 'rgba(255,255,255,.15)',
                  boxShadow: active === n.id ? '0 0 10px #dc2626' : 'none',
                  transition:'all .3s',
                }}
              />
            ))}
          </div>

          <button
            onClick={close}
            style={{
              padding:'10px 30px', borderRadius:30, cursor:'pointer',
              background:'linear-gradient(135deg,#dc2626,#991b1b)',
              border:'none', color:'white', fontWeight:900, fontSize:14,
              boxShadow:'0 0 25px rgba(220,38,38,.5)',
              transition:'all .2s',
              position:'relative', overflow:'hidden',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform='scale(1.06)'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 0 40px rgba(220,38,38,.8)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform='scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 0 25px rgba(220,38,38,.5)'; }}
          >
            <div style={{
              position:'absolute', inset:0, pointerEvents:'none',
              background:'linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)',
              backgroundSize:'200% 100%',
              animation:'su-shimmer 2s linear infinite',
            }}/>
            <span style={{ position:'relative' }}>فهمت! 🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════ */
function hexRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const SectionHeader: React.FC<{
  icon:React.ReactNode; title:string; subtitle:string;
  badge:string; badgeBg:string; accent:string;
}> = ({ icon, title, subtitle, badge, badgeBg, accent }) => (
  <div style={{ marginBottom:24 }}>
    <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:16 }}>
      <div style={{
        width:56, height:56, borderRadius:18, flexShrink:0,
        background:`radial-gradient(circle at 30% 30%, rgba(${hexRgb(accent)},.35), rgba(0,0,0,.7))`,
        border:`2px solid rgba(${hexRgb(accent)},.5)`,
        boxShadow:`0 0 25px rgba(${hexRgb(accent)},.4)`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {icon}
      </div>
      <div>
        <span style={{
          display:'inline-block', padding:'3px 12px', borderRadius:20,
          background:badgeBg, color:'white', fontSize:10, fontWeight:900,
          marginBottom:8, boxShadow:`0 0 15px rgba(${hexRgb(accent)},.4)`,
          animation:'su-badge-beat 1.8s ease-in-out infinite',
        }}>{badge}</span>
        <h2 style={{
          margin:'0 0 4px', fontWeight:900, fontSize:22, color:'white',
          textShadow:`0 0 20px rgba(${hexRgb(accent)},.5)`,
          letterSpacing:-.5,
        }}>{title}</h2>
        <div style={{ color:'rgba(255,255,255,.35)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:2 }}>{subtitle}</div>
      </div>
    </div>
    {/* Accent divider */}
    <div style={{
      height:2, borderRadius:2,
      background:`linear-gradient(90deg, ${accent}, rgba(${hexRgb(accent)},.2), transparent)`,
      boxShadow:`0 0 10px rgba(${hexRgb(accent)},.4)`,
    }}/>
  </div>
);

const StatRow: React.FC<{ stats:{v:string;l:string;c:string}[] }> = ({ stats }) => (
  <div style={{ display:'grid', gridTemplateColumns:`repeat(${stats.length},1fr)`, gap:14, marginBottom:20 }}>
    {stats.map((s,i) => (
      <div key={i} style={{
        padding:'16px 10px', borderRadius:18, textAlign:'center',
        background:`rgba(${hexRgb(s.c)},.08)`,
        border:`1px solid rgba(${hexRgb(s.c)},.25)`,
        boxShadow:`0 0 20px rgba(${hexRgb(s.c)},.1)`,
        animation:`su-number-in .4s ${i*.1}s both`,
      }}>
        <div style={{ fontWeight:900, fontSize:26, color:s.c, lineHeight:1, textShadow:`0 0 15px ${s.c}80` }}>{s.v}</div>
        <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:700, marginTop:6 }}>{s.l}</div>
      </div>
    ))}
  </div>
);

const TagRow: React.FC<{ tags:string[]; accent:string }> = ({ tags, accent }) => (
  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
    {tags.map((t,i) => (
      <span key={i} style={{
        padding:'5px 14px', borderRadius:20,
        border:`1px solid rgba(${hexRgb(accent)},.35)`,
        color:accent, background:`rgba(${hexRgb(accent)},.1)`,
        fontSize:12, fontWeight:900,
        animation:`su-tag-in .3s ${i*.05}s both`,
        cursor:'default',
      }}>{t}</span>
    ))}
  </div>
);
