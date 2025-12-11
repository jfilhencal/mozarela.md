import React, { useRef, useState } from 'react';
import { exportDatabase, importDatabase } from '../services/storageService';
import { Database, Download, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

const DatabaseControls: React.FC = () => {
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const json = await exportDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mozarela_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ type: 'success', text: 'Database exported successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to export database.' });
    }
  };

  const handleImportClick = () => {
    if (window.confirm('WARNING: Importing a database will PERMANENTLY REPLACE all current data. This cannot be undone. Are you sure?')) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importDatabase(text);
      setMessage({ type: 'success', text: 'Database restored successfully. Reloading...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setMessage({ type: 'error', text: 'Invalid backup file.' });
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-700">Database Management</h3>
      </div>
      
      <p className="text-sm text-slate-500 mb-4">
        Create a local backup file or restore from a previous backup. Useful for transferring data between devices.
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Backup Data
        </button>

        <button
          onClick={handleImportClick}
          className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          Restore Data
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={handleFileChange}
        />
      </div>

      {message && (
        <div className={`mt-3 text-sm flex items-center ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default DatabaseControls;