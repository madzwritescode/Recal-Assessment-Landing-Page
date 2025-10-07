"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import * as gtag from '@/lib/gtag';

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
    { name: "Claire", gender: "female", message: "Claire's RBI uncovered they weren't using the lower regions of their lungs at all - which limited their O2 intake." },
    { name: "David", gender: "male", message: "David's RBI Score helped them realize that they were over breathing - the reason they felt gassed on long hikes." },
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
    }, 300000); {/* Every 5 minutes */}
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track the CTA button click
    gtag.event({
      action: 'start_assessment_click',
      category: 'Conversion',
      label: 'Hero Form CTA',
      value: 1,
    });
    
    // Google Form URL - using the pre-filled version
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfdvHwTAuYDUZrqKntNaIcZbNM_RPothRiZgcMbwFPeb8Mx0A/viewform';
    
    // Create URL with pre-filled data
    const url = new URL(googleFormUrl);
    
    // Add form data as URL parameters for pre-filling
    // Google Forms uses entry IDs that can be found in the form's HTML source
    // Updated with correct entry IDs from the actual Google Form
    if (formData.firstName) {
      url.searchParams.append('entry.1328606392', formData.firstName);
    }
    if (formData.lastName) {
      url.searchParams.append('entry.343152274', formData.lastName);
    }
    if (formData.email) {
      url.searchParams.append('entry.1362361142', formData.email);
    }
    
    // Open Google Form in new tab
    window.open(url.toString(), '_blank');
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
      <section className="py-8 px-6 sm:px-8 lg:px-12 max-h-[600px]">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start h-full">
            {/* Left Column - Hero Content with Form */}
            <div className="space-y-6 flex flex-col justify-start h-full">
              {/* H1 Heading */}
                      <h1 className="text-[30px] lg:text-6xl font-bold lg:leading-tight" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', lineHeight: '1.15' }}>
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
                        <p className="text-[16px] lg:text-lg text-gray-700" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          Take our <span style={{ color: '#0A4367', fontWeight: '600' }}>free</span>, science-backed assessment to uncover the hidden metrics limiting your endurance, recovery, and focus.
                        </p>
                      </div>
              
              {/* Hero Form Container */}
              <div className="bg-white rounded-xl border-2 p-3 shadow-lg" style={{ borderColor: '#4A90A4' }}>
                        <form onSubmit={handleFormSubmit} className="space-y-3">
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
                            type="submit"
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
                          <p className="text-center text-[16px] lg:text-sm italic" style={{ color: '#0A4367', fontFamily: 'Roboto, sans-serif', fontWeight: '500', fontStyle: 'italic' }}>
                            Your info will never be shared with anyone. No Credit card required.
                          </p>
                        </form>
              </div>
              
            </div>
            
                    {/* Right Column - Hero Image */}
                    <div className="hidden lg:flex flex-col justify-start items-center h-full space-y-6">
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

      {/* Mobile Trusted By Section */}
      <section className="block lg:hidden py-12 pt-20 pb-4 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
              Trusted By Athletes of:
            </h2>
          </div>
          
          {/* Mobile Logo Ticker */}
          <div className="bg-white rounded-xl border-2 p-4 shadow-lg overflow-hidden" style={{ borderColor: '#0A4367' }}>
            <div className="flex items-center justify-center h-24">
              <div className="flex items-center space-x-4 animate-scroll">
                {/* First set of logos */}
                {partnerLogos.slice(0, 8).map((logo, index) => (
                  <div key={`mobile-first-${index}`} className="flex-shrink-0 flex items-center justify-center h-16 w-16">
                    <Image
                      src={`/assets/${logo}`}
                      alt={`Partner ${index + 1}`}
                      width={60}
                      height={60}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section - Desktop Only */}
      <section className="hidden lg:block py-20 bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-8" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Trusted By Athletes of:
                    </h2>
          </div>
          
          {/* Logo Ticker Viewport */}
          <div className="bg-white rounded-xl border-2 p-8 shadow-lg overflow-hidden" style={{ borderColor: '#0A4367' }}>
            <div className="flex items-center justify-center h-32">
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
      <section className="py-4 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-stretch min-h-[600px]">
            {/* Left Column */}
            <div className="space-y-8 flex flex-col justify-between h-full">
              <h2 className="text-[30px] lg:text-3xl font-bold leading-tight" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                Get a Personalized Breakdown of your Breathing Profile
              </h2>
              
              {/* YouTube Video */}
              <div className="w-full">
                <div
                  className="w-full aspect-video cursor-pointer rounded-xl overflow-hidden"
                  onClick={() => {
                    gtag.event({
                      action: 'video_interaction',
                      category: 'Engagement',
                      label: 'Science Section Video Clicked',
                      value: 1,
                    });
                  }}
                >
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/04oIgw72jsU?autoplay=1&mute=1&loop=1&playlist=04oIgw72jsU&controls=1&modestbranding=1&rel=0"
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              
              {/* Benefits in Boxes with Icons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                <div className="rounded-lg p-3 md:p-6 shadow-lg" style={{ backgroundColor: '#0A4367' }}>
                  <div className="text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4367' }}>
                      {/* Target Icon - Custom SVG */}
                      <svg className="w-8 h-8 md:w-12 md:h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="6"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                      </svg>
                    </div>
                    <h3 className="text-sm md:text-lg font-semibold text-white" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Find Your Performance Bottleneck
                    </h3>
                  </div>
                </div>
                
                <div className="rounded-lg p-3 md:p-6 shadow-lg" style={{ backgroundColor: '#0A4367' }}>
                  <div className="text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4367' }}>
                      {/* Strength Icon - Custom SVG */}
                      <svg className="w-8 h-8 md:w-12 md:h-12 text-white" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeMiterlimit="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.37 36C22.82 30.75 27.89 27 33.73 27.62C39.29 28.21 43.71 32.9 43.99 38.48C44.06 39.95 43.86 41.36 43.43 42.67C43.17 43.47 42.39 44 41.54 44H11.7584C6.71004 44 2.92371 39.3814 3.91377 34.4311L9.99994 4H21.9999L25.9999 11L17.43 17.13L14.9999 14"></path>
                        <path d="M17.4399 17.13L22 34"></path>
                      </svg>
                    </div>
                    <h3 className="text-sm md:text-lg font-semibold text-white" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Unlock Your Hidden Strengths
                    </h3>
                  </div>
                </div>
                
                <div className="rounded-lg p-3 md:p-6 shadow-lg" style={{ backgroundColor: '#0A4367' }}>
                  <div className="text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4367' }}>
                      {/* Speedometer Icon - Custom SVG */}
                      <svg className="w-8 h-8 md:w-12 md:h-12 text-white" viewBox="0 0 32 32" fill="currentColor">
                        <path d="M15.999 1.129c-8.812 0-15.98 7.169-15.98 15.981 0 5.536 2.803 10.6 7.497 13.544 0.467 0.296 1.084 0.152 1.378-0.316s0.152-1.085-0.316-1.378c-1.691-1.061-3.095-2.439-4.17-4.027l1.048-0.605c0.478-0.276 0.643-0.887 0.366-1.366-0.277-0.48-0.889-0.642-1.366-0.366l-1.050 0.606c-0.763-1.579-1.228-3.306-1.353-5.107h1.113c0.552 0 1-0.448 1-1s-0.447-1-1-1h-1.108c0.132-1.834 0.618-3.572 1.393-5.143l1.005 0.58c0.157 0.091 0.329 0.134 0.499 0.134 0.346 0 0.681-0.179 0.867-0.5 0.277-0.479 0.112-1.090-0.366-1.366l-0.995-0.574c1.003-1.463 2.277-2.728 3.75-3.719l0.563 0.975c0.185 0.322 0.521 0.5 0.867 0.5 0.17 0 0.342-0.043 0.499-0.134 0.479-0.277 0.643-0.887 0.366-1.366l-0.561-0.971c1.542-0.744 3.24-1.208 5.030-1.338v1.246c0 0.553 0.447 1 1 1s1-0.447 1-1v-1.25c1.831 0.127 3.567 0.606 5.137 1.373l-0.543 0.939c-0.276 0.479-0.113 1.090 0.366 1.366 0.157 0.091 0.329 0.134 0.499 0.134 0.346 0 0.681-0.178 0.867-0.5l0.54-0.936c1.459 0.993 2.721 2.255 3.715 3.713l-0.936 0.541c-0.479 0.277-0.642 0.887-0.366 1.366 0.186 0.322 0.521 0.5 0.867 0.5 0.17 0 0.342-0.043 0.499-0.134l0.942-0.543c0.768 1.571 1.248 3.307 1.377 5.139h-1.098c-0.552 0-1 0.448-1 1s0.448 1 1 1h1.098c-0.127 1.777-0.581 3.482-1.328 5.041l-0.99-0.572c-0.477-0.276-1.091-0.111-1.366 0.366-0.276 0.479-0.113 1.090 0.366 1.366l0.993 0.573c-1.097 1.633-2.545 3.044-4.292 4.119-0.471 0.29-0.616 0.907-0.327 1.376 0.189 0.306 0.517 0.476 0.852 0.476 0.178 0 0.36-0.048 0.523-0.148 4.764-2.934 7.608-8.024 7.608-13.614 0-8.811-7.169-15.98-15.98-15.98zM23.378 13.992c0.478-0.277 0.642-0.887 0.366-1.366s-0.888-0.642-1.366-0.366l-5.432 3.136c-0.29-0.164-0.62-0.265-0.977-0.265-1.102 0-1.995 0.893-1.995 1.994 0 1.102 0.893 1.995 1.995 1.995s1.995-0.893 1.995-1.995c0-0.002-0-0.005-0-0.007z"></path>
                      </svg>
                    </div>
                    <h3 className="text-sm md:text-lg font-semibold text-white" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Get an Actionable Score
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-16 flex flex-col justify-center h-full">
              <h3 className="text-[30px] lg:text-6xl font-bold" style={{ color: '#0A4367', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                The Science Behind the Recal Breath Index
              </h3>
              <p className="text-[16px] lg:text-lg leading-relaxed" style={{ color: '#1E1E1E', fontFamily: 'Roboto, sans-serif' }}>
                The Recal Breath Assessment was created by Anthony Lorubbio after years of working with athletes at altitude and in endurance sports. It measures your breathing performance across five proven tests to give you a complete profile — what we call your <strong style={{ color: '#0A4367' }}>Recal Breath Index.</strong>
              </p>
              <p className="text-[16px] lg:text-lg leading-relaxed" style={{ color: '#1E1E1E', fontFamily: 'Roboto, sans-serif' }}>
                This isn't just about lung capacity — it's about efficiency, endurance, and mechanics. The results show you where you're strong, where you need work, and which protocols can help you improve.
              </p>
              <p className="text-[16px] lg:text-lg leading-relaxed font-bold" style={{ color: '#0A4367', fontFamily: 'Roboto, sans-serif' }}>
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
