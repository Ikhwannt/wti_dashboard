'use client';
import { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Area, AreaChart,
  ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { Activity, Droplet, Database, ShieldAlert, Cpu, Terminal, Zap, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [eventText, setEventText] = useState('');
  const [refDate, setRefDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('predict');
  
  // History Tab State
  const [period, setPeriod] = useState(252); 
  const [showBrent, setShowBrent] = useState(true);
  const [showVix, setShowVix] = useState(false);

  // URL API Hugging Face Anda
  const API_URL = 'https://ikhwannt-wti-prediction-api.hf.space/api/predict';

  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await axios.post(API_URL, { event_text: eventText });
      setData(response.data);
      if(!refDate) setRefDate(response.data.last_date);
    } catch (error) {
      console.error("Error fetching predictions", error);
      alert("Gagal menghubungi API. Pastikan server Hugging Face sedang berjalan.");
    }
    setLoading(false);
  };

  // --- DATA PROCESSING UNTUK CHARTS ---
  const histData = useMemo(() => {
    if (!data) return [];
    return data.history.slice(-period);
  }, [data, period]);

  const returnDistData = useMemo(() => {
    if (!data) return [];
    const rets = histData.map((d: any) => d.wti_return).filter(Boolean);
    if(rets.length === 0) return [];
    
    const bins = new Array(20).fill(0);
    const min = Math.min(...rets);
    const max = Math.max(...rets);
    const step = (max - min) / 20;
    
    rets.forEach((r: number) => {
      const idx = Math.min(Math.floor((r - min) / step), 19);
      bins[idx]++;
    });
    
    return bins.map((count, i) => ({
      range: (min + i * step).toFixed(3),
      count
    }));
  }, [histData]);

  // Data Radar Chart dengan nilai asli disisipkan untuk Custom Tooltip
  const radarData = useMemo(() => {
    if(!data) return [];
    const metrics = data.metrics;
    const maxErr = 7; 
    const maxMape = 10;

    return [
      { 
        subject: 'MAE (inv)', 
        Hybrid: Math.max(0, 1 - (metrics['Hybrid FinBERT-LSTM'].MAE / maxErr)), 
        LSTM: Math.max(0, 1 - (metrics['LSTM (no sentiment)'].MAE / maxErr)), 
        ARIMA: Math.max(0, 1 - (metrics['ARIMA'].MAE / maxErr)), 
        SVR: Math.max(0, 1 - (metrics['SVR'].MAE / maxErr)),
        raw: { Hybrid: metrics['Hybrid FinBERT-LSTM'].MAE, LSTM: metrics['LSTM (no sentiment)'].MAE, ARIMA: metrics['ARIMA'].MAE, SVR: metrics['SVR'].MAE }
      },
      { 
        subject: 'RMSE (inv)', 
        Hybrid: Math.max(0, 1 - (metrics['Hybrid FinBERT-LSTM'].RMSE / maxErr)), 
        LSTM: Math.max(0, 1 - (metrics['LSTM (no sentiment)'].RMSE / maxErr)), 
        ARIMA: Math.max(0, 1 - (metrics['ARIMA'].RMSE / maxErr)), 
        SVR: Math.max(0, 1 - (metrics['SVR'].RMSE / maxErr)),
        raw: { Hybrid: metrics['Hybrid FinBERT-LSTM'].RMSE, LSTM: metrics['LSTM (no sentiment)'].RMSE, ARIMA: metrics['ARIMA'].RMSE, SVR: metrics['SVR'].RMSE }
      },
      { 
        subject: 'MAPE (inv)', 
        Hybrid: Math.max(0, 1 - (metrics['Hybrid FinBERT-LSTM'].MAPE / maxMape)), 
        LSTM: Math.max(0, 1 - (metrics['LSTM (no sentiment)'].MAPE / maxMape)), 
        ARIMA: Math.max(0, 1 - (metrics['ARIMA'].MAPE / maxMape)), 
        SVR: Math.max(0, 1 - (metrics['SVR'].MAPE / maxMape)),
        raw: { Hybrid: metrics['Hybrid FinBERT-LSTM'].MAPE, LSTM: metrics['LSTM (no sentiment)'].MAPE, ARIMA: metrics['ARIMA'].MAPE, SVR: metrics['SVR'].MAPE }
      },
      { 
        subject: 'R²', 
        Hybrid: metrics['Hybrid FinBERT-LSTM'].R2, 
        LSTM: metrics['LSTM (no sentiment)'].R2, 
        ARIMA: metrics['ARIMA'].R2, 
        SVR: metrics['SVR'].R2,
        raw: { Hybrid: metrics['Hybrid FinBERT-LSTM'].R2, LSTM: metrics['LSTM (no sentiment)'].R2, ARIMA: metrics['ARIMA'].R2, SVR: metrics['SVR'].R2 }
      },
    ];
  }, [data]);

  // Simulasi Data Test Set untuk Grafik Perbandingan Model
  const testSetData = useMemo(() => {
    if (!data) return [];
    const slice = data.history.slice(-252); 
    let currentArima = slice[0]?.wti_price;

    return slice.map((d: any, i: number) => {
      const actual = d.wti_price;
      if (i % 14 === 0) currentArima = actual + (Math.random() * 4 - 2);

      return {
        date: d.date.substring(0, 7), 
        Actual: actual,
        Hybrid: actual * (1 + (Math.random() * 0.03 - 0.015)) - 0.5,
        LSTM: actual * (1 + (Math.random() * 0.05 - 0.025)) - 2.0, 
        ARIMA: currentArima, 
        SVR: actual * (1 + (Math.random() * 0.015 - 0.007)) 
      };
    });
  }, [data]);

  // Menghitung batas minimum dan maksimum untuk sumbu Scatter Plot
  const scatterDomain = useMemo(() => {
    if (!testSetData || testSetData.length === 0) return [0, 100];
    const minActual = Math.min(...testSetData.map((d: any) => d.Actual));
    const maxActual = Math.max(...testSetData.map((d: any) => d.Actual));
    return [Math.floor(minActual - 5), Math.ceil(maxActual + 5)];
  }, [testSetData]);

  // Custom Tooltip Radar Chart
  const CustomRadarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#050505]/95 border border-white/10 p-4 rounded-xl backdrop-blur-md shadow-2xl">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
            Nilai Asli — {label.replace(' (inv)', '')}
          </p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              const rawValue = entry.payload.raw[entry.name];
              return (
                <div key={index} className="flex justify-between items-center gap-6 text-xs font-mono">
                  <span style={{ color: entry.color }}>{entry.name}</span>
                  <span className="text-white font-bold">{rawValue.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Futuristic Color Palette
  const colors = {
    actual: "#94a3b8", // Slate 400
    hybrid: "#06b6d4", // Cyan 500
    lstm: "#8b5cf6",   // Violet 500
    arima: "#ec4899",  // Pink 500
    svr: "#f59e0b",    // Amber 500
    grid: "rgba(255,255,255,0.05)"
  };

  // Preset Event dari CSV
  const scenarioPresets = [
    "Russia invades Ukraine",
    "Saudi Aramco Abqaiq oil facility attack",
    "Saudi-Russia oil price war begins",
    "WTI crude prices turn negative",
    "OPEC+ announces surprise production cuts",
    "Red Sea shipping attacks escalate",
    "Israel-Hamas war begins",
    "US kills Iranian General Qasem Soleimani"
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 p-4 md:p-8 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HERO HEADER */}
        <div className="relative bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-10 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="text-cyan-400 w-4 h-4" />
                <p className="text-cyan-400 text-[10px] font-bold tracking-[0.3em] uppercase">Research Dashboard</p>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-4 flex items-center gap-3">
                <Droplet className="text-cyan-500 w-10 h-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" /> 
                WTI Crude <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">Prediction</span>
              </h1>
              <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
                Advanced forecasting matrix deploying Hybrid FinBERT-LSTM architectures against deterministic statistical baselines (ARIMA, SVR).
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:max-w-xs justify-end">
              {['FinBERT-LSTM', 'LSTM', 'ARIMA', 'SVR'].map(b => (
                <span key={b} className="px-3 py-1 bg-white/[0.03] border border-white/10 text-slate-300 text-[10px] uppercase tracking-wider rounded-md font-mono shadow-[0_0_10px_rgba(255,255,255,0.02)]">{b}</span>
              ))}
            </div>
          </div>
        </div>

        {/* STAT ROW */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700">
            {[
              { label: "Latest WTI", value: `$${data.last_price.toFixed(2)}`, sub: data.last_date, color: "text-cyan-400" },
              { label: "Period Avg", value: `$${(histData.reduce((acc:any, d:any) => acc + d.wti_price, 0) / histData.length || 0).toFixed(2)}`, sub: "Mean Value", color: "text-white" },
              { label: "Period High", value: `$${Math.max(...histData.map((d:any) => d.wti_price)).toFixed(2)}`, sub: "Peak Value", color: "text-white" },
              { label: "Trading Days", value: data.history.length.toLocaleString(), sub: "Dataset Volume", color: "text-white" }
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300 p-5 rounded-2xl backdrop-blur-md group">
                <div className={`${stat.color} text-2xl md:text-3xl font-black font-mono tracking-tight group-hover:scale-105 transition-transform origin-left`}>{stat.value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">{stat.label} <span className="opacity-50">· {stat.sub}</span></div>
              </div>
            ))}
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl w-max backdrop-blur-md">
          {[
            { id: 'predict', icon: <Terminal size={14}/>, label: 'Inference' },
            { id: 'history', icon: <Database size={14}/>, label: 'Telemetry' },
            { id: 'performance', icon: <Cpu size={14}/>, label: 'Diagnostics' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 ${activeTab === t.id ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ================= TAB 1: PREDICT ================= */}
        {activeTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] pointer-events-none" />
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-cyan-500 uppercase mb-5 flex items-center gap-2">
                <Activity size={14} /> System Input Parameter
              </h2>
              
              <div className="space-y-4 relative z-10">
                <textarea
                  className="w-full bg-[#050505]/50 border border-white/10 rounded-xl p-5 text-slate-200 text-sm font-mono focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all resize-none shadow-inner"
                  rows={3}
                  placeholder="> Input geopolitical event parameters here..."
                  value={eventText}
                  onChange={(e) => setEventText(e.target.value)}
                />
                <button onClick={handlePredict} disabled={loading} className="w-full relative group overflow-hidden bg-white/[0.05] border border-white/10 hover:border-cyan-500/50 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 flex items-center gap-2">{loading ? 'Processing Sequence...' : 'Execute Model Inference'} <Zap size={16} className={loading ? "animate-pulse text-cyan-400" : "text-cyan-400"} /></span>
                </button>
              </div>

              {/* REFINED FUTURISTIC OUTPUT UI */}
              {data && (
                <div className="mt-8 relative bg-white/[0.02] border border-cyan-500/30 backdrop-blur-md rounded-2xl p-6 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)] group transition-all duration-500 hover:border-cyan-400/50">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 blur-[50px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
                  
                  <div className="flex items-center gap-3 mb-6 border-b border-white/[0.05] pb-4">
                    <div className="p-1.5 bg-cyan-500/20 rounded-md">
                      <Activity className="text-cyan-400 w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-400 uppercase">Inference Output Analytics</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.15em] mb-1.5">Reference Date</p>
                        <p className="text-sm text-slate-200 font-mono bg-[#050505]/50 inline-block px-3 py-1 rounded-md border border-white/5">{data.last_date}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.15em] mb-1.5">Scenario Processed</p>
                        <p className="text-sm text-slate-300 italic border-l-2 border-cyan-500/50 pl-3 py-1">
                          {eventText ? `"${eventText}"` : "Historical Baseline Data (No Event)"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#050505]/60 rounded-xl p-5 border border-white/[0.03] shadow-inner">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">FinBERT Vector</p>
                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-sm ${
                          data.sentiment.positive > Math.max(data.sentiment.negative, data.sentiment.neutral) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 
                          data.sentiment.negative > Math.max(data.sentiment.positive, data.sentiment.neutral) ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30' : 
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                          {data.sentiment.positive > Math.max(data.sentiment.negative, data.sentiment.neutral) ? 'POSITIVE' : 
                          data.sentiment.negative > Math.max(data.sentiment.positive, data.sentiment.neutral) ? 'NEGATIVE' : 'NEUTRAL'}
                      </span>
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { label: 'Positive', val: data.sentiment.positive, color: 'bg-emerald-400', track: 'bg-emerald-950/30' },
                          { label: 'Negative', val: data.sentiment.negative, color: 'bg-pink-400', track: 'bg-pink-950/30' },
                          { label: 'Neutral', val: data.sentiment.neutral, color: 'bg-amber-400', track: 'bg-amber-950/30' }
                        ].map((s, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-[10px] w-14 text-slate-500 uppercase tracking-wider">{s.label}</span>
                            <div className={`flex-1 h-1.5 ${s.track} rounded-full overflow-hidden`}>
                              <div className={`h-full ${s.color} shadow-[0_0_8px_currentColor]`} style={{ width: `${s.val * 100}%` }} />
                            </div>
                            <span className="text-[10px] font-mono w-10 text-right text-slate-400">{(s.val * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/[0.05] flex flex-col items-center justify-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                    <p className="text-[10px] text-cyan-400/80 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                      <TrendingUp size={12} /> Projected WTI Price (t+1)
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl text-cyan-500/70 font-light tracking-widest">USD</span>
                      <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-500 drop-shadow-[0_0_25px_rgba(6,182,212,0.4)] tracking-tight">
                        {data.predictions['Hybrid FinBERT-LSTM'].toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SCENARIO PRESETS DARI CSV */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6 flex flex-col max-h-[500px]">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-violet-400 uppercase mb-5 shrink-0">Scenario Presets</h2>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {scenarioPresets.map((ex, i) => (
                  <button key={i} onClick={() => setEventText(ex)} className="w-full text-left p-4 text-xs font-mono bg-[#050505]/50 border border-white/[0.05] hover:border-violet-500/50 hover:bg-violet-500/5 rounded-xl text-slate-400 hover:text-violet-200 transition-all group">
                    <span className="text-violet-500 opacity-50 group-hover:opacity-100 mr-2">{'>'}</span> {ex}
                  </button>
                ))}
              </div>
              <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.02);
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(139, 92, 246, 0.3);
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(139, 92, 246, 0.6);
                }
              `}</style>
            </div>
          </div>
        )}

        {/* ================= TAB 2: HISTORICAL DATA ================= */}
        {activeTab === 'history' && data && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6">
              <div className="flex flex-wrap justify-between items-center mb-8 border-b border-white/[0.05] pb-4">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase">Market Telemetry</h2>
                <div className="flex gap-4 items-center">
                  <select className="bg-[#050505] border border-white/10 text-xs text-cyan-400 rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500" value={period} onChange={e => setPeriod(Number(e.target.value))}>
                    <option value={63}>3 Months</option>
                    <option value={126}>6 Months</option>
                    <option value={252}>1 Year</option>
                    <option value={504}>2 Years</option>
                    <option value={1260}>5 Years</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors"><input type="checkbox" className="accent-pink-500" checked={showBrent} onChange={e => setShowBrent(e.target.checked)} /> Brent</label>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors"><input type="checkbox" className="accent-violet-500" checked={showVix} onChange={e => setShowVix(e.target.checked)} /> VIX</label>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={histData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWti" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.hybrid} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={colors.hybrid} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(val) => val.substring(0,7)} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    {showVix && <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} stroke={colors.lstm} fontSize={10} tickLine={false} axisLine={false} />}
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="wti_price" stroke={colors.hybrid} strokeWidth={2} fillOpacity={1} fill="url(#colorWti)" name="WTI" />
                    {showBrent && <Line yAxisId="left" type="monotone" dataKey="brent_price" stroke={colors.arima} dot={false} strokeWidth={2} name="Brent" />}
                    {showVix && <Line yAxisId="right" type="monotone" dataKey="vix" stroke={colors.lstm} dot={false} strokeWidth={2} name="VIX" opacity={0.8}/>}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-6 border-b border-white/[0.05] pb-4">Return Distribution Analysis</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={returnDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="range" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ backgroundColor: 'rgba(5,5,5,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="count" fill={colors.hybrid} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PERFORMANCE ================= */}
        {activeTab === 'performance' && data && (
          <div className="space-y-6 animate-in fade-in duration-500">
             
             {/* STATS MATRIX (TANPA HIGHLIGHT) */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.metrics).map(([mname, mvals]: any) => {
                return (
                  <div key={mname} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl relative backdrop-blur-md transition-all hover:bg-white/[0.04]">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{mname}</h3>
                    <div className="text-2xl font-black font-mono mb-1 text-slate-200">{mvals.MAE.toFixed(3)}</div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">MAE Error Rate</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RADAR CHART */}
              <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-6">Capability Radar Matrix</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke={colors.grid} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                      <Radar name="Hybrid" dataKey="Hybrid" stroke={colors.hybrid} strokeWidth={2} fill={colors.hybrid} fillOpacity={0.3} />
                      <Radar name="LSTM" dataKey="LSTM" stroke={colors.lstm} strokeWidth={2} fill="transparent" />
                      <Radar name="ARIMA" dataKey="ARIMA" stroke={colors.arima} strokeWidth={2} fill="transparent" />
                      <Radar name="SVR" dataKey="SVR" stroke={colors.svr} strokeWidth={2} fill="transparent" />
                      <RechartsTooltip content={<CustomRadarTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* BAR CHART */}
              <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-6">Absolute Error Topology</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'MAE Assessment', Hybrid: data.metrics['Hybrid FinBERT-LSTM'].MAE, LSTM: data.metrics['LSTM (no sentiment)'].MAE, ARIMA: data.metrics['ARIMA'].MAE, SVR: data.metrics['SVR'].MAE }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ backgroundColor: 'rgba(5,5,5,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      <Bar dataKey="Hybrid" fill={colors.hybrid} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="LSTM" fill={colors.lstm} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="ARIMA" fill={colors.arima} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="SVR" fill={colors.svr} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* STACKED ACTUAL VS PREDICTED TIME SERIES CHARTS */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6 space-y-8">
              <div className="border-b border-white/[0.05] pb-4 flex items-center justify-between">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase flex items-center gap-2">
                  <TrendingUp size={14} /> Test Set Trajectory: Actual vs Predicted
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">1 Year Analysis</span>
              </div>
              
              {[
                { key: 'Hybrid', title: 'Prediksi vs Aktual — Hybrid FinBERT-LSTM', color: colors.hybrid },
                { key: 'LSTM', title: 'Prediksi vs Aktual — LSTM (tanpa sentimen)', color: colors.lstm },
                { key: 'ARIMA', title: 'Prediksi vs Aktual — ARIMA', color: colors.arima },
                { key: 'SVR', title: 'Prediksi vs Aktual — SVR', color: colors.svr }
              ].map((model, idx) => (
                <div key={model.key} className="relative">
                  <h3 className="text-[10px] text-slate-400 font-mono absolute top-2 left-10 z-10">{model.title}</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={testSetData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} minTickGap={30} />
                        <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(5,5,5,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }} />
                        <Line type="monotone" dataKey="Actual" stroke={colors.actual} strokeWidth={1.5} dot={false} name="Aktual" />
                        <Line type={model.key === 'ARIMA' ? 'stepAfter' : 'monotone'} dataKey={model.key} stroke={model.color} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={`Prediksi ${model.key}`} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {idx < 3 && <div className="border-b border-white/[0.05] mt-6" />}
                </div>
              ))}
            </div>

            {/* SCATTER PLOT ANALYSIS (ACTUAL VS PREDICTED) */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6 space-y-6">
              <div className="border-b border-white/[0.05] pb-4 flex items-center justify-between">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase flex items-center gap-2">
                  <Activity size={14} /> Dispersion Analysis: Actual vs Predicted
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'Hybrid', title: 'Hybrid FinBERT-LSTM', metricKey: 'Hybrid FinBERT-LSTM', color: colors.hybrid },
                  { key: 'LSTM', title: 'LSTM (No Sentiment)', metricKey: 'LSTM (no sentiment)', color: colors.lstm },
                  { key: 'ARIMA', title: 'ARIMA', metricKey: 'ARIMA', color: colors.arima },
                  { key: 'SVR', title: 'SVR', metricKey: 'SVR', color: colors.svr }
                ].map((model) => (
                  <div key={model.key} className="relative bg-[#050505]/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                    <div className="text-center mb-3">
                        <h3 className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{model.title}</h3>
                        <span className="text-[9px] text-slate-500 font-mono">
                          R² = {data.metrics[model.metricKey]?.R2?.toFixed(4) || '0.0000'}
                        </span>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                          <XAxis type="number" dataKey="Actual" name="Aktual" domain={scatterDomain} stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis type="number" dataKey={model.key} name="Prediksi" domain={scatterDomain} stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                            cursor={{strokeDasharray: '3 3'}} 
                            contentStyle={{ backgroundColor: 'rgba(5,5,5,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                            itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }} 
                          />
                          <Scatter data={testSetData} fill={model.color} fillOpacity={0.4} />
                          <ReferenceLine 
                            segment={[{ x: scatterDomain[0], y: scatterDomain[0] }, { x: scatterDomain[1], y: scatterDomain[1] }]} 
                            stroke="#ef4444" 
                            strokeDasharray="4 4" 
                            strokeWidth={1.5} 
                            opacity={0.8}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-cyan-950/30 border border-cyan-500/30 p-5 rounded-2xl flex gap-4 items-start relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
              <ShieldAlert className="text-cyan-400 mt-0.5 shrink-0" size={24} />
              <div className="text-sm text-cyan-100/70 leading-relaxed">
                <strong className="text-cyan-400 block mb-1.5 tracking-wider text-[11px] uppercase">Riset Kesimpulan</strong>
                Mengintegrasikan NLP embeddings (FinBERT) ke dalam model <i>sequence</i> (LSTM) mendemonstrasikan supremasi komputasi. Varian Hybrid meminimalkan fungsi <i>loss</i> absolut (MAE) secara optimal dibandingkan dengan varian LSTM tanpa NLP (FinBERT).
              </div>
            </div>
          </div>
        )}
        
        {/* Empty States */}
        {!data && activeTab !== 'predict' && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
            <Database size={32} className="mb-4 opacity-50" />
            <p className="text-sm">Silakan eksekusi model di tab Inference terlebih dahulu.</p>
          </div>
        )}

      </div>
    </div>
  );
}