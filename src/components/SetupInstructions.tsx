import React from 'react';
import { AlertCircle, Database, Settings, CheckCircle } from 'lucide-react';

export const SetupInstructions: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">
              Simple File Transfer Setup
            </h3>
            <p className="text-sm sm:text-base text-blue-800 mb-3 sm:mb-4">
              This app uses a simple database-based approach for secure file transfers. No WebRTC complexity!
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-start space-x-3">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm sm:text-base">1. Connect to Supabase</h4>
                <p className="text-xs sm:text-sm text-blue-700">
                  Click "Connect to Supabase" in the top right to set up your database
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm sm:text-base">2. Database Tables</h4>
                <p className="text-xs sm:text-sm text-blue-700">
                  The required tables will be created automatically when you connect
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm sm:text-base">3. Start Sharing</h4>
                <p className="text-xs sm:text-sm text-blue-700">
                  Files are encrypted, chunked, and transferred through the database
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-100 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
            <h5 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">How it works:</h5>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Files are encrypted client-side before upload</li>
              <li>• Large files are split into chunks for reliable transfer</li>
              <li>• Recipients automatically download and decrypt files</li>
              <li>• All data is automatically cleaned up after transfer</li>
            </ul>
          </div>

          <div className="bg-amber-100 rounded-lg p-3 mt-3 sm:mt-4">
            <p className="text-xs text-amber-800">
              <strong>Demo Mode:</strong> Without Supabase, the app simulates transfers for testing the UI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};