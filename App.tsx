import React, { useState, useEffect, useRef } from 'react';
import ModelViewer from './components/ModelViewer';
import { getFanRecommendations } from './services/geminiService';
import { AppStep, FanConfig, FanFinish, AIRecommendation, AIAnalysisResult } from './types';
import { DEFAULT_CONFIG, PRESET_COLORS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.CHOOSE_FAN);
  const [fanConfig, setFanConfig] = useState<FanConfig>(DEFAULT_CONFIG);
  
  // AI / Room Context State
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64 full string
  const [selectedImageMime, setSelectedImageMime] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string>("Analyzing room...");

  // AR State
  const [triggerAr, setTriggerAr] = useState(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  // Handle URL Params on Mount
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const color = params.get('c');
        const finish = params.get('f');
        if (color && finish) {
          setFanConfig({
            color: '#' + color,
            finish: finish as FanFinish
          });
          setCurrentStep(AppStep.PERSONALIZE);
        }
      } catch (e) {
        console.warn("Invalid URL parameters");
      }
    }
  }, []);

  // Update URL on Config Change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('c', fanConfig.color.replace('#', ''));
    params.set('f', fanConfig.finish);
    window.location.hash = params.toString();
  }, [fanConfig]);

  const handleManualUpdate = (updates: Partial<FanConfig>) => {
    setFanConfig(prev => ({ ...prev, ...updates }));
    setTriggerAr(false); // Reset AR trigger if modified
  };

  // 1. Select File (Local Preview Only)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setAnalysisResult(null); // Clear previous results on new file
    setAnalysisStatus("Analyzing room...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSelectedImage(base64String);
      setSelectedImageMime(file.type);
    };
  };

  // 2. Confirm & Analyze (API Call)
  const handleConfirmAnalysis = async () => {
    if (!selectedImage || !selectedImageMime) return;

    setAnalyzing(true);
    setAnalysisStatus("Analyzing room features...");
    setErrorMsg(null);
    setAnalysisResult(null); // Clear previous to prevent stale UI

    try {
      // Simulate phases for better UX (optional, but nice)
      setTimeout(() => setAnalysisStatus("Curating premium matches..."), 1500);

      // Remove data URL prefix (e.g. "data:image/jpeg;base64,") for API
      const base64Data = selectedImage.split(',')[1];
      const result = await getFanRecommendations(base64Data, selectedImageMime);
      
      if (!result.valid) {
        setErrorMsg(result.user_message);
        setAnalysisResult(null);
      } else {
        setAnalysisResult(result);
      }
    } catch (err) {
      setErrorMsg("Unable to analyze the room. Loading safe defaults.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResetImage = () => {
    setSelectedImage(null);
    setSelectedImageMime(null);
    setAnalysisResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const applyRecommendation = (rec: AIRecommendation) => {
    setFanConfig({
      color: rec.hex,
      finish: rec.finish
    });
  };

  // --- Helper to group recommendations by Tier ---
  const groupedRecs = analysisResult?.suggestions.reduce((acc, curr) => {
    (acc[curr.tier] = acc[curr.tier] || []).push(curr);
    return acc;
  }, {} as Record<string, AIRecommendation[]>) || {};

  // --- Render Components ---

  return (
    <div className="flex flex-col h-screen w-full bg-stone-50 text-stone-800 overflow-hidden">
      
      {/* Header - Minimal Brand Presence */}
      <header className="flex-none p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
        <div className="flex items-center">
           {/* Logo Replacement: Expects logo.png in public/assets/ */}
           <img
             src="/assets/logo.png"
             alt="Fan Design"
             className="h-8 w-auto object-contain"
             onError={(e) => {
               // Fallback to text if image fails to load
               (e.target as HTMLImageElement).style.display = 'none';
               (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
             }}
           />
           {/* Fallback Text (Hidden by default unless image fails) */}
           <h1 className="text-xl font-light tracking-wide text-stone-900 hidden ml-2">Fan Configurator</h1>
        </div>

        <div className="flex space-x-1">
          {[1, 2, 3].map(step => (
            <div 
              key={step} 
              className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                currentStep >= step ? 'bg-stone-800' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Content Area: Split 3D View and Controls */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Panel 1: 3D Viewer Container */}
        <div className="flex-1 relative h-[45vh] lg:h-auto bg-neutral-100 order-1 lg:order-2 z-0">
           <ModelViewer 
              config={fanConfig} 
              arActive={triggerAr} 
           />
           
           {/* Step 1 CTA overlay */}
           {currentStep === AppStep.CHOOSE_FAN && (
             <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
               <button 
                 onClick={() => setCurrentStep(AppStep.PERSONALIZE)}
                 className="pointer-events-auto bg-stone-900 text-white px-8 py-3 rounded-full shadow-lg hover:bg-stone-800 transition-transform transform hover:scale-105"
               >
                 Start Customizing
               </button>
             </div>
           )}
        </div>

        {/* Panel 2: Controls Sidebar */}
        <div className="w-full lg:w-[480px] bg-white border-r border-stone-200 flex flex-col order-2 lg:order-1 h-[55vh] lg:h-auto overflow-y-auto shadow-xl z-20">
          
          <div className="p-8 flex-1">
            {currentStep === AppStep.CHOOSE_FAN && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-3xl font-light text-stone-900">The Aero Collection</h2>
                <p className="text-stone-500 leading-relaxed">
                  Experience the perfect balance of form and function. 
                  Inspect the details of our flagship model in 3D before defining your style.
                </p>
                <div className="text-xs text-stone-400 uppercase tracking-widest mt-8">Drag to Rotate • Pinch to Zoom</div>
              </div>
            )}

            {currentStep === AppStep.PERSONALIZE && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-end mb-2">
                  <h2 className="text-2xl font-light">Personalize</h2>
                  <div className="flex space-x-2 text-sm">
                    <button 
                      onClick={() => setIsAiMode(false)}
                      className={`px-3 py-1 rounded-full transition-colors ${!isAiMode ? 'bg-stone-100 text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      Manual
                    </button>
                    <button 
                      onClick={() => setIsAiMode(true)}
                      className={`px-3 py-1 rounded-full transition-colors ${isAiMode ? 'bg-stone-100 text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      AI Assistant
                    </button>
                  </div>
                </div>

                {!isAiMode ? (
                  // Path A: Manual
                  <div className="space-y-8">
                    {/* Finish Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Finish</label>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.values(FanFinish).map((finish) => (
                          <button
                            key={finish}
                            onClick={() => handleManualUpdate({ finish })}
                            className={`py-3 px-2 rounded border transition-all ${
                              fanConfig.finish === finish 
                                ? 'border-stone-800 bg-stone-50 text-stone-900 ring-1 ring-stone-800' 
                                : 'border-stone-200 text-stone-500 hover:border-stone-300'
                            }`}
                          >
                            {finish}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Color</label>
                      <div className="grid grid-cols-6 gap-3">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleManualUpdate({ color })}
                            className={`w-10 h-10 rounded-full border border-stone-200 shadow-sm transition-transform hover:scale-110 relative ${
                              fanConfig.color === color ? 'ring-2 ring-offset-2 ring-stone-800' : ''
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                        {/* Custom Color Input */}
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-stone-200 shadow-sm hover:scale-110 transition-transform">
                          <input 
                            type="color" 
                            className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                            value={fanConfig.color}
                            onChange={(e) => handleManualUpdate({ color: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Path B: AI Assistant
                  <div className="space-y-6">
                    
                    {/* 1. Upload / Image Preview Card */}
                    <div className="bg-stone-50 rounded-lg border border-stone-100 overflow-hidden">
                      {!selectedImage ? (
                         <div className="p-6 text-center">
                            <p className="text-stone-600 text-sm mb-4 leading-relaxed">
                              Upload a photo of your room. Our AI will analyze your lighting and decor to suggest the perfect match.
                            </p>
                            <input 
                              type="file" 
                              ref={fileInputRef}
                              accept="image/png, image/jpeg"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-3 border border-stone-300 bg-white text-stone-600 rounded-md hover:border-stone-400 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              <span>Choose Room Photo</span>
                            </button>
                         </div>
                      ) : (
                        <div className="relative">
                          {/* Image Preview */}
                          <div className="relative aspect-video bg-stone-200">
                             <img src={selectedImage} alt="Room Context" className="w-full h-full object-cover" />
                             
                             {/* Overlay Actions */}
                             <div className="absolute inset-0 bg-black/10 flex items-center justify-center gap-2 p-4 transition-opacity opacity-0 hover:opacity-100">
                                <button onClick={handleResetImage} className="bg-white/90 text-stone-800 text-xs px-3 py-1.5 rounded shadow hover:bg-white">Change Photo</button>
                             </div>
                          </div>

                          {/* Pre-Analysis Confirmation */}
                          {!analysisResult && !analyzing && !errorMsg && (
                             <div className="p-4 border-t border-stone-200 bg-white">
                               <p className="text-xs text-stone-500 mb-3 text-center">Previewing image. Ready to analyze?</p>
                               <div className="flex gap-2">
                                 <button onClick={handleResetImage} className="flex-1 py-2 text-sm text-stone-500 hover:text-stone-800">Cancel</button>
                                 <button 
                                   onClick={handleConfirmAnalysis}
                                   className="flex-1 py-2 bg-stone-900 text-white rounded text-sm hover:bg-stone-800 transition-colors"
                                 >
                                   Use this photo
                                 </button>
                               </div>
                             </div>
                          )}

                          {/* Analyzing State */}
                          {analyzing && (
                            <div className="p-6 border-t border-stone-200 bg-white text-center">
                               <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full mx-auto mb-2"></div>
                               <span className="text-sm text-stone-500">{analysisStatus}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {errorMsg && (
                        <div className="p-4 bg-amber-50 border-t border-amber-100">
                           <div className="flex gap-2 items-start">
                             <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                             <p className="text-xs text-amber-800">{errorMsg}</p>
                           </div>
                           <button onClick={handleResetImage} className="mt-2 text-xs text-amber-900 underline font-medium">Try another photo</button>
                        </div>
                      )}
                    </div>

                    {/* 2. Analysis Results (Persisted Context) */}
                    {analysisResult && analysisResult.room_context && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Context Insights */}
                        <div className="bg-white border border-stone-100 rounded-lg p-4 shadow-sm">
                           <div className="flex justify-between items-start mb-3">
                              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Analysis</h3>
                              <div className="flex gap-2 items-center">
                                <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] rounded-full uppercase tracking-wide font-medium">
                                  {analysisResult.room_context.style || "Modern"}
                                </span>
                                <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] rounded-full uppercase tracking-wide font-medium">
                                  {analysisResult.room_context.lighting} Light
                                </span>
                              </div>
                           </div>
                           
                           <div className="flex items-center justify-between">
                             {/* Dominant Tones */}
                             <div className="flex gap-2">
                                {analysisResult.room_context.dominant_tones.map((tone, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full border border-stone-200 shadow-sm" style={{backgroundColor: tone}} title={tone} />
                                ))}
                             </div>
                             
                             {/* Regenerate Button */}
                             <button 
                               onClick={handleConfirmAnalysis}
                               className="text-[10px] uppercase font-semibold text-stone-400 hover:text-stone-800 flex items-center gap-1 transition-colors"
                             >
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                               Regenerate
                             </button>
                           </div>
                           <div className="mt-2 text-right">
                             <span className="text-[10px] text-stone-400 italic">Based on your photo</span>
                           </div>
                        </div>

                        {/* Recommendations List - Grouped by Tier */}
                        <div className="space-y-4">
                          {['Blend', 'Balanced', 'Accent'].map((tier) => {
                             const recs = groupedRecs[tier];
                             if (!recs || recs.length === 0) return null;
                             
                             return (
                               <div key={tier} className="space-y-2">
                                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider pl-1">{tier} Options</label>
                                  {recs.map((rec, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => applyRecommendation(rec)}
                                      className={`w-full text-left p-3 rounded border transition-all ${
                                        fanConfig.color === rec.hex && fanConfig.finish === rec.finish
                                          ? 'border-stone-800 bg-stone-50 ring-1 ring-stone-100'
                                          : 'border-stone-100 hover:border-stone-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 mb-1">
                                        <div 
                                          className="w-4 h-4 rounded-full border border-stone-200 shadow-sm"
                                          style={{ backgroundColor: rec.hex }} 
                                        />
                                        <span className="font-medium text-stone-900 text-sm">{rec.label}</span>
                                        <span className="text-xs text-stone-500 border border-stone-200 px-1.5 rounded">{rec.finish}</span>
                                      </div>
                                      <p className="text-xs text-stone-500 line-clamp-1">{rec.reason}</p>
                                    </button>
                                  ))}
                               </div>
                             );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentStep === AppStep.VISUALIZE && (
               <div className="space-y-8 animate-fade-in">
                 <h2 className="text-2xl font-light">Visualize & Decide</h2>
                 <p className="text-stone-500">
                   You've selected <strong className="text-stone-800">{fanConfig.finish}</strong> finish in a custom tone. 
                   Validate this choice in your actual space using Augmented Reality.
                 </p>
                 
                 <div className="bg-stone-50 p-6 rounded-lg border border-stone-100 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white shadow-sm mb-4">
                      <svg className="w-8 h-8 text-stone-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                    </div>
                    <button
                      onClick={() => setTriggerAr(true)}
                      className="w-full bg-stone-900 text-white py-4 rounded-lg shadow-lg hover:bg-stone-800 transition-all font-medium mb-3"
                    >
                      View in My Room (AR)
                    </button>
                    <p className="text-xs text-stone-400">Works best on iPhone (Safari) and Android (Chrome)</p>
                 </div>
               </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="p-6 border-t border-stone-100 flex justify-between bg-white z-50">
             {currentStep > AppStep.CHOOSE_FAN && (
               <button 
                 onClick={() => setCurrentStep(prev => prev - 1)}
                 className="text-stone-500 hover:text-stone-800 text-sm font-medium px-4 py-2"
               >
                 Back
               </button>
             )}
             
             {currentStep < AppStep.VISUALIZE && currentStep !== AppStep.CHOOSE_FAN && (
               <button 
                 onClick={() => setCurrentStep(prev => prev + 1)}
                 className="ml-auto bg-stone-200 text-stone-800 hover:bg-stone-300 px-8 py-2 rounded-full text-sm font-medium transition-colors"
               >
                 Next
               </button>
             )}
             
             {/* Restart Flow at end */}
             {currentStep === AppStep.VISUALIZE && (
               <button 
                 onClick={() => {
                   setCurrentStep(AppStep.CHOOSE_FAN);
                   setFanConfig(DEFAULT_CONFIG);
                   setIsAiMode(false);
                   handleResetImage();
                 }}
                 className="ml-auto text-stone-500 hover:text-stone-800 text-sm font-medium px-4 py-2"
               >
                 Start Over
               </button>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;