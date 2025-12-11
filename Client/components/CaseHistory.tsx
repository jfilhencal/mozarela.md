import React, { useState, useEffect } from 'react';
import { SavedCase, Species } from '../types';
import { getCases, deleteCase } from '../services/storageService';
import { Search, Calendar, ChevronRight, Trash2, Filter, Database } from 'lucide-react';

interface CaseHistoryProps {
  onSelectCase: (savedCase: SavedCase) => void;
}

const CaseHistory: React.FC<CaseHistoryProps> = ({ onSelectCase }) => {
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState<string>('All');

  const loadCases = async () => {
    setIsLoading(true);
    const data = await getCases();
    setCases(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this case?")) {
      await deleteCase(id);
      await loadCases();
    }
  };

  const filteredCases = cases.filter(c => {
    // Guard against malformed case data which might not have a `data` property
    if (!c || !c.data) {
      return false;
    }

    const matchesSearch = 
      (c.data.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.data.clinicalSigns || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.data.breed && c.data.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.results?.diagnoses && Array.isArray(c.results.diagnoses) && c.results.diagnoses.some(d => d && d.name && d.name.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesSpecies = filterSpecies === 'All' || c.data.species === filterSpecies;

    return matchesSearch && matchesSpecies;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Case History
          </h2>
          <p className="text-slate-500 text-sm">Manage and review past patient diagnoses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search patient, breed, symptoms..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none text-sm"
          />
        </div>
        <div className="relative w-full md:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select 
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none text-sm appearance-none"
          >
            <option value="All">All Species</option>
            {Object.values(Species).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <svg className="animate-spin h-8 w-8 text-medical-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No cases found matching your criteria.</p>
          </div>
        ) : (
          filteredCases.map((c) => {
            // Extra safety check for rendering
            if (!c || !c.data) return null;
            
            return (
            <div 
              key={c.id} 
              onClick={() => onSelectCase(c)}
              className="group bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-medical-400 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
            >
              <div className="flex items-start gap-4">
                <div className="bg-medical-50 text-medical-700 font-bold rounded-lg w-12 h-12 flex items-center justify-center text-lg shrink-0">
                  {(c.data.patientName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800">{c.data.patientName || 'Unknown Patient'}</h3>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 flex items-center gap-1">
                      {c.data.species || 'Unknown'}
                      {c.data.breed && <span className="text-slate-400">• {c.data.breed}</span>}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1">
                    <span className="font-medium text-slate-700">Top Dx:</span> {c.results?.diagnoses?.[0]?.name || 'N/A'} {c.results?.diagnoses?.[0]?.probability && `(${c.results.diagnoses[0].probability}%)`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {c.data.clinicalSigns || 'No clinical signs recorded'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-6 pl-16 md:pl-0">
                <div className="flex items-center text-slate-400 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(c.timestamp)}
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleDelete(e, c.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Case"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-medical-500 transition-colors" />
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CaseHistory;