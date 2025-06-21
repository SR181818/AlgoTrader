import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-6">
          <Search className="text-blue-400" size={32} />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-white mb-4">Page Not Found</h2>
        
        <p className="text-gray-300 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center">
          <Link 
            to="/"
            className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Home size={18} className="mr-2" />
            Go Home
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <ArrowLeft size={18} className="mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;