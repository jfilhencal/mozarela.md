import React, { useState, useEffect } from 'react';
import { Species, CaseData, AnalysisMode } from '../types';
import { getTemplateCSV } from '../services/scoringService';
import { Upload, X, FileText, PawPrint, FileImage, BrainCircuit, Calculator, Download, FileSpreadsheet } from 'lucide-react';

interface InputSectionProps {
  onSubmit: (data: CaseData) => void;
  isLoading: boolean;
  initialData?: CaseData;
  defaultScoringFile?: File;
}

const InputSection: React.FC<InputSectionProps> = ({ onSubmit, isLoading, initialData, defaultScoringFile }) => {
  const [patientName, setPatientName] = useState('');
  const [species, setSpecies] = useState<Species>(Species.DOG);
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [clinicalSigns, setClinicalSigns] = useState('');
  const [labFindings, setLabFindings] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('AI');
  const [scoringFile, setScoringFile] = useState<File | undefined>(undefined);

  // Reset or fill form when initialData changes
  useEffect(() => {
    if (initialData) {
      setPatientName(initialData.patientName || '');
      setSpecies(initialData.species || Species.DOG);
      setBreed(initialData.breed || '');
      setAge(initialData.age || '');
      setWeight(initialData.weight || '');
      setClinicalSigns(initialData.clinicalSigns || '');
      setLabFindings(initialData.labFindings || '');
      setAttachments(initialData.attachments || []);
      setAnalysisMode(initialData.analysisMode || 'AI');
      setScoringFile(initialData.scoringFile);
    } else {
      // Reset form if no initial data provided (New Case)
      setPatientName('');
      setSpecies(Species.DOG);
      setBreed('');
      setAge('');
      setWeight('');
      setClinicalSigns('');
      setLabFindings('');
      setAttachments([]);
      setAnalysisMode('AI');
      // If no initial data but we have a default scoring file (from user profile), use it
      setScoringFile(defaultScoringFile);
    }
  }, [initialData, defaultScoringFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const handleScoringFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScoringFile(e.target.files[0]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + getTemplateCSV();
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mozarela_scoring_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analysisMode === 'WEIGHTED' && !scoringFile) {
        alert("Please upload an Excel/CSV file for weighted scoring.");
        return;
    }
    onSubmit({
      patientName,
      species,
      breed,
      age,
      weight,
      clinicalSigns,
      labFindings,
      attachments,
      analysisMode,
      scoringFile
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-medical-50 px-6 py-4 border-b border-medical-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-medical-600" />
            <h2 className="text-lg font-semibold text-slate-800">
            {initialData ? 'Case Details' : 'New Patient Intake'}
            </h2>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Analysis Mode Selection */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-3">Analysis Engine</label>
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => setAnalysisMode('AI')}
                    className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                        analysisMode === 'AI' 
                        ? 'bg-medical-600 border-medical-600 text-white shadow-md' 
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <BrainCircuit className="w-5 h-5" />
                    <span>AI Inference</span>
                </button>
                <button
                    type="button"
                    onClick={() => setAnalysisMode('WEIGHTED')}
                    className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                        analysisMode === 'WEIGHTED' 
                        ? 'bg-teal-600 border-teal-600 text-white shadow-md' 
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <Calculator className="w-5 h-5" />
                    <span>Weighted Scoring</span>
                </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
                {analysisMode === 'AI' 
                    ? "Uses Gemini AI to analyze complex clinical patterns and unstructured data." 
                    : "Uses a deterministic scoring algorithm based on your uploaded Excel rules."}
            </p>
        </div>

        {/* Name and Species */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
             <input
               type="text"
               placeholder="e.g. Bella"
               value={patientName}
               onChange={(e) => setPatientName(e.target.value)}
               className="w-full rounded-lg border-slate-300 border px-3 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
               required
             />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Species</label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value as Species)}
              className="w-full rounded-lg border-slate-300 border px-3 py-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
            >
              {Object.values(Species).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Breed, Age, Weight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Breed</label>
             <input
               type="text"
               placeholder="e.g. Golden Retriever"
               value={breed}
               onChange={(e) => setBreed(e.target.value)}
               className="w-full rounded-lg border-slate-300 border px-3 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
             />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
            <input
              type="text"
              placeholder="e.g. 5y 3m"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-lg border-slate-300 border px-3 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Weight</label>
            <input
              type="text"
              placeholder="e.g. 25 kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-lg border-slate-300 border px-3 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Clinical Signs */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Signs & History</label>
          <textarea
            value={clinicalSigns}
            onChange={(e) => setClinicalSigns(e.target.value)}
            placeholder={analysisMode === 'WEIGHTED' ? "Ensure keywords match your Excel file (e.g., 'cough', 'fever')..." : "Describe symptoms, duration, history..."}
            className="w-full h-32 rounded-lg border-slate-300 border px-3 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all resize-none"
            required
          />
        </div>

        {/* Lab Findings Text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Lab Findings / Notes (Optional)</label>
          <textarea
            value={labFindings}
            onChange={(e) => setLabFindings(e.target.value)}
            placeholder="Paste text results from CBC, Biochem, or additional notes here..."
            className="w-full h-24 rounded-lg border-slate-300 border px-3 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all resize-none"
          />
        </div>

        {/* Attachments Section */}
        <div>
          {analysisMode === 'AI' ? (
            <>
                <label className="block text-sm font-medium text-slate-700 mb-2">Attachments (Lab Reports, X-Rays)</label>
                <div className="flex flex-wrap gap-4 items-center">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*,application/pdf" 
                        className="hidden" 
                        onChange={handleFileChange}
                    />
                    </label>
                    <span className="text-xs text-slate-500">Supported: JPG, PNG, PDF.</span>
                </div>
                
                {attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm border border-slate-200">
                        {file.type === 'application/pdf' ? (
                            <FileText className="w-3 h-3 mr-2 text-red-500" />
                        ) : (
                            <FileImage className="w-3 h-3 mr-2 text-blue-500" />
                        )}
                        <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                        <button 
                            type="button" 
                            onClick={() => removeAttachment(idx)}
                            className="ml-2 hover:text-red-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        </div>
                    ))}
                    </div>
                )}
            </>
          ) : (
             <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
                <label className="block text-sm font-medium text-teal-800 mb-2">Weighted Scoring Configuration</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                        type="button"
                        onClick={downloadTemplate}
                        className="flex items-center text-teal-700 text-sm hover:underline"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Download Template (.csv)
                    </button>
                    
                    <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-teal-300 rounded-lg shadow-sm text-sm font-medium text-teal-700 bg-white hover:bg-teal-50 transition-colors">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {scoringFile ? 'Change File' : 'Upload Filled CSV'}
                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            onChange={handleScoringFileChange}
                        />
                    </label>
                </div>
                {scoringFile && (
                    <div className="mt-2 flex items-center text-sm text-teal-700">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {scoringFile.name}
                        {defaultScoringFile && scoringFile.name === defaultScoringFile.name && (
                            <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full">Saved</span>
                        )}
                    </div>
                )}
             </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
              ${isLoading 
                ? 'bg-slate-400 cursor-not-allowed opacity-75' 
                : analysisMode === 'AI' 
                    ? 'bg-medical-600 hover:bg-medical-700 focus:ring-medical-500' 
                    : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500'
              } 
              transition-all focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {analysisMode === 'AI' ? 'Analyzing Case...' : 'Calculating Scores...'}
              </>
            ) : (
              analysisMode === 'AI' ? 'Run AI Diagnosis' : 'Run Weighted Analysis'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputSection;