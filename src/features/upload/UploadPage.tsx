import React from 'react';

export default function UploadPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full bg-surface border border-border rounded-lg p-8 text-center shadow-lg">
        <h2 className="text-2xl font-display font-bold text-white mb-2">Upload Floor Plan</h2>
        <p className="text-text-secondary text-sm mb-6">Create the floor map. Supported formats: PNG, JPG, PDF, SVG (max 20MB)</p>
        
        <div className="border-2 border-dashed border-border hover:border-accent/50 rounded-lg p-12 transition-all cursor-pointer flex flex-col items-center justify-center bg-bg/50">
          <span className="text-4xl mb-4">📁</span>
          <span className="text-sm text-text-primary font-medium">Drag & drop files here, or click to browse</span>
          <span className="text-xs text-text-secondary mt-1">PNG, JPG, PDF, SVG up to 20MB</span>
        </div>
        
        <button className="mt-6 bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-md text-sm font-semibold transition-all shadow-md shadow-accent/20">
          Select File
        </button>
      </div>
    </div>
  );
}
