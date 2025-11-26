'use client';

import { useState, useEffect } from 'react';

export default function EmbedGenerator() {
  const [companyName, setCompanyName] = useState('');
  const [gaId, setGaId] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://yourdomain.com');
  const [generatedCode, setGeneratedCode] = useState<{
    script: string;
    iframe: string;
  } | null>(null);
  const EMBED_VERSION = "20241126";

  // Set base URL after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const defaultGaId = 'G-TZ8Y3WV5HP';

  const handleGenerate = () => {
    if (!companyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    const finalGaId = gaId.trim() || defaultGaId;
    const finalBaseUrl = baseUrl.trim() || 'https://yourdomain.com';
    const encodedCompany = encodeURIComponent(companyName.trim());
    const encodedGaId = encodeURIComponent(finalGaId);
    const encodedBaseUrl = encodeURIComponent(finalBaseUrl);

    // Generate Script Embed Code
    // Note: Always include gaId (either partner's or default) so tracking works
    const scriptCode = `<div id="recal-form-container"></div>
<script>
    window.RECAL_FORM_CONFIG = {
        baseUrl: '${finalBaseUrl}',
        gaId: '${finalGaId}',
        companyName: '${companyName.trim()}'
    };
</script>
<script src="${finalBaseUrl}/recal-form-embed.js?v=${EMBED_VERSION}"></script>`;

    // Generate Iframe Embed Code
    const iframeCode = `<iframe 
    src="${finalBaseUrl}/recal-form-embed.html?baseUrl=${encodedBaseUrl}&gaId=${encodedGaId}&company=${encodedCompany}&v=${EMBED_VERSION}" 
    width="100%" 
    height="400" 
    frameborder="0"
    style="border: none; max-width: 500px;">
</iframe>`;

    setGeneratedCode({ script: scriptCode, iframe: iframeCode });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy. Please select and copy manually.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
            Partner Embed Code Generator
          </h1>
          
          <p className="text-gray-600 mb-8">
            Generate unique embed codes for partners. The code will automatically include their company name and GA4 tracking ID.
          </p>

          <div className="space-y-6 mb-8">
            {/* Company Name Input */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Climbing the Seven Summits"
                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0A4367]"
                style={{ borderColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}
              />
            </div>

            {/* GA4 Measurement ID Input */}
            <div>
              <label htmlFor="gaId" className="block text-sm font-medium text-gray-700 mb-2">
                GA4 Measurement ID (Optional)
              </label>
              <input
                type="text"
                id="gaId"
                value={gaId}
                onChange={(e) => setGaId(e.target.value)}
                placeholder={`Leave blank to use default: ${defaultGaId}`}
                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0A4367]"
                style={{ borderColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}
              />
              <p className="mt-1 text-sm text-gray-500">
                If left blank, will use Recal's default tracking ID ({defaultGaId})
              </p>
            </div>

            {/* Base URL Input */}
            <div>
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <input
                type="text"
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0A4367]"
                style={{ borderColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}
              />
              <p className="mt-1 text-sm text-gray-500">
                The base URL of your Next.js application
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}
            >
              Generate Embed Code
            </button>
          </div>

          {/* Generated Code Blocks */}
          {generatedCode && (
            <div className="space-y-8 mt-8">
              {/* Script Embed Option */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold" style={{ color: '#0A4367' }}>
                    Option A: Script Embed (Recommended)
                  </h2>
                  <button
                    onClick={() => copyToClipboard(generatedCode.script)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Copy Code
                  </button>
                </div>
                <textarea
                  value={generatedCode.script}
                  onChange={(e) =>
                    setGeneratedCode((prev) =>
                      prev ? { ...prev, script: e.target.value } : prev
                    )
                  }
                  className="w-full bg-gray-900 text-white font-mono text-sm p-4 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={10}
                  spellCheck={false}
                />
                <p className="mt-2 text-sm text-gray-600">
                  Better integration, more control. Partners paste this code on their website.
                </p>
              </div>

              {/* Iframe Embed Option */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold" style={{ color: '#0A4367' }}>
                    Option B: Iframe Embed
                  </h2>
                  <button
                    onClick={() => copyToClipboard(generatedCode.iframe)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Copy Code
                  </button>
                </div>
                <textarea
                  value={generatedCode.iframe}
                  onChange={(e) =>
                    setGeneratedCode((prev) =>
                      prev ? { ...prev, iframe: e.target.value } : prev
                    )
                  }
                  className="w-full bg-gray-900 text-white font-mono text-sm p-4 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={8}
                  spellCheck={false}
                />
                <p className="mt-2 text-sm text-gray-600">
                  Simple iframe embed. Works on any website without JavaScript configuration.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions for Partner</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Copy the embed code above (choose Script or Iframe)</li>
                  <li>Paste it into your website where you want the form to appear</li>
                  <li>The form will automatically track views and conversions with your company name</li>
                  <li>No additional configuration needed - it's ready to use!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        input::placeholder {
          color: rgba(10, 67, 103, 0.8);
          font-family: 'Rogue Sans Ext', sans-serif;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

