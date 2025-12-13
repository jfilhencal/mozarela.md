import React from 'react';
import { DiagnosisResponse } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown, ChevronUp, AlertCircle, Stethoscope, Activity, FileText } from 'lucide-react';

interface ResultsSectionProps {
  data: DiagnosisResponse;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ data }) => {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(0);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Guard against undefined data
  if (!data || !data.diagnoses || !Array.isArray(data.diagnoses)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Invalid diagnosis data received.
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.diagnoses.map(d => ({
    name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
    fullName: d.name,
    probability: d.probability
  })).slice(0, 5); // Top 5 for chart

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Summary Card - Chat Style */}
      <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
        <img src="/logo.PNG" alt="Mozarela.MD" className="w-12 h-12 flex-shrink-0 object-contain" />
        <div className="bg-medical-600 text-white rounded-2xl rounded-tl-sm p-4 shadow-md max-w-3xl">
          <p className="text-sm font-medium mb-1 opacity-90">Clinical Summary</p>
          <p className="leading-relaxed">
            {data.summary}
          </p>
        </div>
      </div>

      {/* Probability Chart - Chat Style */}
      <div className="flex gap-3 items-start">
        <img src="/logo.PNG" alt="Mozarela.MD" className="w-12 h-12 flex-shrink-0 object-contain" />
        <div className="bg-white rounded-2xl rounded-tl-sm shadow-md border border-slate-200 p-6 max-w-3xl flex-1">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Probability Distribution (Top 5)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f1f5f9'}}
                  formatter={(value: number) => [`${value}%`, 'Probability']}
                />
                <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed List - Chat Style */}
      <div className="flex gap-3 items-start">
        <img src="/logo.PNG" alt="Mozarela.MD" className="w-12 h-12 flex-shrink-0 object-contain" />
        <div className="space-y-4 flex-1 max-w-3xl">
        <h3 className="text-xl font-bold text-slate-800 flex items-center">
          <Stethoscope className="w-6 h-6 mr-2 text-medical-600" />
          Differential Diagnoses
        </h3>
        
        {data.diagnoses.map((diagnosis, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden
              ${expandedIndex === index ? 'border-medical-500 ring-1 ring-medical-500' : 'border-slate-200 hover:border-medical-300'}
            `}
          >
            <button
              onClick={() => toggleExpand(index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
            >
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-lg
                  ${index === 0 ? 'bg-medical-500' : 
                    diagnosis.probability > 50 ? 'bg-medical-400' : 'bg-slate-400'}
                `}>
                  {diagnosis.probability}%
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-800">{diagnosis.name}</h4>
                  <p className="text-sm text-slate-500">
                    {expandedIndex !== index && (
                      <span className="line-clamp-1">{diagnosis.reasoning}</span>
                    )}
                  </p>
                </div>
              </div>
              {expandedIndex === index ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
            </button>

            {expandedIndex === index && (
              <div className="px-6 pb-6 bg-slate-50/50 border-t border-slate-100">
                <div className="mt-4 space-y-4">
                  
                  {/* Reasoning */}
                  <div>
                    <h5 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">Reasoning</h5>
                    <p className="text-slate-600">{diagnosis.reasoning}</p>
                  </div>

                  {/* Two Column Grid for Tests & Treatment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <h5 className="text-sm font-semibold text-indigo-600 flex items-center mb-2">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Suggested Diagnostics
                      </h5>
                      <ul className="list-disc list-inside space-y-1">
                        {diagnosis.suggested_tests.map((test, i) => (
                          <li key={i} className="text-sm text-slate-600">{test}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <h5 className="text-sm font-semibold text-teal-600 flex items-center mb-2">
                        <FileText className="w-4 h-4 mr-2" />
                        Treatment Plan
                      </h5>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {diagnosis.treatment_plan}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsSection;