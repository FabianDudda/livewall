'use client'

import { useState } from 'react'
import { TemplateConfig, FONTS, COLOR_SCHEMES } from '@/lib/templateGenerator'

interface CustomizationPanelProps {
  config: TemplateConfig
  onConfigChange: (updates: Partial<TemplateConfig>) => void
  isLoading?: boolean
}

const COLOR_SCHEME_INFO = {
  blue: { name: 'Ocean Blue', emoji: '🌊' },
  green: { name: 'Forest Green', emoji: '🌲' },
  purple: { name: 'Royal Purple', emoji: '👑' },
  orange: { name: 'Sunset Orange', emoji: '🌅' },
  red: { name: 'Cherry Red', emoji: '🍒' },
  teal: { name: 'Tropical Teal', emoji: '🏝️' },
  indigo: { name: 'Deep Indigo', emoji: '🌌' }
} as const

export default function CustomizationPanel({
  config,
  onConfigChange,
  isLoading = false
}: CustomizationPanelProps) {
  const [activeSection, setActiveSection] = useState<'content' | 'colors' | 'style'>('content')

  const ColorSchemeSelector = () => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Color Scheme
      </label>
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(COLOR_SCHEME_INFO).map(([key, info]) => {
          const scheme = COLOR_SCHEMES[key as keyof typeof COLOR_SCHEMES]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onConfigChange({ colorScheme: key as any })}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                config.colorScheme === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: scheme.primary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: scheme.background }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: scheme.text }}
                  />
                </div>
                <span className="text-sm">{info.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{info.name}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  const sections = [
    { key: 'content', label: 'Content', icon: '📝' },
    { key: 'style', label: 'Style', icon: '✨' }
  ] as const

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Customize Template</h2>
        <p className="text-sm text-gray-600 mt-1">
          Adjust your template settings
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-gray-200">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === section.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            disabled={isLoading}
          >
            <span className="mr-1">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeSection === 'content' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heading
              </label>
              <textarea
                value={config.eventName}
                onChange={(e) => onConfigChange({ eventName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Enter heading (press Enter for line breaks)"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message
              </label>
              <textarea
                value={config.customMessage}
                onChange={(e) => onConfigChange({ customMessage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Optional custom message (press Enter for line breaks)"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                value={config.instructions}
                onChange={(e) => onConfigChange({ instructions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Scan to upload your photos and videos"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer
              </label>
              <input
                type="text"
                value={config.footer}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                disabled={true}
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Can only be changed in deluxe version</p>
            </div>
          </>
        )}


        {activeSection === 'style' && (
          <>
            <ColorSchemeSelector />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Family
              </label>
              <select
                value={config.font}
                onChange={(e) => onConfigChange({ font: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {Object.keys(FONTS).map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR Code Size
              </label>
              <div className="space-y-2">
                {[
                  { value: 'small', label: 'Small', desc: 'Compact size' },
                  { value: 'medium', label: 'Medium', desc: 'Balanced size' },
                  { value: 'large', label: 'Large', desc: 'Maximum visibility' }
                ].map((option) => (
                  <label key={option.value} className="flex items-start">
                    <input
                      type="radio"
                      name="qrCodeSize"
                      value={option.value}
                      checked={config.qrCodeSize === option.value}
                      onChange={(e) => onConfigChange({ 
                        qrCodeSize: e.target.value as 'small' | 'medium' | 'large'
                      })}
                      className="mr-2 mt-1"
                      disabled={isLoading}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        {option.label}
                      </span>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}