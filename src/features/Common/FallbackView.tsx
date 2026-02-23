import React from 'react';

const FallbackView: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 text-center bg-white rounded-lg shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-gray-800">Módulo em Construção</h1>
        <p className="text-gray-600">Estamos trabalhando nesta funcionalidade.</p>
      </div>
    </div>
  );
};

export default FallbackView;
