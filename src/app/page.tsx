"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

// Partner logos data
const partnerLogos = [
  "360 Expeditions.svg",
  "Adventure Boutique.svg", 
  "Alpine Ascents.svg",
  "Alpine Athletics.svg",
  "Altezza.svg",
  "Altitude Centre.svg",
  "Altitude Endurance.svg",
  "American Alpine Institute.svg",
  "American Mountain Guides.svg",
  "Backcountry Strength.svg",
  "Bear 100.svg",
  "Colorado Mountain Club.svg",
  "CTSS.svg",
  "Darjeeling.svg",
  "Earth's Edge.svg",
  "Everest.svg",
  "Futurebach.svg",
  "Grajales.svg",
  "Hypoxico.svg",
  "IVBV.svg",
  "Jagged Globe.svg",
  "Kilimanjaro.svg",
  "Leadville Race.svg",
  "Mountain Madness.svg",
  "Patagoniacs.svg",
  "RMI.svg",
  "Run Wild Retreats.svg",
  "Trailblazer.svg",
  "Traverse Journeys.svg",
  "Traverse.svg",
  "Uphill Athlete.svg",
  "Wayfinders.svg",
  "WHOA.svg"
];

export default function Home() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  // Social proof messages with names and genders
  const socialProofData = [
    { name: "Claire", gender: "female", message: "Claire&apos;s RBI uncovered they weren&apos;t using the lower regions of their lungs at all - which limited their O2 intake." },
    { name: "David", gender: "male", message: "David&apos;s RBI Score helped them realize that they were over breathing - the reason they felt gassed on long hikes." },
    { name: "Mark", gender: "male", message: "Mark now knows what to work on before their Denali expedition: Nasal Breathing & CO2 tolerance." },
    { name: "Ravi", gender: "male", message: "Ravi now knows which breathwork drills to prioritize for his Kilimanjaro climb." },
    { name: "Jan", gender: "male", message: "Jan learned his LOM score is poor and now has a training protocol to help him get more O2 in his system." },
    { name: "", gender: "neutral", message: "32 people have taken the Recal Breath Assessment so far..." }
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [peopleCount, setPeopleCount] = useState(32);

  // Cycle through messages every 6 seconds (slower for better readability)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % socialProofData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [socialProofData.length]);

  // Increment people count slowly (simulate real growth)
  useEffect(() => {
    const countInterval = setInterval(() => {
      setPeopleCount(prev => prev + 1);
    }, 300000); // Every 5 minutes
    return () => clearInterval(countInterval);
  }, []);

  // Get current message with updated count
  const getCurrentMessage = () => {
    const current = socialProofData[currentMessageIndex];
    if (current.message.includes("people have taken")) {
      return `${peopleCount} people have taken the Recal Breath Assessment so far...`;
    }
    return current.message;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Dark Blue Background */}
      <header className="w-full" style={{ backgroundColor: '#0A4367' }}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-24">
            {/* Logo */}
            <Image
              src="/Logo Version A White - Recal_no background_small.png"
              alt="Recal Logo"
              width={160}
              height={80}
              className="h-16 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 sm:px-8 lg:px-12 max-h-[600px]">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start h-full">
            {/* Left Column - Hero Content with Form */}
            <div className="space-y-4 flex flex-col justify-start h-full">
              {/* H1 Heading */}
                      <h1 className="text-5xl lg:text-6xl font-bold leading-tight" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '60px', lineHeight: '72px' }}>
                        Is Your Breathing Holding You Back?<br />
                        <span style={{ color: '#000000' }}>Find out in 5 Minutes.</span>
                      </h1>
                      
                      {/* Subtitle */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center -space-x-1">
                          <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#0A4367' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#0A4367' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="text-lg text-gray-700" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          Take our <span style={{ color: '#0A4367', fontWeight: '600' }}>free</span>, science-backed assessment to uncover the hidden metrics limiting your endurance, recovery, and focus.
                        </p>
                      </div>
              
              {/* Hero Form Container */}
              <div className="bg-white rounded-xl border-2 p-3 shadow-lg" style={{ borderColor: '#0A4367' }}>
                        <div className="space-y-3">
                          {/* Name Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              name="firstName"
                              placeholder="First Name"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                              style={{ borderColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '16px', height: '43px' }}
                            />
                            <input
                              type="text"
                              name="lastName"
                              placeholder="Last Name"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                              style={{ borderColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '16px', height: '43px' }}
                            />
                          </div>

                          {/* Email Input */}
                          <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                            style={{ borderColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '16px', height: '43px' }}
                          />
                  
                          {/* CTA Button */}
                          <button
                            className="w-full py-3 px-6 rounded-lg font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '16px', height: '45px' }}
                          >
                            Start My Assessment
                          </button>
                          
                          {/* Time estimate fine print */}
                          <p className="text-center text-xs text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                            Takes 5-10 minutes on average to complete
                          </p>
                  
                          {/* Subtitle */}
                          <p className="text-center text-sm italic" style={{ color: '#0A4367', fontFamily: 'Roboto, sans-serif', fontSize: '16px', fontWeight: '500', fontStyle: 'italic' }}>
                            Your info will never be shared with anyone. No Credit card required.
                          </p>
                </div>
              </div>
            </div>
            
                    {/* Right Column - Hero Image */}
                    <div className="flex flex-col justify-start items-center h-full space-y-6">
                      <div className="w-full max-w-sm h-[500px] rounded-xl overflow-hidden">
                        <Image
                          src="/hero image.png"
                          alt="Recal Breath Assessment App"
                          width={300}
                          height={500}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                      
                      {/* Social Proof Widget */}
                      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-4 shadow-sm h-24 flex items-center">
                        <div className="flex items-start space-x-3 w-full">
                          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-green-500 animate-pulse" style={{ animation: 'pulse 2s infinite' }}></div>
                          <p className="text-sm text-gray-600 leading-relaxed transition-all duration-500 overflow-hidden" style={{ fontFamily: 'Roboto, sans-serif' }}>
                            {getCurrentMessage()}
                          </p>
                        </div>
                      </div>
                    </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-20 bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-8" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Trusted By Athletes of:
                    </h2>
          </div>
          
          {/* Logo Ticker Viewport */}
          <div className="bg-white rounded-xl border-2 p-8 shadow-lg overflow-hidden" style={{ borderColor: '#0A4367' }}>
            <div className="flex items-center justify-center h-48">
              {/* Scrolling Logo Container */}
              <div className="flex items-center space-x-8 animate-scroll">
                {/* First set of logos */}
                {partnerLogos.map((logo, index) => (
                  <div key={`first-${index}`} className="flex-shrink-0 flex items-center justify-center h-36 w-36">
                    <Image
                      src={`/assets/${logo}`}
                      alt={`Partner ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {partnerLogos.map((logo, index) => (
                  <div key={`second-${index}`} className="flex-shrink-0 flex items-center justify-center h-36 w-36">
                    <Image
                      src={`/assets/${logo}`}
                      alt={`Partner ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-stretch min-h-[600px]">
            {/* Left Column */}
            <div className="space-y-8 flex flex-col justify-between h-full">
              <h2 className="text-3xl font-bold leading-tight" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                Get a Personalized Breakdown of your Breathing Profile
              </h2>
              
              {/* YouTube Video */}
              <div className="w-full">
                <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/04oIgw72jsU"
                    title="Recal Breath Assessment"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  ></iframe>
                </div>
              </div>
              
              {/* Benefits in Boxes with Icons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-lg p-6 shadow-lg" style={{ backgroundColor: '#0A4367' }}>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-white">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4367' }}>
                        {/* Target Icon - Proper bullseye target */}
                        <div className="w-7 h-7 relative">
                          {/* Outer ring */}
                          <div className="w-7 h-7 border-2 border-white rounded-full absolute"></div>
                          {/* Middle ring */}
                          <div className="w-5 h-5 border-2 border-white rounded-full absolute top-1 left-1"></div>
                          {/* Inner ring */}
                          <div className="w-3 h-3 border border-white rounded-full absolute top-2 left-2"></div>
                          {/* Center dot */}
                          <div className="w-1 h-1 bg-white rounded-full absolute top-3 left-3"></div>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Find Your Performance Bottleneck
                    </h3>
                  </div>
                </div>
                
                <div className="rounded-lg p-6 shadow-lg" style={{ backgroundColor: '#0A4367' }}>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-white">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4367' }}>
                        {/* Strong Arm Icon - Flexed bicep */}
                        <div className="w-7 h-7 relative">
                          {/* Upper arm */}
                          <div className="w-4 h-2 bg-white rounded-full absolute top-1 left-0 transform rotate-12"></div>
                          {/* Forearm */}
                          <div className="w-3 h-2 bg-white rounded-full absolute top-3 left-2 transform -rotate-45"></div>
                          {/* Bicep muscle (bulge) */}
                          <div className="w-2 h-2 bg-white rounded-full absolute top-2 left-1"></div>
                          {/* Hand/fist */}
                          <div className="w-1 h-1 bg-white rounded-sm absolute top-4 left-4"></div>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Unlock Your Hidden Strengths
                    </h3>
                  </div>
                </div>
                
                <div className="rounded-lg p-6 shadow-lg" style={{ backgroundColor: '#0A4367' }}>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-white">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4367' }}>
                        {/* Speedometer Icon - Gauge with needle */}
                        <div className="w-7 h-7 relative">
                          {/* Gauge arc (semicircle) */}
                          <div className="w-6 h-3 border-2 border-white border-b-0 rounded-t-full absolute top-2 left-0.5"></div>
                          {/* Speed marks */}
                          <div className="w-0.5 h-1 bg-white absolute top-1.5 left-1"></div>
                          <div className="w-0.5 h-1 bg-white absolute top-1 left-3"></div>
                          <div className="w-0.5 h-1 bg-white absolute top-1.5 right-1"></div>
                          {/* Needle pointing to high speed */}
                          <div className="w-2 h-0.5 bg-white rounded absolute top-3.5 left-2 transform rotate-45 origin-left"></div>
                          {/* Center pivot */}
                          <div className="w-1 h-1 bg-white rounded-full absolute top-3.5 left-2.5"></div>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Get an Actionable Score
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-8 flex flex-col justify-center h-full">
              <h3 className="text-4xl font-bold" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '62px' }}>
                The Science Behind the Recal Breath Index
              </h3>
              <p className="text-lg leading-relaxed" style={{ color: '#1E1E1E', fontFamily: 'Roboto, sans-serif' }}>
                The Recal Breath Assessment was created by Anthony Lorubbio after years of working with athletes at altitude and in endurance sports. It measures your breathing performance across five proven tests to give you a complete profile — what we call your Recal Breath Index.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#1E1E1E', fontFamily: 'Roboto, sans-serif' }}>
                This isn&apos;t just about lung capacity — it&apos;s about efficiency, endurance, and mechanics. The results show you where you&apos;re strong, where you need work, and which protocols can help you improve.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#1E1E1E', fontFamily: 'Roboto, sans-serif' }}>
                Your breathing is one of the most overlooked factors in performance. The Recal Breath Assessment makes it measurable — and actionable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm italic" style={{ color: '#5C6164' }}>
              © 2025 Recal Training. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
