'use client';
import { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Area, AreaChart 
} from 'recharts';
import { Activity, Droplet, TrendingUp, TrendingDown, Info, BarChart3, Database, ShieldAlert, Cpu } from 'lucide-react';

export default function Dashboard() {
  const [eventText, setEventText] = useState('');
  const [refDate, setRefDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('predict');
  
  // History Tab State
  const [period, setPeriod] = useState(252); // Default 1Y (252 hari kerja)
  const [showBrent, setShowBrent] = useState(true);
  const [showVix, setShowVix] = useState(false);

  // GANTI DENGAN URL HUGGING FACE ANDA
  const API_URL = 'https://ikhwannt-wti-prediction-api.hf.space/api/predict';

  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await axios.post(API_URL, { event_text: eventText });
      setData(response.data);
      if(!refDate) setRefDate(response.data.last_date);
    } catch (error) {
      console.error("Error fetching predictions", error);
      alert("Gagal menghubungi API.");
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
    // Membuat binning manual untuk histogram return (simulasi)
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

  const radarData = useMemo(() => {
    if(!data) return [];
    const metrics = data.metrics;
    return [
      { subject: 'MAE (inv)', Hybrid: 1-(metrics['Hybrid FinBERT-LSTM'].MAE/5), LSTM: 1-(metrics['LSTM (no sentiment)'].MAE/5), ARIMA: 1-(metrics['ARIMA'].MAE/5), SVR: 1-(metrics['SVR'].MAE/5) },
      { subject: 'RMSE (inv)', Hybrid: 1-(metrics['Hybrid FinBERT-LSTM'].RMSE/5), LSTM: 1-(metrics['LSTM (no sentiment)'].RMSE/5), ARIMA: 1-(metrics['ARIMA'].RMSE/5), SVR: 1-(metrics['SVR'].RMSE/5) },
      { subject: 'MAPE (inv)', Hybrid: 1-(metrics['Hybrid FinBERT-LSTM'].MAPE/10), LSTM: 1-(metrics['LSTM (no sentiment)'].MAPE/10), ARIMA: 1-(metrics['ARIMA'].MAPE/10), SVR: 1-(metrics['SVR'].MAPE/10) },
      { subject: 'R²', Hybrid: metrics['Hybrid FinBERT-LSTM'].R2, LSTM: metrics['LSTM (no sentiment)'].R2, ARIMA: metrics['ARIMA'].R2, SVR: metrics['SVR'].R2 },
    ];
  }, [data]);

  const barData = useMemo(() => {
    if(!data) return [];
    return ['MAE', 'RMSE', 'MAPE', 'R2'].map(metric => ({
      name: metric,
      Hybrid: data.metrics['Hybrid FinBERT-LSTM'][metric],
      LSTM: data.metrics['LSTM (no sentiment)'][metric],
      ARIMA: data.metrics['ARIMA'][metric],
      SVR: data.metrics['SVR'][metric]
    }));
  }, [data]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HERO HEADER */}
        <div className="relative bg-gradient-to-br from-slate-900 to-[#1e1b4b] border border-slate-800 rounded-2xl p-8 overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-2">Research Dashboard</p>
            <h1 className="text-4xl font-bold text-slate-100 mb-2 flex items-center gap-3">
              <Droplet className="text-orange-500" /> WTI Oil Price <span className="text-orange-500">Prediction</span>
            </h1>
            <p className="text-slate-400 max-w-2xl text-sm">
              Comparing 4 forecasting models — FinBERT-LSTM hybrid, LSTM, ARIMA, and SVR — on daily WTI crude oil prices (2010–2026).
            </p>
            <div className="flex gap-2 mt-4">
              {['FinBERT-LSTM', 'LSTM', 'ARIMA', 'SVR', 'Lookback · 30 days'].map(b => (
                <span key={b} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-full font-mono">{b}</span>
              ))}
            </div>
          </div>
        </div>

        {/* STAT ROW */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111827] border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold font-mono text-white">${data.last_price.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Latest WTI · {data.last_date}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold font-mono text-white">${(histData.reduce((acc:any, d:any) => acc + d.wti_price, 0) / histData.length || 0).toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Period Average</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold font-mono text-white">${Math.max(...histData.map((d:any) => d.wti_price)).toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Period High</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold font-mono text-white">{data.history.length.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Total Trading Days</div>
            </div>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-800 pt-4">
          {[
            { id: 'predict', icon: <Cpu size={16}/>, label: 'Predict & Compare' },
            { id: 'history', icon: <Database size={16}/>, label: 'Historical Data' },
            { id: 'performance', icon: <BarChart3 size={16}/>, label: 'Model Performance' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-indigo-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ================= TAB 1: PREDICT ================= */}
        {activeTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-6">
              <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-3">Fase Deployment — Prototipe Sistem</h2>
              <div className="space-y-4">
                <textarea
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-4 text-slate-200 focus:border-indigo-500 outline-none"
                  rows={3}
                  placeholder="Deskripsi peristiwa geopolitik (e.g. Russia cuts oil exports...)"
                  value={eventText}
                  onChange={(e) => setEventText(e.target.value)}
                />
                <button onClick={handlePredict} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 flex justify-center gap-2">
                  {loading ? 'Menjalankan Inferensi...' : 'Jalankan Inferensi →'} <Activity size={18} />
                </button>
              </div>

              {/* TERMINAL UI REPORT */}
              {data && (
                <div className="mt-8 bg-[#0a0e1a] border border-slate-800 rounded-lg p-6 font-mono text-sm leading-relaxed">
                  <div className="text-indigo-500 font-bold mb-4">════════════════════════════════════════════════════════════<br/>LAPORAN PREDIKSI HARGA WTI<br/>════════════════════════════════════════════════════════════</div>
                  <div className="grid grid-cols-[130px_1fr] gap-2 mb-4">
                    <span className="text-slate-500">Tanggal Ref</span> <span className="text-slate-100">: {data.last_date}</span>
                    <span className="text-slate-500">Peristiwa</span> <span className="text-slate-100">: {eventText || '(Tidak ada)'}</span>
                    <span className="text-slate-500">Sentimen</span> 
                    <span>: {data.sentiment.positive > data.sentiment.negative ? '🟢 POSITIVE' : data.sentiment.negative > data.sentiment.positive ? '🔴 NEGATIVE' : '🟡 NEUTRAL'}</span>
                  </div>
                  <div className="pl-[130px] mb-6 text-slate-400 text-xs space-y-1">
                    <div>Positive : {data.sentiment.positive.toFixed(4)}</div>
                    <div>Negative : {data.sentiment.negative.toFixed(4)}</div>
                    <div>Neutral  : {data.sentiment.neutral.toFixed(4)}</div>
                  </div>
                  <div className="text-lg mb-4">
                    <span className="text-slate-500">{'>'} Prediksi (H+1): </span>
                    <span className="text-green-400 font-bold">USD {data.predictions['Hybrid FinBERT-LSTM'].toFixed(2)} / barel</span>
                  </div>
                  <div className="text-indigo-500 font-bold mt-4">════════════════════════════════════════════════════════════</div>
                </div>
              )}
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
              <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-3">Contoh Peristiwa</h2>
              <div className="space-y-2">
                {["Russia cuts oil exports by 10%", "OPEC announces production cuts", "US-Iran tensions escalate in Strait of Hormuz"].map((ex, i) => (
                  <button key={i} onClick={() => setEventText(ex)} className="w-full text-left p-3 text-xs bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg text-slate-300 transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: HISTORICAL DATA ================= */}
        {activeTab === 'history' && data && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
              <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase">WTI Price History</h2>
                <div className="flex gap-4">
                  <select className="bg-slate-900 border border-slate-700 text-xs rounded px-3 py-1" value={period} onChange={e => setPeriod(Number(e.target.value))}>
                    <option value={63}>3 Months</option>
                    <option value={126}>6 Months</option>
                    <option value={252}>1 Year</option>
                    <option value={504}>2 Years</option>
                    <option value={1260}>5 Years</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={showBrent} onChange={e => setShowBrent(e.target.checked)} /> Brent</label>
                  <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={showVix} onChange={e => setShowVix(e.target.checked)} /> VIX</label>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={histData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWti" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.substring(0,7)} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
                    {showVix && <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} stroke="#22d3ee" fontSize={10} />}
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="wti_price" stroke="#6366f1" fillOpacity={1} fill="url(#colorWti)" name="WTI" />
                    {showBrent && <Line yAxisId="left" type="monotone" dataKey="brent_price" stroke="#f97316" dot={false} strokeWidth={1.5} name="Brent" />}
                    {showVix && <Line yAxisId="right" type="monotone" dataKey="vix" stroke="#22d3ee" dot={false} strokeWidth={1} name="VIX" opacity={0.6}/>}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
              <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-6 border-b border-slate-800 pb-4">Daily Return Distribution</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={returnDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="range" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <RechartsTooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {!data && activeTab === 'history' && <div className="text-slate-500 text-center py-10">Silakan jalankan inferensi di Tab Predict terlebih dahulu untuk memuat data.</div>}

        {/* ================= TAB 3: PERFORMANCE ================= */}
        {activeTab === 'performance' && data && (
          <div className="space-y-6 animate-in fade-in">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.metrics).map(([mname, mvals]: any) => (
                <div key={mname} className={`bg-[#111827] border ${mname === 'Hybrid FinBERT-LSTM' ? 'border-orange-500' : 'border-slate-800'} p-4 rounded-xl relative`}>
                  {mname === 'Hybrid FinBERT-LSTM' && <span className="absolute -top-2 right-3 bg-orange-500 text-white text-[9px] px-2 rounded-full font-bold">★ BEST</span>}
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{mname}</h3>
                  <div className="text-xl font-bold font-mono text-white mb-1">MAE {mvals.MAE.toFixed(3)}</div>
                  <div className="text-sm font-mono text-slate-400">R² {mvals.R2.toFixed(3)}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
                <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-6">Model Capability Radar</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                      <Radar name="Hybrid" dataKey="Hybrid" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      <Radar name="LSTM" dataKey="LSTM" stroke="#f97316" fill="transparent" />
                      <Radar name="ARIMA" dataKey="ARIMA" stroke="#22d3ee" fill="transparent" />
                      <Radar name="SVR" dataKey="SVR" stroke="#a78bfa" fill="transparent" />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
                <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-6">Error Comparison (MAE)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Mean Absolute Error', Hybrid: data.metrics['Hybrid FinBERT-LSTM'].MAE, LSTM: data.metrics['LSTM (no sentiment)'].MAE, ARIMA: data.metrics['ARIMA'].MAE, SVR: data.metrics['SVR'].MAE }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <RechartsTooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Bar dataKey="Hybrid" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="LSTM" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ARIMA" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="SVR" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg flex gap-3 items-start">
              <ShieldAlert className="text-green-400 mt-1" size={20} />
              <div className="text-sm text-green-200">
                <strong className="text-green-400 block mb-1">Kesimpulan Riset</strong>
                Mengintegrasikan sentimen geopolitik (FinBERT) ke dalam model sekuensial (LSTM) memberikan peningkatan akurasi yang terukur. Model Hybrid mencapai MAE terendah dan R² tertinggi pada *test set*, mengonfirmasi hipotesis penelitian ini.
              </div>
            </div>
          </div>
        )}
        {!data && activeTab === 'performance' && <div className="text-slate-500 text-center py-10">Silakan jalankan inferensi di Tab Predict terlebih dahulu untuk memuat metrik.</div>}

      </div>
    </div>
  );
}