'use client';
import { useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, Droplet, TrendingUp, TrendingDown, Info, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const [eventText, setEventText] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const API_URL = 'https://ikhwannt-wti-prediction-api.hf.space'; 

  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await axios.post(API_URL, { event_text: eventText });
      setData(response.data);
    } catch (error) {
      console.error("Error fetching predictions", error);
      alert("Failed to connect to the prediction API. Make sure the FastAPI server is running.");
    }
    setLoading(false);
  };

  const setExample = (text: string) => {
    setEventText(text);
  };

  // Persiapan data chart jika data tersedia
  const chartData = data ? [
    ...data.history.map((h: any) => ({ name: h.date.substring(5), Historical: h.price })),
    { name: 'Prediction', 
      Historical: null,
      'Hybrid FinBERT-LSTM': data.predictions['Hybrid FinBERT-LSTM'],
      'LSTM': data.predictions['LSTM (no sentiment)'],
      'ARIMA': data.predictions['ARIMA'],
      'SVR': data.predictions['SVR']
    }
  ] : [];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HERO HEADER */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-8 overflow-hidden shadow-2xl shadow-indigo-900/10">
          <div className="relative z-10">
            <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-3">Research Dashboard</p>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-100 mb-4 flex items-center gap-3">
              <Droplet className="text-orange-500 w-10 h-10" /> WTI Oil Price <span className="text-orange-500">Prediction</span>
            </h1>
            <p className="text-slate-400 max-w-2xl text-sm md:text-base mb-6">
              Comparing 4 forecasting models — FinBERT-LSTM hybrid, LSTM, ARIMA, and SVR — on daily WTI crude oil prices (2010–2026).
            </p>
            <div className="flex flex-wrap gap-2">
              {['FinBERT-LSTM', 'LSTM', 'ARIMA', 'SVR'].map(badge => (
                <span key={badge} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-full font-mono">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* INPUT SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-6">
            <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-3 flex justify-between items-center">
              <span>Geopolitical Event Input</span>
              {data && <span className="text-orange-400 font-mono">Latest WTI: ${data.last_price.toFixed(2)}</span>}
            </h2>
            <textarea
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-4 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none mb-4"
              rows={4}
              placeholder="e.g. OPEC agrees to cut oil production by 1 million barrels per day..."
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
            />
            <button 
              onClick={handlePredict} disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Running Models...' : 'Run All 4 Models'} <Activity size={18} />
            </button>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
            <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-3">
              Quick Examples
            </h2>
            <div className="space-y-2">
              {[
                "Russia cuts oil exports amid new sanctions",
                "OPEC+ increases production by 500k bpd",
                "US-Iran tensions escalate in Strait of Hormuz"
              ].map((ex, i) => (
                <button key={i} onClick={() => setExample(ex)}
                  className="w-full text-left p-3 text-sm bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg text-slate-300 transition-colors truncate"
                >
                  {ex}
                </button>
              ))}
            </div>
            
            {/* SENTIMENT BREAKDOWN (Tampil jika sudah predict) */}
            {data && data.sentiment && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h3 className="text-xs text-slate-500 mb-3 flex justify-between">
                  <span>FINBERT SENTIMENT</span>
                  {data.sentiment.positive > data.sentiment.negative ? '🟢 POSITIVE' : '🔴 NEGATIVE'}
                </h3>
                <div className="w-full bg-slate-800 rounded-full h-2 flex overflow-hidden">
                  <div style={{ width: `${data.sentiment.positive * 100}%` }} className="bg-green-500"></div>
                  <div style={{ width: `${data.sentiment.negative * 100}%` }} className="bg-red-500"></div>
                  <div style={{ width: `${data.sentiment.neutral * 100}%` }} className="bg-slate-500"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS SECTION */}
        {data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Note Akademis */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex gap-3 text-sm text-slate-400">
              <Info className="text-indigo-400 shrink-0 mt-0.5" size={18} />
              <p>
                <strong className="text-indigo-400">Hybrid FinBERT-LSTM</strong> integrates geopolitical sentiment. 
                Other baselines (<strong className="text-slate-300">LSTM, ARIMA, SVR</strong>) use historical data only and are deterministic.
              </p>
            </div>

            {/* Model Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(data.predictions).map(([model, pred]: any) => {
                const isBest = model === 'Hybrid FinBERT-LSTM';
                const metrics = data.metrics[model];
                const delta = pred - data.last_price;
                const deltaPct = (delta / data.last_price) * 100;

                return (
                  <div key={model} className={`bg-[#111827] border ${isBest ? 'border-orange-500 bg-gradient-to-br from-[#111827] to-[#1c1009]' : 'border-slate-800'} rounded-xl p-5 relative transition-all hover:border-slate-600`}>
                    {isBest && (
                      <span className="absolute -top-3 right-4 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        ★ Best
                      </span>
                    )}
                    <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${isBest ? 'text-orange-400' : 'text-slate-400'}`}>{model}</h3>
                    
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-mono font-bold text-white">${pred.toFixed(2)}</span>
                      <span className="text-slate-500 text-sm">/bbl</span>
                    </div>

                    <div className={`text-xs font-medium flex items-center gap-1 mb-4 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {Math.abs(delta).toFixed(2)} ({deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-800 pt-3">
                      <div>
                        <div className="text-slate-200 font-mono text-sm">{metrics.MAE.toFixed(3)}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">MAE</div>
                      </div>
                      <div>
                        <div className="text-slate-200 font-mono text-sm">{metrics.R2.toFixed(3)}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">R²</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CHART */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
              <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-6 flex items-center gap-2">
                <BarChart3 size={16} /> 30-Day History + Predictions
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickMargin={10} />
                    <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <ReferenceLine y={data.last_price} stroke="#334155" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Last Price', fill: '#64748b', fontSize: 10 }} />
                    <Line type="monotone" dataKey="Historical" stroke="#64748b" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Hybrid FinBERT-LSTM" stroke="#6366f1" strokeWidth={2} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="LSTM" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="ARIMA" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="SVR" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}