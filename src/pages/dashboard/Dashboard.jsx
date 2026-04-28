import { useState, useEffect } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useAuthStore from '../../store/authStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function apiFetch(path) {
  const token = localStorage.getItem('token');
  const res   = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}


function useCountUp(target, duration=1200) {
  const [val, setVal] = useState(0);
  useEffect(()=>{
    if (!target) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(()=>{
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return val;
}

function Sparkline({ data, color="#6366F1", width=80, height=32 }) {
  if (!data || data.length < 2) return null;
  const nums = data.map(d => typeof d === 'object' ? (d.percent ?? 0) : d);
  const valid = nums.filter(n => n > 0);
  if (valid.length < 2) return null;
  const max   = Math.max(...nums);
  const min   = Math.min(...nums);
  const range = max - min || 1;
  const pts   = nums.map((v,i)=>{
    const x = (i/(nums.length-1))*width;
    const y = height - ((v-min)/range)*(height-6) - 3;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts.split(" ").at(-1).split(",")[0]} cy={pts.split(" ").at(-1).split(",")[1]} r={3} fill={color}/>
    </svg>
  );
}

function Donut({ segments, size=120, thickness=22, label, sublabel }) {
  const total = segments.reduce((a,s)=>a+s.value,0) || 1;
  let offset  = 0;
  const r     = (size-thickness)/2;
  const circ  = 2*Math.PI*r;
  const cx    = size/2, cy = size/2;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      {segments.map((s,i)=>{
        const dash = (s.value/total)*circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset*circ/total+circ}
            strokeLinecap="butt"
            style={{ transition:"stroke-dasharray 0.8s ease" }}/>
        );
        offset += s.value;
        return el;
      })}
      <text x={cx} y={cy-6} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize:18,fontWeight:900,fill:"#0F172A",transform:"rotate(90deg)",transformOrigin:`${cx}px ${cy}px` }}>{label}</text>
      <text x={cx} y={cy+12} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize:9,fill:"#94A3B8",transform:"rotate(90deg)",transformOrigin:`${cx}px ${cy}px` }}>{sublabel}</text>
    </svg>
  );
}


function StatWidget({ icon, label, value, sub, color, bg, spark, trend }) {
  const count   = useCountUp(typeof value==="number"?value:0);
  const display = typeof value==="number" ? count.toLocaleString("en-IN") : value;
  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"16px 18px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",border:`1px solid ${color}18`,display:"flex",flexDirection:"column",gap:8,transition:"transform 0.15s,box-shadow 0.15s",cursor:"default" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 24px ${color}22`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.07)";}}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div style={{ width:44,height:44,background:bg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{icon}</div>
        {spark && <Sparkline data={spark} color={color}/>}
        {trend !== undefined && <span style={{ fontSize:11,fontWeight:700,color:trend>0?"#10B981":"#EF4444",background:trend>0?"#ECFDF5":"#FEF2F2",padding:"3px 8px",borderRadius:8 }}>{trend>0?"↑":"↓"}{Math.abs(trend)}%</span>}
      </div>
      <div>
        <div style={{ fontSize:26,fontWeight:900,color,lineHeight:1 }}>{display}</div>
        <div style={{ fontSize:12,fontWeight:700,color:"#374151",marginTop:4 }}>{label}</div>
        {sub && <div style={{ fontSize:11,color:"#94A3B8",marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

const ALL_QUICK_LINKS = [
  { icon:"👨‍🎓", label:"Add Student",     to:"/students",       color:"#6366F1", bg:"#EEF2FF", roles:['admin','super_admin'] },
  { icon:"📅",   label:"Take Attendance", to:"/attendance",     color:"#10B981", bg:"#ECFDF5", roles:['admin','super_admin','teacher'] },
  { icon:"📚",   label:"Assign Homework", to:"/homework",       color:"#F59E0B", bg:"#FFFBEB", roles:['admin','super_admin','teacher'] },
  { icon:"💰",   label:"Collect Fee",     to:"/fees",           color:"#3B82F6", bg:"#EFF6FF", roles:['admin','super_admin'] },
  { icon:"📝",   label:"New Exam",        to:"/exams",          color:"#8B5CF6", bg:"#F5F3FF", roles:['admin','super_admin','teacher'] },
  { icon:"🎓",   label:"New Enquiry",     to:"/admissions",     color:"#EC4899", bg:"#FDF2F8", roles:['admin','super_admin','teacher'] },
  { icon:"📢",   label:"Announcement",    to:"/communications", color:"#EF4444", bg:"#FEF2F2", roles:['admin','super_admin','teacher'] },
  { icon:"⚙️",   label:"Settings",        to:"/settings",       color:"#64748B", bg:"#F1F5F9", roles:['admin','super_admin'] },
  { icon:"📊",   label:"View Marks",      to:"/marks",          color:"#6366F1", bg:"#EEF2FF", roles:['teacher'] },
  { icon:"🏫",   label:"My Classes",      to:"/classes",        color:"#10B981", bg:"#ECFDF5", roles:['teacher'] },
];

// ── Demo fallback data (staff) ────────────────────────────────
const DEMO_STAFF_STATS = {
  admissions: {
    pipeline:        { new:8, contacted:5, visit:3, docs:2, enrolled:4, rejected:1 },
    today:           3,
    follow_ups_today:5,
    this_week:       14,
    enrolled_month:  6,
    total_enquiries: 23,
    conversion_rate: 17.4,
  },
  students:      { total: 248 },
  announcements: [],
  recent_enquiries: [],
};

function FeeArc({ collected, total }) {
  const pct = total > 0 ? collected/total : 0;
  const r = 54, cx = 70, cy = 70;
  const startAngle = -210, endAngle = 30;
  const totalArc = endAngle - startAngle;
  const filledArc = totalArc * pct;
  const toRad = deg => (deg*Math.PI)/180;
  const arcPath = (start, end, radius) => {
    const s = { x: cx + radius*Math.cos(toRad(start)), y: cy + radius*Math.sin(toRad(start)) };
    const e = { x: cx + radius*Math.cos(toRad(end)),   y: cy + radius*Math.sin(toRad(end))   };
    const large = (end-start) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
      <svg width={140} height={100} style={{ overflow:"visible" }}>
        <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="#F1F5F9" strokeWidth={12} strokeLinecap="round"/>
        <path d={arcPath(startAngle, startAngle+filledArc, r)} fill="none" stroke="#6366F1" strokeWidth={12} strokeLinecap="round"/>
        <text x={cx} y={cy-4}  textAnchor="middle" style={{ fontSize:18,fontWeight:900,fill:"#0F172A" }}>Rs.{(collected/100000).toFixed(1)}L</text>
        <text x={cx} y={cx+12} textAnchor="middle" style={{ fontSize:9,fill:"#94A3B8" }}>of Rs.{(total/100000).toFixed(1)}L</text>
      </svg>
      <div style={{ fontSize:13,fontWeight:800,color:"#6366F1" }}>{Math.round(pct*100)}% Collected</div>
    </div>
  );
}

function AttendanceRing({ percent }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
      <Donut
        segments={[
          { value:percent,    color:"#10B981" },
          { value:Math.max(100-percent,0), color:"#F1F5F9" },
        ]}
        size={110} thickness={16}
        label={`${percent}%`} sublabel="present"/>
      <div style={{ display:"flex",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:11 }}>
          <div style={{ width:8,height:8,borderRadius:"50%",background:"#10B981" }}/>
          <span style={{ color:"#64748B",fontWeight:600 }}>Present</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:11 }}>
          <div style={{ width:8,height:8,borderRadius:"50%",background:"#F1F5F9",border:"1px solid #E2E8F0" }}/>
          <span style={{ color:"#64748B",fontWeight:600 }}>Absent</span>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ width="100%", height=20, radius=8 }) {
  return (
    <div style={{ width,height,borderRadius:radius,background:"linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite" }}/>
  );
}

// ── Staff Dashboard ───────────────────────────────────────────
const STAGE_META = {
  new:       { label:'New',       color:'#6366F1', bg:'#EEF2FF' },
  contacted: { label:'Contacted', color:'#3B82F6', bg:'#EFF6FF' },
  visit:     { label:'Visit',     color:'#F59E0B', bg:'#FFFBEB' },
  docs:      { label:'Docs',      color:'#8B5CF6', bg:'#F5F3FF' },
  enrolled:  { label:'Enrolled',  color:'#10B981', bg:'#ECFDF5' },
  rejected:  { label:'Rejected',  color:'#EF4444', bg:'#FEF2F2' },
}

function StaffDashboard({ user }) {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'

  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [time,    setTime]    = useState(new Date())
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening')
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true); setError(null)
      const res = await apiFetch('/dashboard/staff-stats')
      if (res.success) setStats(res.data)
    } catch (e) {
      setError(e.message)
      setStats(DEMO_STAFF_STATS)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchStats() }, [])
  useEffect(() => {
    const t = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const S   = stats || DEMO_STAFF_STATS
  const adm = S.admissions || {}
  const pipeline        = adm.pipeline        || {}
  const todayEnquiries  = adm.today            ?? 0
  const followUps       = adm.follow_ups_today ?? 0
  const thisWeek        = adm.this_week        ?? 0
  const enrolledMonth   = adm.enrolled_month   ?? 0
  const totalEnquiries  = adm.total_enquiries  ?? 0
  const conversionRate  = adm.conversion_rate  ?? 0
  const totalStudents   = S.students?.total    ?? 0
  const announcements   = S.announcements      ?? []
  const recentEnquiries = S.recent_enquiries   ?? []

  const timeStr = time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  const dateStr = time.toLocaleDateString('en-IN',  { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  const kpi = [
    { icon:'🎓', label:'Enquiries Today',   value:todayEnquiries, color:'#6366F1', bg:'#EEF2FF' },
    { icon:'📞', label:'Follow-ups Today',  value:followUps,      color:'#8B5CF6', bg:'#F5F3FF' },
    { icon:'📅', label:'This Week',         value:thisWeek,       color:'#3B82F6', bg:'#EFF6FF' },
    { icon:'✅', label:'Enrolled This Month',value:enrolledMonth, color:'#10B981', bg:'#ECFDF5' },
  ]

  const quickActions = [
    { icon:'🎓', label:'New Enquiry',    to:'/admissions',     color:'#6366F1', bg:'#EEF2FF' },
    { icon:'👨‍🎓', label:'Students',     to:'/students',       color:'#3B82F6', bg:'#EFF6FF' },
    { icon:'📢', label:'Announcement',   to:'/communications', color:'#EC4899', bg:'#FDF2F8' },
    { icon:'📋', label:'Leave Requests', to:'/leaves',         color:'#F59E0B', bg:'#FFFBEB' },
    { icon:'🏫', label:'Classes',        to:'/classes',        color:'#10B981', bg:'#ECFDF5' },
    { icon:'🔔', label:'Notifications',  to:'/notifications',  color:'#EF4444', bg:'#FEF2F2' },
  ]

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:'#F0F4F8', minHeight:'100vh' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'10px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, color:'#B91C1C' }}>Showing demo data — API unavailable.</span>
          <button onClick={fetchStats} style={{ fontSize:12, color:'#6366F1', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Retry</button>
        </div>
      )}

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#6366F1 100%)', borderRadius:20, padding:isMobile?'18px 16px':'28px 32px', marginBottom:24, color:'#fff', display:'flex', justifyContent:'space-between', alignItems:isMobile?'flex-start':'center', overflow:'hidden', position:'relative', flexWrap:isMobile?'wrap':'nowrap', gap:12 }}>
        <div style={{ position:'absolute', right:-40, top:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>
        <div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', fontWeight:600, marginBottom:4 }}>{dateStr}</div>
          <div style={{ fontSize:isMobile?20:26, fontWeight:900, letterSpacing:-0.5 }}>{greeting}, {user?.name || 'Staff'} 👋</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:6 }}>Admissions & Student Enrollment Dashboard</div>
          <div style={{ display:'flex', gap:isMobile?8:16, marginTop:isMobile?10:16, flexWrap:'wrap' }}>
            {[
              [`${totalEnquiries} Total Enquiries`, '#A5B4FC'],
              [`${conversionRate}% Conversion`,      '#6EE7B7'],
              [`${totalStudents} Students`,           '#FCD34D'],
              [`${followUps} Follow-ups Today`,       '#F9A8D4'],
            ].map(([t,c]) => (
              <div key={t} style={{ background:'rgba(255,255,255,0.1)', borderRadius:10, padding:isMobile?'5px 10px':'6px 14px', fontSize:isMobile?11:12, fontWeight:700, color:c, backdropFilter:'blur(4px)' }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0, display:isMobile?'none':'block' }}>
          <div style={{ fontSize:44, fontWeight:900, letterSpacing:-1, fontVariantNumeric:'tabular-nums' }}>{timeStr}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:4 }}>Live Clock</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':isTablet?'repeat(2,1fr)':'repeat(4,1fr)', gap:isMobile?10:14, marginBottom:24 }}>
        {loading
          ? [1,2,3,4].map(i => <div key={i} style={{ background:'#fff', borderRadius:16, padding:'16px 18px', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', height:100 }}><Skeleton height={20} width="60%"/></div>)
          : kpi.map(k => (
            <div key={k.label} style={{ background:'#fff', borderRadius:16, padding:'16px 18px', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', border:`1px solid ${k.color}18`, display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ width:44, height:44, background:k.bg, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{k.icon}</div>
              <div>
                <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginTop:4 }}>{k.label}</div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Pipeline + Quick Actions */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':isTablet?'1fr 1fr':'1.5fr 1fr', gap:16, marginBottom:16 }}>

        {/* Pipeline */}
        <div style={{ background:'#fff', borderRadius:16, padding:isMobile?14:22, boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0F172A', marginBottom:4 }}>Admissions Pipeline</div>
          <div style={{ fontSize:11, color:'#94A3B8', marginBottom:16 }}>Enquiry stage breakdown</div>
          {loading
            ? [1,2,3,4,5,6].map(i => <div key={i} style={{ marginBottom:8 }}><Skeleton height={40} radius={10}/></div>)
            : Object.entries(STAGE_META).map(([stage, meta]) => {
                const count = pipeline[stage] ?? 0
                const total = Object.values(pipeline).reduce((a,b) => a + Number(b), 0) || 1
                const pct   = Math.round((count / total) * 100)
                return (
                  <div key={stage} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:meta.color }}/>
                        <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>{meta.label}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:900, color:meta.color }}>{count}</span>
                    </div>
                    <div style={{ height:8, background:'#F1F5F9', borderRadius:99 }}>
                      <div style={{ height:8, width:`${pct}%`, background:meta.color, borderRadius:99, transition:'width 0.8s ease', minWidth: count > 0 ? 8 : 0 }}/>
                    </div>
                  </div>
                )
              })
          }
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>Conversion Rate</div>
            <div style={{ fontSize:18, fontWeight:900, color:'#10B981' }}>{conversionRate}%</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background:'#fff', borderRadius:16, padding:isMobile?14:22, boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0F172A', marginBottom:16 }}>Quick Actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {quickActions.map(l => (
              <a key={l.label} href={l.to} style={{ textDecoration:'none' }}>
                <div style={{ background:l.bg, borderRadius:11, padding:'12px 10px', textAlign:'center', cursor:'pointer', transition:'transform 0.15s,box-shadow 0.15s', border:`1px solid ${l.color}22` }}
                  onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow=`0 4px 14px ${l.color}30` }}
                  onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                  <div style={{ fontSize:22, marginBottom:5 }}>{l.icon}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:l.color, lineHeight:1.3 }}>{l.label}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Enquiries + Announcements */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':isTablet?'1fr 1fr':'1.5fr 1fr', gap:16 }}>

        {/* Recent Enquiries */}
        <div style={{ background:'#fff', borderRadius:16, padding:isMobile?14:22, boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#0F172A' }}>Recent Enquiries</div>
            <a href="/admissions" style={{ fontSize:11, color:'#6366F1', fontWeight:700, textDecoration:'none' }}>View all →</a>
          </div>
          {loading
            ? [1,2,3,4,5].map(i => <div key={i} style={{ marginBottom:8 }}><Skeleton height={52} radius={10}/></div>)
            : recentEnquiries.length === 0
              ? <div style={{ textAlign:'center', padding:'32px 0', fontSize:13, color:'#94A3B8', fontWeight:600 }}>No recent enquiries</div>
              : recentEnquiries.map(enq => {
                  const meta = STAGE_META[enq.stage] || STAGE_META.new
                  return (
                    <div key={enq.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#F8FAFC', borderRadius:10, marginBottom:6, border:'1px solid #E2E8F0' }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🎓</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{enq.student_name}</div>
                        <div style={{ fontSize:11, color:'#64748B', fontWeight:600 }}>Class {enq.apply_class} · {enq.parent_name || '—'}</div>
                      </div>
                      <div style={{ background:meta.bg, borderRadius:8, padding:'3px 10px', fontSize:10, fontWeight:800, color:meta.color, flexShrink:0 }}>{meta.label}</div>
                    </div>
                  )
                })
          }
        </div>

        {/* Announcements */}
        <div style={{ background:'#fff', borderRadius:16, padding:isMobile?14:22, boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0F172A', marginBottom:16 }}>Pinned Announcements</div>
          {loading
            ? [1,2,3].map(i => <div key={i} style={{ marginBottom:8 }}><Skeleton height={52} radius={10}/></div>)
            : announcements.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ fontSize:32 }}>📢</div>
                  <div style={{ fontSize:12, color:'#94A3B8', marginTop:8, fontWeight:600 }}>No pinned announcements</div>
                  <a href="/communications" style={{ fontSize:11, color:'#6366F1', fontWeight:700, textDecoration:'none' }}>Go to Communications →</a>
                </div>
              ) : announcements.map(a => (
                <div key={a.id} style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 14px', marginBottom:6, border:'1px solid #E2E8F0' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0F172A', lineHeight:1.4 }}>{a.title}</div>
                  <div style={{ fontSize:10, color:'#94A3B8', marginTop:3 }}>{new Date(a.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</div>
                </div>
              ))
          }
          {/* Stats summary */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #F1F5F9' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:10 }}>This Month Summary</div>
            {[
              { label:'Total Students', value:totalStudents,  color:'#6366F1' },
              { label:'Enrolled',       value:enrolledMonth,  color:'#10B981' },
              { label:'Total Enquiries',value:totalEnquiries, color:'#3B82F6' },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #F1F5F9' }}>
                <span style={{ fontSize:11, color:'#64748B', fontWeight:600 }}>{item.label}</span>
                <span style={{ fontSize:14, fontWeight:900, color:item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Demo fallback data ────────────────────────────────────────
const DEMO_STATS = {
  students:    { total:248 },
  teachers:    { total:18 },
  attendance:  { present_today:226, absent_today:22, percent_today:91,
                 trend:[{date:"Mon",percent:88},{date:"Tue",percent:92},{date:"Wed",percent:89},{date:"Thu",percent:94},{date:"Fri",percent:91},{date:"Sat",percent:85},{date:"Sun",percent:null}] },
  fees:        { total_billed:1000000, total_collected:842000, total_due:158000, unpaid_count:38, partial_count:12, paid_count:198 },
  homework:    { pending:10, overdue:2 },
  admissions:  { this_week:10, enrolled:2 },
  announcements: [],
};

// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'
  const { user } = useAuthStore()
  const role      = user?.role || 'admin'
  const isAdmin   = ['admin', 'super_admin'].includes(role)

  if (role === 'staff') return <StaffDashboard user={user} />
  const QUICK_LINKS = ALL_QUICK_LINKS.filter(l => l.roles.includes(role))

  const [greeting, setGreeting] = useState("");
  const [time, setTime]         = useState(new Date());
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [systemAnnouncements, setSystemAnnouncements] = useState([]);

  useEffect(()=>{
    const h = new Date().getHours();
    setGreeting(h<12?"Good Morning":h<17?"Good Afternoon":"Good Evening");
    const t = setInterval(()=>setTime(new Date()),1000);
    return ()=>clearInterval(t);
  },[]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/dashboard/stats');
      if (res.success) { setStats(res.data); setLastRefresh(new Date()); }
    } catch(e) {
      setError(e.message);
      setStats(DEMO_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ fetchStats(); },[]);
  useEffect(()=>{
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  },[]);

  useEffect(()=>{
    apiFetch('/system-announcements')
      .then(res => { if (res.success) setSystemAnnouncements(res.data) })
      .catch(()=>{});
  },[]);

  const timeStr = time.toLocaleTimeString("en-IN",{ hour:"2-digit",minute:"2-digit" });
  const dateStr = time.toLocaleDateString("en-IN",{ weekday:"long",day:"numeric",month:"long",year:"numeric" });

  const S = stats || DEMO_STATS;
  const totalStudents   = S.students?.total ?? 0;
  const totalTeachers   = S.teachers?.total ?? 0;
  const attendancePct   = S.attendance?.percent_today ?? 0;
  const presentToday    = S.attendance?.present_today ?? 0;
  const absentToday     = S.attendance?.absent_today  ?? 0;
  const feeBilled       = S.fees?.total_billed    ?? 0;
  const feeCollected    = S.fees?.total_collected ?? 0;
  const feeDue          = S.fees?.total_due       ?? 0;
  const unpaidCount     = S.fees?.unpaid_count    ?? 0;
  const partialCount    = S.fees?.partial_count   ?? 0;
  const paidCount       = S.fees?.paid_count      ?? 0;
  const homeworkPending = S.homework?.pending  ?? 0;
  const homeworkOverdue = S.homework?.overdue  ?? 0;
  const enquiriesActive = S.admissions?.active     ?? S.admissions?.total ?? 0;
  const enquiriesWeek   = S.admissions?.this_week  ?? 0;
  const enrolled        = S.admissions?.enrolled   ?? 0;
  const announcements   = S.announcements ?? [];
  const attTrend        = S.attendance?.trend ?? [];
  const leavesPending   = S.leaves?.pending   ?? 0;
  const leavesApproved  = S.leaves?.approved  ?? 0;
  const leavesRejected  = S.leaves?.rejected  ?? 0;
  const leavesTotal     = S.leaves?.total     ?? 0;

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {error && (
        <div style={{ background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,padding:"10px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:13,color:"#B91C1C" }}>Showing demo data - API unavailable. Start Laravel server to see live data.</span>
          <button onClick={fetchStats} style={{ fontSize:12,color:"#6366F1",background:"none",border:"none",cursor:"pointer",fontWeight:700 }}>Retry</button>
        </div>
      )}

      {/* Hero header */}
      <div style={{ background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#6366F1 100%)",borderRadius:20,padding:isMobile?"18px 16px":"28px 32px",marginBottom:24,color:"#fff",display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",overflow:"hidden",position:"relative",flexWrap:isMobile?"wrap":"nowrap",gap:isMobile?12:0 }}>
        <div style={{ position:"absolute",right:-40,top:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.04)" }}/>
        <div style={{ position:"absolute",right:80,bottom:-60,width:160,height:160,borderRadius:"50%",background:"rgba(99,102,241,0.15)" }}/>
        <div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.55)",fontWeight:600,marginBottom:4 }}>{dateStr}</div>
          <div style={{ fontSize:isMobile?20:26,fontWeight:900,letterSpacing:-0.5 }}>{greeting}, {user?.name || 'Principal'} 👋</div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:6 }}>Here's what's happening at {user?.school?.name || 'your school'} today</div>
          <div style={{ display:"flex",gap:isMobile?8:16,marginTop:isMobile?10:16,flexWrap:"wrap" }}>
            {loading ? [1,2,3,4].map(i=>(
              <div key={i} style={{ background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"6px 14px",width:100,height:28 }}/>
            )) : (isAdmin ? [
              [`${totalStudents} Students`, "#A5B4FC"],
              [`${totalTeachers} Teachers`, "#6EE7B7"],
              [`${attendancePct}% Present`, "#FCD34D"],
              [`${enquiriesWeek} Enquiries`,"#F9A8D4"],
            ] : [
              [`${totalStudents} Students`,   "#A5B4FC"],
              [`${attendancePct}% Present`,   "#FCD34D"],
              [`${homeworkPending} Homework`, "#FCD34D"],
              [`${homeworkOverdue} Overdue`,  "#FCA5A5"],
            ]).map(([t,c])=>(
              <div key={t} style={{ background:"rgba(255,255,255,0.1)",borderRadius:10,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?11:12,fontWeight:700,color:c,backdropFilter:"blur(4px)" }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ textAlign:"right",flexShrink:0,display:isMobile?"none":"block" }}>
          <div style={{ fontSize:44,fontWeight:900,letterSpacing:-1,fontVariantNumeric:"tabular-nums" }}>{timeStr}</div>
          <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4 }}>Live Clock</div>
          {lastRefresh && !error && (
            <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:4 }}>
              Live data · Updated {lastRefresh.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
              <span style={{ cursor:"pointer",marginLeft:6,textDecoration:"underline" }} onClick={fetchStats}>Refresh</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat widgets */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":isTablet?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?10:14,marginBottom:24 }}>
        {loading ? [1,2,3,4].map(i=>(
          <div key={i} style={{ background:"#fff",borderRadius:16,padding:"16px 18px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:12 }}>
            <Skeleton height={44} width="40%" radius={12}/>
            <Skeleton height={26} width="55%"/>
            <Skeleton height={14} width="75%"/>
            <Skeleton height={11} width="45%"/>
          </div>
        )) : (
          <>
            <StatWidget icon="👨‍🎓" label="Total Students"     value={totalStudents}    color="#6366F1" bg="#EEF2FF" sub={`${absentToday} absent today`}              spark={attTrend} trend={2}/>
            {isAdmin
              ? <StatWidget icon="💰" label="Fees Collected"   value={Math.round(feeCollected)} color="#10B981" bg="#ECFDF5" sub={`Rs.${(feeDue/1000).toFixed(0)}k pending`} spark={attTrend}/>
              : <StatWidget icon="📚" label="Homework Pending" value={homeworkPending}           color="#F59E0B" bg="#FFFBEB" sub={`${homeworkOverdue} overdue`}            spark={attTrend}/>
            }
            <StatWidget icon="📅"   label="Today's Attendance" value={`${attendancePct}%`}      color="#F59E0B" bg="#FFFBEB" sub={`${presentToday} present of ${totalStudents}`} spark={attTrend}/>
            {isAdmin
              ? <StatWidget icon="🎓" label="Active Enquiries"  value={enquiriesActive}  color="#3B82F6" bg="#EFF6FF" sub={`${enrolled} enrolled this term`}  spark={attTrend} trend={15}/>
              : <StatWidget icon="⚠️" label="Homework Overdue"  value={homeworkOverdue}  color="#EF4444" bg="#FEF2F2" sub="need attention"                     spark={attTrend}/>
            }
          </>
        )}
      </div>

      {/* Row 2: Fee + Attendance + Announcements */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"1fr 1fr 1fr",gap:16,marginBottom:16 }}>

        {isAdmin ? (
          <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Fee Collection</div>
            {loading ? <div style={{ display:"flex",justifyContent:"center",padding:20 }}><Skeleton height={100} width="60%" radius={50}/></div> : (
              <>
                <div style={{ display:"flex",justifyContent:"center",marginBottom:14 }}>
                  <FeeArc collected={feeCollected} total={feeBilled||1}/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:isMobile?"repeat(4,1fr)":"1fr 1fr",gap:isMobile?6:8 }}>
                  {[
                    ["Collected","Rs."+(feeCollected/1000).toFixed(0)+"k","#10B981","#ECFDF5"],
                    ["Pending",  "Rs."+(feeDue/1000).toFixed(0)+"k",      "#EF4444","#FEF2F2"],
                    ["Overdue",  unpaidCount+" invoices",                 "#F59E0B","#FFFBEB"],
                    ["Paid",     paidCount+" students",                   "#6366F1","#EEF2FF"],
                  ].map(([k,v,c,bg])=>(
                    <div key={k} style={{ background:bg,borderRadius:9,padding:"9px 12px" }}>
                      <div style={{ fontSize:10,color:"#94A3B8",fontWeight:600 }}>{k}</div>
                      <div style={{ fontSize:14,fontWeight:900,color:c,marginTop:2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>📚 My Overview</div>
            {loading ? <div style={{ display:"grid",gap:10 }}>{[1,2,3,4].map(i=><Skeleton key={i} height={44} radius={10}/>)}</div> : (
              <div style={{ display:"grid",gap:10 }}>
                {[
                  { label:"Homework Pending", value:homeworkPending, icon:"📚", color:"#F59E0B", bg:"#FFFBEB" },
                  { label:"Homework Overdue", value:homeworkOverdue, icon:"⚠️", color:"#EF4444", bg:"#FEF2F2" },
                  { label:"Students Present", value:presentToday,    icon:"✅", color:"#10B981", bg:"#ECFDF5" },
                  { label:"Students Absent",  value:absentToday,     icon:"❌", color:"#EF4444", bg:"#FEF2F2" },
                ].map(item=>(
                  <div key={item.label} style={{ display:"flex",alignItems:"center",gap:12,background:item.bg,borderRadius:10,padding:"10px 14px" }}>
                    <div style={{ fontSize:20,flexShrink:0 }}>{item.icon}</div>
                    <div style={{ flex:1,fontSize:11,color:"#64748B",fontWeight:600 }}>{item.label}</div>
                    <div style={{ fontSize:18,fontWeight:900,color:item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Today's Attendance</div>
          {loading ? <div style={{ display:"flex",justifyContent:"center",padding:20 }}><Skeleton height={110} width={110} radius={55}/></div> : (
            <>
              <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}>
                <AttendanceRing percent={attendancePct}/>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <div style={{ flex:1,background:"#ECFDF5",borderRadius:9,padding:"8px 12px",textAlign:"center" }}>
                  <div style={{ fontSize:18,fontWeight:900,color:"#10B981" }}>{presentToday}</div>
                  <div style={{ fontSize:10,color:"#94A3B8" }}>Present</div>
                </div>
                <div style={{ flex:1,background:"#FEF2F2",borderRadius:9,padding:"8px 12px",textAlign:"center" }}>
                  <div style={{ fontSize:18,fontWeight:900,color:"#EF4444" }}>{absentToday}</div>
                  <div style={{ fontSize:10,color:"#94A3B8" }}>Absent</div>
                </div>
                <div style={{ flex:1,background:"#EFF6FF",borderRadius:9,padding:"8px 12px",textAlign:"center" }}>
                  <div style={{ fontSize:18,fontWeight:900,color:"#3B82F6" }}>{Math.max(totalStudents-presentToday-absentToday,0)}</div>
                  <div style={{ fontSize:10,color:"#94A3B8" }}>Not Marked</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          {systemAnnouncements.length > 0 && (
            <div style={{ marginBottom:16 }}>
              {systemAnnouncements.map(ann => (
                <div key={ann.id} style={{
                  background:'linear-gradient(135deg,#1E3A5F,#6366F1)',
                  borderRadius:12, padding:'12px 16px',
                  marginBottom:8, color:'#fff',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <span style={{ fontSize:20 }}>📣</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:13 }}>
                      {ann.title}
                      <span style={{
                        background:'rgba(255,255,255,0.2)', borderRadius:20,
                        padding:'1px 8px', fontSize:10, marginLeft:8, fontWeight:600,
                      }}>
                        From Vikashana Team
                      </span>
                    </div>
                    <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>{ann.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Pinned Announcements</div>
          {loading ? <div style={{ display:"grid",gap:10 }}>{[1,2,3].map(i=><Skeleton key={i} height={52} radius={10}/>)}</div>
          : announcements.length > 0 ? (
            <div style={{ display:"grid",gap:8 }}>
              {announcements.map(a=>(
                <div key={a.id} style={{ background:"#F8FAFC",borderRadius:10,padding:"10px 14px",border:"1px solid #E2E8F0" }}>
                  <div style={{ fontSize:12,fontWeight:700,color:"#0F172A",marginBottom:3,lineHeight:1.4 }}>{a.title}</div>
                  <div style={{ fontSize:10,color:"#94A3B8" }}>{new Date(a.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:"grid",gap:10 }}>
              {[
                {label:"Homework Pending",value:homeworkPending,icon:"📚",color:"#F59E0B",bg:"#FFFBEB"},
                {label:"Homework Overdue",value:homeworkOverdue,icon:"⚠️",color:"#EF4444",bg:"#FEF2F2"},
                {label:"Enquiries (7d)",  value:enquiriesWeek,  icon:"🎓",color:"#3B82F6",bg:"#EFF6FF"},
              ].map(item=>(
                <div key={item.label} style={{ background:item.bg,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:11,color:"#94A3B8",fontWeight:600 }}>{item.label}</div>
                    <div style={{ fontSize:20,fontWeight:900,color:item.color }}>{item.value}</div>
                  </div>
                  <div style={{ fontSize:28 }}>{item.icon}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Fee status + Leave summary + Quick summary */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":(isAdmin?"1.4fr 1fr 1fr":"1.4fr 1fr"),gap:16,marginBottom:16 }}>

        {isAdmin ? (
          <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:4 }}>Fee Status Overview</div>
            <div style={{ fontSize:11,color:"#94A3B8",marginBottom:16 }}>Invoice breakdown - current academic year</div>
            {loading ? <Skeleton height={120}/> : (
              <>
                {(() => {
                  const total = paidCount + partialCount + unpaidCount || 1;
                  const paid_pct    = Math.round((paidCount/total)*100);
                  const partial_pct = Math.round((partialCount/total)*100);
                  const unpaid_pct  = 100 - paid_pct - partial_pct;
                  return (
                    <>
                      <div style={{ display:"flex",height:20,borderRadius:99,overflow:"hidden",gap:2,marginBottom:8 }}>
                        <div style={{ width:`${paid_pct}%`,background:"#10B981",transition:"width 1s" }}/>
                        <div style={{ width:`${partial_pct}%`,background:"#F59E0B",transition:"width 1s" }}/>
                        <div style={{ width:`${Math.max(unpaid_pct,0)}%`,background:"#EF4444",transition:"width 1s" }}/>
                      </div>
                      <div style={{ display:"flex",gap:16,marginBottom:16 }}>
                        {[["Paid",paidCount,"#10B981"],["Partial",partialCount,"#F59E0B"],["Unpaid",unpaidCount,"#EF4444"]].map(([l,v,c])=>(
                          <div key={l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:11 }}>
                            <div style={{ width:8,height:8,borderRadius:"50%",background:c }}/>
                            <span style={{ color:"#64748B",fontWeight:600 }}>{l}: <strong style={{ color:c }}>{v}</strong></span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
                <div style={{ display:"flex",gap:10,paddingTop:14,borderTop:"1px solid #F1F5F9" }}>
                  {[
                    ["Total Billed",`Rs.${(feeBilled/100000).toFixed(2)}L`,"#6366F1"],
                    ["Collected",   `Rs.${(feeCollected/100000).toFixed(2)}L`,"#10B981"],
                    ["Pending",     `Rs.${(feeDue/100000).toFixed(2)}L`,"#EF4444"],
                    ["Collection%", `${feeBilled>0?Math.round((feeCollected/feeBilled)*100):0}%`,"#F59E0B"],
                  ].map(([k,v,c])=>(
                    <div key={k} style={{ flex:1,textAlign:"center" }}>
                      <div style={{ fontSize:16,fontWeight:900,color:c }}>{v}</div>
                      <div style={{ fontSize:10,color:"#94A3B8",fontWeight:600,marginTop:2 }}>{k}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:4 }}>📚 Homework Summary</div>
            <div style={{ fontSize:11,color:"#94A3B8",marginBottom:16 }}>Your assigned homework status</div>
            {loading ? <div style={{ display:"grid",gap:8 }}>{[1,2,3,4].map(i=><Skeleton key={i} height={44} radius={10}/>)}</div> : (
              <div style={{ display:"grid",gap:8 }}>
                {[
                  { label:"Active",                  value:homeworkPending, color:"#10B981" },
                  { label:"Overdue",                 value:homeworkOverdue, color:"#EF4444" },
                  { label:"Students Present Today",  value:presentToday,    color:"#3B82F6" },
                  { label:"Students Absent Today",   value:absentToday,     color:"#F59E0B" },
                ].map(item=>(
                  <div key={item.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#F8FAFC",borderRadius:10,border:"1px solid #E2E8F0" }}>
                    <span style={{ fontSize:12,fontWeight:600,color:"#374151" }}>{item.label}</span>
                    <span style={{ fontSize:18,fontWeight:900,color:item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
              <div style={{ fontWeight:800,fontSize:14,color:"#0F172A" }}>📋 Leave Requests</div>
              <a href="/leaves" style={{ fontSize:11,color:"#6366F1",fontWeight:700,textDecoration:"none" }}>View all →</a>
            </div>
            {loading ? <div style={{ display:"grid",gap:10 }}>{[1,2,3,4].map(i=><Skeleton key={i} height={44} radius={10}/>)}</div> : (
              <>
                <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}>
                  <Donut
                    segments={leavesTotal === 0
                      ? [{ value:1, color:"#F1F5F9" }]
                      : [
                          { value: leavesApproved, color:"#10B981" },
                          { value: leavesPending,  color:"#F59E0B" },
                          { value: leavesRejected, color:"#EF4444" },
                        ]}
                    size={110} thickness={16}
                    label={leavesTotal} sublabel="total"/>
                </div>
                <div style={{ display:"grid",gap:8 }}>
                  {[
                    { label:"Pending Review", value:leavesPending,  color:"#D97706", bg:"#FFFBEB" },
                    { label:"Approved",        value:leavesApproved, color:"#059669", bg:"#ECFDF5" },
                    { label:"Rejected",        value:leavesRejected, color:"#DC2626", bg:"#FEF2F2" },
                  ].map(item=>(
                    <div key={item.label} style={{ display:"flex",alignItems:"center",gap:12,background:item.bg,borderRadius:10,padding:"10px 14px" }}>
                      <div style={{ flex:1,fontSize:11,color:"#64748B",fontWeight:600 }}>{item.label}</div>
                      <div style={{ fontSize:18,fontWeight:900,color:item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Quick Summary</div>
          {loading ? <div style={{ display:"grid",gap:10 }}>{[1,2,3,4,5,6].map(i=><Skeleton key={i} height={44} radius={10}/>)}</div> : (
            <div style={{ display:"grid",gap:8 }}>
              {[
                {label:"Students",            value:totalStudents,    icon:"👨‍🎓",color:"#6366F1",bg:"#EEF2FF"},
                {label:"Teachers",            value:totalTeachers,    icon:"👨‍🏫",color:"#10B981",bg:"#ECFDF5"},
                {label:"Homework Pending",    value:homeworkPending,  icon:"📚", color:"#F59E0B",bg:"#FFFBEB"},
                {label:"Homework Overdue",    value:homeworkOverdue,  icon:"⚠️", color:"#EF4444",bg:"#FEF2F2"},
                {label:"Enquiries This Week", value:enquiriesWeek,    icon:"🎓", color:"#3B82F6",bg:"#EFF6FF"},
                {label:"Enrolled This Term",  value:enrolled,         icon:"✅", color:"#8B5CF6",bg:"#F5F3FF"},
              ].map(item=>(
                <div key={item.label} style={{ display:"flex",alignItems:"center",gap:12,background:item.bg,borderRadius:10,padding:"10px 14px" }}>
                  <div style={{ fontSize:20,flexShrink:0 }}>{item.icon}</div>
                  <div style={{ flex:1,fontSize:11,color:"#64748B",fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:18,fontWeight:900,color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Quick actions + 7-day trend */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"1fr 1.2fr",gap:16 }}>

        <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Quick Actions</div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"repeat(4,1fr)":"1fr 1fr",gap:isMobile?6:8 }}>
            {QUICK_LINKS.map(l=>(
              <a key={l.label} href={l.to} style={{ textDecoration:"none" }}>
                <div style={{ background:l.bg,borderRadius:11,padding:isMobile?"10px 6px":"12px 10px",textAlign:"center",cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s",border:`1px solid ${l.color}22` }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow=`0 4px 14px ${l.color}30`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                  <div style={{ fontSize:isMobile?18:22,marginBottom:isMobile?3:5 }}>{l.icon}</div>
                  <div style={{ fontSize:isMobile?9:10,fontWeight:700,color:l.color,lineHeight:1.3 }}>{l.label}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div style={{ background:"#fff",borderRadius:16,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:4 }}>Attendance - Last 7 Days</div>
          <div style={{ fontSize:11,color:"#94A3B8",marginBottom:16 }}>Daily attendance percentage</div>
          {loading ? <Skeleton height={100}/> : (
            <>
              <div style={{ display:"flex",alignItems:"flex-end",gap:8,height:100,paddingTop:10 }}>
                {(attTrend.length>0 ? attTrend : Array(7).fill({date:"---",percent:null})).map((d,i)=>{
                  const pct   = d.percent ?? 0;
                  const color = pct>=90?"#10B981":pct>=75?"#F59E0B":pct>0?"#EF4444":"#E2E8F0";
                  const h     = pct>0 ? Math.max(pct*0.9,8) : 8;
                  return (
                    <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                      {pct>0 && <span style={{ fontSize:8,fontWeight:700,color }}>{pct}%</span>}
                      <div title={pct>0?`${pct}%`:'No data'} style={{ width:"100%",height:`${h}px`,background:color,borderRadius:"4px 4px 0 0",transition:"height 0.8s ease" }}/>
                      <span style={{ fontSize:9,color:"#94A3B8",fontWeight:600 }}>{d.date}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:12,display:"flex",gap:12,justifyContent:"center" }}>
                {[["≥90%","#10B981","Good"],["75-89%","#F59E0B","Average"],["<75%","#EF4444","Low"]].map(([l,c,s])=>(
                  <div key={l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:10 }}>
                    <div style={{ width:8,height:8,borderRadius:2,background:c }}/>
                    <span style={{ color:"#64748B",fontWeight:600 }}>{l} {s}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}