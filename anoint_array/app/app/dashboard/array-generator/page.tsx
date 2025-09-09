'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Download, 
  Sparkles, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  Heart,
  Shield,
  Star,
  Brain,
  Eye,
  Palette,
  Music
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import {
  ArrayConfig,
  GeneratedArray,
  SACRED_PATTERNS,
  HEALING_FREQUENCIES,
  SACRED_COLORS,
  PRESET_INTENTIONS,
  HEALING_AFFIRMATIONS,
  generateNumerologySequence,
  calculateEnergyProfile,
  generateSVG
} from '@/lib/array-generator';

export default function ArrayGeneratorPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentArray, setCurrentArray] = useState<GeneratedArray | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [config, setConfig] = useState<ArrayConfig>({
    geometry: 'flower_of_life',
    size: 'medium',
    colors: ['#8B5CF6', '#06B6D4'],
    frequency: 528,
    numerologySequence: [7, 77, 777],
    affirmations: HEALING_AFFIRMATIONS.healing,
    elementalFocus: 'spirit',
    intention: 'Healing and restoration',
    duration: 20
  });

  // Auto-update numerology when intention changes
  useEffect(() => {
    const newSequence = generateNumerologySequence(config.intention);
    setConfig(prev => ({ ...prev, numerologySequence: newSequence }));
  }, [config.intention]);

  const handleConfigChange = (updates: Partial<ArrayConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulation
      
      const svgContent = generateSVG(config);
      const energyProfile = calculateEnergyProfile(config);
      
      const newArray: GeneratedArray = {
        id: `array_${Date.now()}`,
        name: `${SACRED_PATTERNS[config.geometry].name} - ${config.intention}`,
        config,
        svgContent,
        frequencies: [config.frequency, 7.83, 40], // Include base frequency plus harmonics
        timestamp: new Date().toISOString(),
        energyProfile
      };
      
      setCurrentArray(newArray);
      toast.success('Sacred array generated successfully!');
    } catch (error) {
      toast.error('Failed to generate array');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!currentArray) return;
    
    const blob = new Blob([currentArray.svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentArray.name.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Array downloaded successfully!');
  };

  const toggleMeditation = () => {
    setIsPlaying(!isPlaying);
    toast(isPlaying ? 'Meditation paused' : 'Meditation started');
  };

  const resetArray = () => {
    setCurrentArray(null);
    setIsPlaying(false);
    toast('Array cleared');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">ANOINT Array Generator</h1>
                <p className="text-gray-300">Create personalized sacred healing arrays infused with scalar energy</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>{showConfig ? 'Hide' : 'Show'} Config</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="lg:col-span-1 space-y-6"
              >
                {/* Sacred Geometry */}
                <div className="mystical-card p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-400" />
                    Sacred Geometry
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(SACRED_PATTERNS).map(([key, pattern]) => (
                      <button
                        key={key}
                        onClick={() => handleConfigChange({ geometry: key as ArrayConfig['geometry'] })}
                        className={`p-3 rounded-lg text-sm transition-all ${
                          config.geometry === key
                            ? 'aurora-gradient text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {pattern.name}
                      </button>
                    ))}
                  </div>
                  {SACRED_PATTERNS[config.geometry] && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-300 mb-2">
                        {SACRED_PATTERNS[config.geometry].description}
                      </p>
                      <p className="text-xs text-purple-300">
                        Energy: {SACRED_PATTERNS[config.geometry].energy}
                      </p>
                    </div>
                  )}
                </div>

                {/* Colors */}
                <div className="mystical-card p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Palette className="h-5 w-5 mr-2 text-cyan-400" />
                    Sacred Colors
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {Object.entries(SACRED_COLORS).map(([color, info]) => (
                      <button
                        key={color}
                        onClick={() => handleConfigChange({ colors: [color, config.colors[1]] })}
                        className={`h-12 rounded-lg border-2 transition-all ${
                          config.colors[0] === color ? 'border-white' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                        title={`${info.chakra} Chakra - ${info.energy}`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-400">
                    Selected: {SACRED_COLORS[config.colors[0] as keyof typeof SACRED_COLORS]?.chakra} Chakra
                  </div>
                </div>

                {/* Healing Frequency */}
                <div className="mystical-card p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Music className="h-5 w-5 mr-2 text-green-400" />
                    Healing Frequency
                  </h3>
                  <select
                    value={config.frequency}
                    onChange={(e) => handleConfigChange({ frequency: Number(e.target.value) })}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Object.entries(HEALING_FREQUENCIES).map(([freq, desc]) => (
                      <option key={freq} value={freq}>
                        {freq} Hz - {desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Intention */}
                <div className="mystical-card p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Intention</h3>
                  <select
                    value={config.intention}
                    onChange={(e) => handleConfigChange({ intention: e.target.value })}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                  >
                    {PRESET_INTENTIONS.map(intention => (
                      <option key={intention} value={intention}>{intention}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={config.intention}
                    onChange={(e) => handleConfigChange({ intention: e.target.value })}
                    placeholder="Enter custom intention..."
                    className="w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Size and Duration */}
                <div className="mystical-card p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Array Size</label>
                      <select
                        value={config.size}
                        onChange={(e) => handleConfigChange({ size: e.target.value as ArrayConfig['size'] })}
                        className="w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="small">Small (400x400)</option>
                        <option value="medium">Medium (600x600)</option>
                        <option value="large">Large (800x800)</option>
                        <option value="xl">Extra Large (1000x1000)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Meditation Duration: {config.duration} minutes
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={config.duration}
                        onChange={(e) => handleConfigChange({ duration: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Array Display and Controls */}
          <div className={`${showConfig ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
            {/* Action Buttons */}
            <div className="mystical-card p-6 rounded-lg">
              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="aurora-gradient text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Generate Array</span>
                    </>
                  )}
                </motion.button>

                {currentArray && (
                  <>
                    <button
                      onClick={handleDownload}
                      className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download SVG</span>
                    </button>

                    <button
                      onClick={toggleMeditation}
                      className={`${
                        isPlaying ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'
                      } text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors`}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      <span>{isPlaying ? 'Pause' : 'Start'} Meditation</span>
                    </button>

                    <button
                      onClick={resetArray}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
                    >
                      <RotateCcw className="h-5 w-5" />
                      <span>Reset</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Generated Array Display */}
            {currentArray && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mystical-card p-6 rounded-lg"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-white mb-2">{currentArray.name}</h2>
                  <p className="text-gray-300">
                    Generated on {new Date(currentArray.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="flex justify-center mb-6">
                  <div 
                    className={`transition-transform duration-1000 ${
                      isPlaying ? 'animate-pulse' : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: currentArray.svgContent }}
                  />
                </div>

                {/* Energy Profile */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {[
                    { key: 'healing', label: 'Healing', icon: Heart, color: 'text-red-400' },
                    { key: 'protection', label: 'Protection', icon: Shield, color: 'text-blue-400' },
                    { key: 'manifestation', label: 'Manifestation', icon: Star, color: 'text-yellow-400' },
                    { key: 'clarity', label: 'Clarity', icon: Eye, color: 'text-purple-400' },
                    { key: 'love', label: 'Love', icon: Heart, color: 'text-pink-400' }
                  ].map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className="text-center">
                      <Icon className={`h-6 w-6 mx-auto mb-2 ${color}`} />
                      <div className="text-sm text-gray-300 mb-1">{label}</div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            key === 'healing' ? 'bg-red-400' :
                            key === 'protection' ? 'bg-blue-400' :
                            key === 'manifestation' ? 'bg-yellow-400' :
                            key === 'clarity' ? 'bg-purple-400' :
                            'bg-pink-400'
                          }`}
                          style={{ width: `${currentArray.energyProfile[key as keyof typeof currentArray.energyProfile]}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {currentArray.energyProfile[key as keyof typeof currentArray.energyProfile]}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Numerology and Affirmations */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">Sacred Numbers</h4>
                    <div className="flex space-x-4 text-2xl font-bold text-purple-400">
                      {currentArray.config.numerologySequence.map((num, index) => (
                        <span key={index}>{num}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-3">Healing Frequencies</h4>
                    <div className="text-cyan-400">
                      {currentArray.frequencies.map((freq, index) => (
                        <div key={index} className="text-sm">
                          {freq} Hz {index === 0 ? '(Primary)' : index === 1 ? '(Earth)' : '(Gamma)'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-gradient-to-r from-purple-800/30 to-blue-800/30 rounded-lg border border-purple-500/30"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white mb-2">Meditation Active</div>
                      <div className="text-purple-300">
                        Focus on the sacred geometry and breathe with the frequencies
                      </div>
                      <div className="mt-4 text-sm text-gray-300">
                        Duration: {config.duration} minutes • Frequency: {config.frequency} Hz
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Instructions */}
            {!currentArray && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mystical-card p-6 rounded-lg text-center"
              >
                <Sparkles className="h-16 w-16 text-purple-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-white mb-4">Create Your Sacred Array</h3>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Configure your personalized healing array using sacred geometry, healing frequencies, 
                  and powerful intentions. Each array is uniquely generated based on your spiritual needs 
                  and meditation goals.
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
                  <div>
                    <Zap className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <div className="font-semibold text-white">Sacred Geometry</div>
                    <div>Ancient patterns for healing</div>
                  </div>
                  <div>
                    <Music className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                    <div className="font-semibold text-white">Healing Frequencies</div>
                    <div>Vibrational healing tones</div>
                  </div>
                  <div>
                    <Heart className="h-8 w-8 text-pink-400 mx-auto mb-2" />
                    <div className="font-semibold text-white">Intention Setting</div>
                    <div>Focused manifestation energy</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
