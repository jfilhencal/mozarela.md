import React from 'react';
import AdUnit from './AdUnit';
import { Activity, Brain, FileText, Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onShowAuth: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onShowAuth }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-medical-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <img src="/logo.PNG" alt="Mozarela.MD" className="h-32 w-32 object-contain" />
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-6">
            Mozarela<span className="text-medical-600">.MD</span>
          </h1>
          <p className="text-2xl text-slate-600 mb-4">
            AI-Powered Veterinary Differential Diagnosis
          </p>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Dual-engine clinical decision support combining advanced AI inference with evidence-based protocol scoring.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onShowAuth}
              className="bg-medical-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-medical-700 transition-colors flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onShowAuth}
              className="border-2 border-medical-600 text-medical-600 px-8 py-3 rounded-lg font-semibold hover:bg-medical-50 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Ad Unit */}
        <div className="mb-12 flex justify-center">
          <AdUnit 
            slot="auto"
            format="horizontal"
            className="max-w-4xl"
          />
        </div>

        {/* About Section */}
        <section className="mb-16" id="about">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Activity className="w-8 h-8 text-medical-600" />
              About Mozarela.MD
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Mozarela.MD is a cutting-edge clinical decision support system designed specifically for veterinary professionals. 
                  Our platform leverages the latest in artificial intelligence to assist veterinarians in creating accurate differential diagnoses.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Named after our beloved companion Mozarela, this system embodies our commitment to improving animal healthcare 
                  through technology while honoring the special bond between veterinarians and their patients.
                </p>
              </div>
              <div className="bg-medical-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Why Choose Mozarela.MD?</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-medical-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Dual-engine analysis for comprehensive results</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-medical-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Fast, accurate differential diagnoses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-medical-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Evidence-based treatment recommendations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-medical-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Complete case history management</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Ad Unit */}
        <div className="mb-12 flex justify-center">
          <AdUnit 
            slot="auto"
            format="rectangle"
          />
        </div>

        {/* Features Section */}
        <section id="features">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* AI Analysis */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-medical-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-medical-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">AI-Powered Analysis</h3>
              <p className="text-slate-600 leading-relaxed">
                Utilize Google's advanced Gemini AI models for intelligent differential diagnosis generation based on clinical signs, 
                patient signalment, and lab findings.
              </p>
            </div>

            {/* Protocol Scoring */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-medical-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-medical-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Weighted Protocol Scoring</h3>
              <p className="text-slate-600 leading-relaxed">
                Upload your clinic's diagnostic protocols as CSV files. Our weighted scoring system matches symptoms 
                to diagnoses based on your evidence-based guidelines.
              </p>
            </div>

            {/* Security */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-medical-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-medical-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Secure & Private</h3>
              <p className="text-slate-600 leading-relaxed">
                Enterprise-grade security with encrypted sessions, CSRF protection, and secure data storage. 
                Your patient data is protected at every step.
              </p>
            </div>

            {/* Case Management */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-medical-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-medical-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Case History</h3>
              <p className="text-slate-600 leading-relaxed">
                Track all your cases in one place. Search, filter, and review past diagnoses. 
                Export data for reporting or analysis whenever needed.
              </p>
            </div>

            {/* Fast Results */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-medical-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-medical-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Instant Results</h3>
              <p className="text-slate-600 leading-relaxed">
                Get comprehensive differential diagnoses in seconds. View probability distributions, 
                suggested tests, and treatment plans all in one interactive interface.
              </p>
            </div>

            {/* Multi-Engine */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-medical-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-medical-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Dual Analysis Modes</h3>
              <p className="text-slate-600 leading-relaxed">
                Choose between AI-powered analysis or custom protocol scoring. Each mode provides 
                unique insights to support your clinical decision-making.
              </p>
            </div>
          </div>
        </section>

        {/* Ad Unit */}
        <div className="my-12 flex justify-center">
          <AdUnit 
            slot="auto"
            format="horizontal"
          />
        </div>

        {/* CTA Section */}
        <section className="text-center py-16">
          <div className="bg-gradient-to-r from-medical-600 to-medical-700 rounded-2xl shadow-xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Practice?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join veterinary professionals using Mozarela.MD for smarter, faster diagnoses.
            </p>
            <button
              onClick={onShowAuth}
              className="bg-white text-medical-600 px-8 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
            >
              Get started, it's free! For now. <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">
            © 2025 Mozarela.MD - Veterinary Clinical Decision Support
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Powered by AI • Built with ❤️ for Animal Healthcare
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
