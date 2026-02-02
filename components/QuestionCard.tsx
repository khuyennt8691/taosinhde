
import React, { useState } from 'react';
import { Question } from '../types';
import MathRenderer from './MathRenderer';

interface QuestionCardProps {
  question: Question;
  showSolutionDefault?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, showSolutionDefault = false }) => {
  const [showSolution, setShowSolution] = useState(showSolutionDefault);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-bold text-primary bg-blue-50 px-3 py-1 rounded-full">
          Câu {question.order}
        </span>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {question.level} - {question.topic}
        </span>
      </div>
      
      <div className="mb-6 text-slate-800 leading-relaxed font-medium">
        <MathRenderer content={question.content} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(question.options).map(([key, value]) => (
          <div 
            key={key} 
            className={`flex items-start p-3 rounded-lg border transition-colors ${
              showSolution && question.answer === key 
              ? 'border-green-500 bg-green-50' 
              : 'border-slate-200 hover:border-primary'
            }`}
          >
            <span className="font-bold mr-3">{key}.</span>
            <MathRenderer content={value} />
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
        <button 
          onClick={() => setShowSolution(!showSolution)}
          className="text-sm text-primary font-semibold hover:underline flex items-center gap-2"
        >
          {showSolution ? 'Ẩn lời giải' : 'Xem lời giải chi tiết & đáp án'}
        </button>
        
        {showSolution && (
          <div className="mt-2 bg-slate-50 p-4 rounded-lg border-l-4 border-primary">
            <p className="font-bold text-slate-700 mb-2">Đáp án: {question.answer}</p>
            <div className="text-slate-600 italic">
              <MathRenderer content={question.solution} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
