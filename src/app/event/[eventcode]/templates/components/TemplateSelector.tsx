'use client'

import { TemplateConfig } from '@/lib/templateGenerator'

interface TemplateSelectorProps {
  selectedTemplate: TemplateConfig['templateType']
  onTemplateSelect: (template: TemplateConfig['templateType']) => void
}

const TEMPLATE_OPTIONS = [
  {
    type: 'a5' as const,
    name: 'A5 Format',
    description: 'Perfect for handouts and distribution',
    icon: '📄',
    dimensions: '148×210mm',
    bestFor: 'High-quality printing'
  }
]

export default function TemplateSelector({ 
  selectedTemplate, 
  onTemplateSelect 
}: TemplateSelectorProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Template</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATE_OPTIONS.map((template) => (
          <button
            key={template.type}
            onClick={() => onTemplateSelect(template.type)}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md ${
              selectedTemplate === template.type
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{template.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm mb-1">
                  {template.name}
                </h3>
                <p className="text-xs text-gray-600 mb-2 leading-tight">
                  {template.description}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Size:</span> {template.dimensions}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Best for:</span> {template.bestFor}
                  </p>
                </div>
              </div>
            </div>
            
            {selectedTemplate === template.type && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg 
                    className="w-3 h-3 text-white" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}