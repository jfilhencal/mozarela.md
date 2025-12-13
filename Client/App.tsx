import React, { useState, useEffect, useMemo } from 'react';
import InputSection from './components/InputSection';
import ResultsSection from './components/ResultsSection';
import CaseHistory from './components/CaseHistory';
import AuthScreen from './components/AuthScreen';
import AdUnit from './components/AdUnit';
import { CaseData, DiagnosisResponse, LoadingState, SavedCase, User } from './types';
import { analyzeCase } from './services/geminiService';
import { analyzeWithScoring } from './services/scoringService';
import { saveCase, updateUser } from './services/storageService';
import { checkSession, logoutUser } from './services/authService';
import { Activity, ShieldCheck, Info, Plus, History, LogOut, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [view, setView] = useState<'new' | 'history'>('new');
  const [results, setResults] = useState<DiagnosisResponse | null>(null);
  const [inputData, setInputData] = useState<CaseData | undefined>(undefined);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false, message: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for active session on mount
    const initSession = async () => {
      try {
        const user = await checkSession();
        setCurrentUser(user);
      } catch (e) {
        console.error('Session check failed', e);
      } finally {
        setAuthLoading(false);
      }
    };
    initSession();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setView('new');
    setResults(null);
    setInputData(undefined);
  };

  const defaultScoringFile = useMemo(() => {
    if (currentUser?.savedScoringConfig) {
      return new File(
        [currentUser.savedScoringConfig.content], 
        currentUser.savedScoringConfig.fileName, 
        { type: 'text/csv' }
      );
    }
    return undefined;
  }, [currentUser?.savedScoringConfig]);

  const handleCaseSubmit = async (data: CaseData) => {
    setLoading({ isLoading: true, message: 'Analyzing clinical signs and history...' });
    setError(null);
    setResults(null);
    
    // Scroll to top when submitting
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      let response: DiagnosisResponse;

      if (data.analysisMode === 'WEIGHTED') {
         setLoading({ isLoading: true, message: 'Parsing scoring matrix and calculating probabilities...' });
         
         // Persist scoring file if it differs from saved one
         if (data.scoringFile && currentUser) {
             const text = await data.scoringFile.text();
             // Simple check if we need to update
             if (text !== currentUser.savedScoringConfig?.content) {
                 const updatedUser = {
                     ...currentUser,
                     savedScoringConfig: {
                         fileName: data.scoringFile.name,
                         content: text
                     }
                 };
                 await updateUser(updatedUser);
                 setCurrentUser(updatedUser);
             }
         }

         response = await analyzeWithScoring(data);
      } else {
         // AI Mode
         // Simulate phases for better UX since analysis might take 3-5 seconds
         setTimeout(() => setLoading({ isLoading: true, message: 'Consulting database...' }), 1500);
         setTimeout(() => setLoading({ isLoading: true, message: 'Formulating differential diagnosis...' }), 3000);
         response = await analyzeCase(data);
      }

      setResults(response);

      // Auto-save the case to Database
      const newCase: SavedCase = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        userId: currentUser?.id, // Link to current user
        data: {
            patientName: data.patientName,
            species: data.species,
            breed: data.breed,
            age: data.age,
            weight: data.weight,
            clinicalSigns: data.clinicalSigns,
            labFindings: data.labFindings,
            attachments: data.attachments,
            analysisMode: data.analysisMode,
        },
        results: response
      };
      await saveCase(newCase);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate diagnosis. Please check your inputs.");
    } finally {
      setLoading({ isLoading: false, message: '' });
    }
  };

  const handleSelectCase = (savedCase: SavedCase) => {
    setInputData(savedCase.data);
    setResults(savedCase.results);
    setView('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchToNew = () => {
    setResults(null);
    setInputData(undefined);
    setView('new');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <img src="/logo.PNG" alt="Loading..." className="animate-bounce w-12 h-12 object-contain" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={switchToNew}>
              <img src="/logo.PNG" alt="Mozarela.MD" className="h-10 w-10 object-contain" />
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-slate-900">Mozarela.MD</span>
                <span className="text-[10px] uppercase tracking-wider text-medical-600 font-semibold">Clinical Assistant</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
               {/* User Badge (Desktop) */}
               <div className="hidden md:flex items-center text-xs text-slate-500 mr-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  <UserIcon className="w-3 h-3 mr-1.5" />
                  {currentUser.fullName}
                  {currentUser.clinicName && <span className="ml-1 font-semibold text-medical-600"> @ {currentUser.clinicName}</span>}
               </div>

               <button 
                 onClick={switchToNew}
                 className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'new' ? 'bg-medical-50 text-medical-700' : 'text-slate-600 hover:bg-slate-50'}`}
               >
                 <Plus className="w-4 h-4 mr-2" />
                 <span className="hidden sm:inline">New Case</span>
               </button>
               <button 
                 onClick={() => setView('history')}
                 className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'history' ? 'bg-medical-50 text-medical-700' : 'text-slate-600 hover:bg-slate-50'}`}
               >
                 <History className="w-4 h-4 mr-2" />
                 <span className="hidden sm:inline">History</span>
               </button>
               
               <div className="h-6 w-px bg-slate-200 mx-1"></div>

               <button 
                 onClick={handleLogout}
                 className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                 title="Sign Out"
               >
                 <LogOut className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {view === 'history' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <CaseHistory onSelectCase={handleSelectCase} />
          </div>
        ) : (
          <>
            {/* Header/Intro */}
            {!results && !loading.isLoading && !inputData && (
              <div className="text-center mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl mb-3">
                  Welcome back, {currentUser.fullName.split(' ')[0]}
                </h1>
                <p className="text-lg text-slate-600">
                  Dual-Engine Veterinary Diagnosis: Advanced AI Inference & Weighted Protocol Scoring.
                </p>
              </div>
            )}

            {/* Disclaimer Banner */}
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Professional Use Only:</strong> This tool assists in clinical decision-making. It is not a replacement for professional veterinary judgment, diagnostic testing, or physical examination. Always verify results.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Input Column */}
              <div className={`lg:col-span-5 transition-all duration-500 ${results ? 'order-2 lg:order-1' : 'lg:col-start-4 lg:col-span-6'}`}>
                <InputSection 
                  onSubmit={handleCaseSubmit} 
                  isLoading={loading.isLoading} 
                  initialData={inputData}
                  defaultScoringFile={defaultScoringFile}
                />
                
                {/* Loading Overlay/State */}
                {loading.isLoading && (
                  <div className="mt-4 text-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm animate-pulse">
                    <p className="text-medical-600 font-medium">{loading.message}</p>
                  </div>
                )}
                
                {error && (
                   <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                     <ShieldCheck className="w-5 h-5 mr-2" />
                     {error}
                   </div>
                )}

                {/* Ad Unit Below Input */}
                {!loading.isLoading && (
                  <div className="mt-6">
                    <AdUnit 
                      adSlot="1234567890"
                      adFormat="auto"
                      className="rounded-lg overflow-hidden"
                      style={{ minHeight: '100px' }}
                    />
                  </div>
                )}
              </div>

              {/* Results Column */}
              {results && (
                <div className="lg:col-span-7 order-1 lg:order-2">
                  <ResultsSection data={results} />
                  
                  {/* Ad Unit Below Results */}
                  <div className="mt-6">
                    <AdUnit 
                      adSlot="0987654321"
                      adFormat="auto"
                      className="rounded-lg overflow-hidden"
                      style={{ minHeight: '100px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default App;