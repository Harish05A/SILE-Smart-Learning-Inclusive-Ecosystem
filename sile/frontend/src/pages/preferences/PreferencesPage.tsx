import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const PreferencesPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Learning & Accessibility Preferences</h1>
        <p className="text-slate-500 text-sm mt-1">Customize how educational content is delivered.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Learning Preferences</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Learning Style</label>
              <select className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white">
                <option value="multimodal">Multimodal (Balanced)</option>
                <option value="visual">Visual (Diagrams, charts)</option>
                <option value="auditory">Auditory (Voice narration)</option>
                <option value="reading_writing">Reading / Writing</option>
                <option value="kinesthetic">Kinesthetic (Interactive drills)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Learning Pace</label>
              <select className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white">
                <option value="relaxed">Relaxed (Self-paced, bite-sized)</option>
                <option value="moderate">Moderate (Standard progression)</option>
                <option value="intensive">Intensive (Fast-paced)</option>
              </select>
            </div>
            <Button size="sm">Save Learning Preferences</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Accessibility Adjustments</h2>
          <div className="space-y-4 text-sm">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>Enable Dyslexia-Friendly Typography</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>High Contrast Display Mode</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>Reduce Motion & Animations</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
              <span>Text-To-Speech (TTS) Screen Assistance</span>
            </label>
            <Button size="sm">Save Accessibility Preferences</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
