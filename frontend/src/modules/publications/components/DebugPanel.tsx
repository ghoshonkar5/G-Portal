import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ConnectionStatus {
  isConnected: boolean;
  error?: string;
  details?: any;
}

export function DebugPanel() {
  const [systemStatus] = useState({
    mode: 'demo',
    status: 'fully_functional',
    message: 'All features operational without backend deployment',
    credentials: 'Faculty ID: 123456 or 123457, Password: password123',
    features: [
      'Authentication & Profile Management',
      'Publications Management', 
      'Conferences Tracking',
      'Books & Book Chapters',
      'Academic Statistics',
      'Search & Export Functions'
    ]
  });

  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-[#101A24]">
          <AlertCircle className="w-5 h-5" />
          <span>Backend Connection Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>System Status:</span>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-600">Fully Operational</span>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <strong>Mode:</strong> Demo Mode - {systemStatus.message}
        </div>

        <div className="bg-[#E5DDC6]/30 border border-[#E5DDC6] px-4 py-3 rounded-lg">
          <strong>Available Features:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            {systemStatus.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={refreshStatus}
            disabled={isLoading}
            className="w-full bg-[#101A24] hover:bg-[#16222E] text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh Status'}
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Demo Credentials:</strong></p>
          <div className="bg-gray-100 p-2 rounded">
            <p>Faculty ID: <strong>123456</strong> (experienced user)</p>
            <p>Faculty ID: <strong>123457</strong> (first-time setup)</p>
            <p>Password: <strong>password123</strong></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}