"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import * as gtag from '@/lib/gtag';
import DiagnosticModal from "@/components/DiagnosticModal";

// Gender detection based on common names
const detectGender = (firstName: string): 'male' | 'female' | 'neutral' => {
  const maleNames = [
    'david', 'mark', 'ravi', 'jan', 'john', 'michael', 'james', 'robert', 'william', 'richard',
    'charles', 'thomas', 'christopher', 'daniel', 'matthew', 'anthony', 'donald', 'steven',
    'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'edward', 'ronald',
    'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan',
    'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'gregory',
    'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'henry',
    'douglas', 'adam', 'peter', 'nathan', 'zachary', 'kyle', 'walter', 'harold', 'carl',
    'arthur', 'gerald', 'roger', 'keith', 'jeremy', 'lawrence', 'sean', 'christian',
    'ethan', 'austin', 'joe', 'albert', 'jesse', 'willie', 'billy', 'bryan', 'bruce',
    'noah', 'jordan', 'dylan', 'alan', 'ralph', 'gabriel', 'roy', 'juan', 'wayne',
    'eugene', 'louis', 'philip', 'bobby', 'johnny', 'bradley', 'kenneth', 'raymond',
    // Popular American male names
    'martin', 'mason', 'logan', 'owen', 'sebastian', 'wyatt', 'grayson', 'leo', 'jayden',
    'lincoln', 'hudson', 'elijah', 'lucas', 'aiden', 'carter', 'jackson', 'mateo', 'michael',
    'gabriel', 'daniel', 'anthony', 'samuel', 'henry', 'theodore', 'joseph', 'luke', 'jaxon',
    'julian', 'levi', 'isaac', 'eli', 'landon', 'connor', 'cayden', 'carson', 'robert', 'angel',
    'maverick', 'rowan', 'adrian', 'miles', 'axel', 'hunter', 'brayden', 'nolan', 'dominic',
    'colton', 'brody', 'asher', 'ezra', 'bentley', 'sawyer', 'kaiden', 'blake', 'ryder',
    'bennett', 'weston', 'kingston', 'ian', 'cooper', 'easton', 'chase', 'nathaniel', 'caleb',
    'ryan', 'elias', 'charlie', 'josiah', 'caleb', 'colton', 'brayden', 'nolan', 'asher',
    'grayson', 'ezra', 'bentley', 'sawyer', 'kaiden', 'blake', 'ryder', 'bennett', 'weston',
    'kingston', 'ian', 'cooper', 'easton', 'chase', 'nathaniel', 'elias', 'josiah', 'caleb',
    // Additional male names
    'antonio', 'carlos', 'miguel', 'luis', 'manuel', 'francisco', 'jesus', 'rafael', 'fernando',
    'mario', 'eduardo', 'ricardo', 'antonio', 'alejandro', 'daniel', 'sergio', 'oscar', 'leonardo',
    'vicente', 'gustavo', 'ramon', 'raul', 'ivan', 'cesar', 'ruben', 'hugo', 'enrique',
    'francisco', 'cristian', 'marcos', 'pablo', 'jorge', 'armando', 'gerardo', 'esteban',
    'sebastian', 'martin', 'felipe', 'alberto', 'diego', 'lorenzo', 'marco', 'ignacio',
    'adrian', 'camilo', 'santiago', 'nicolas', 'julian', 'andres', 'cristopher', 'cristian',
    'simon', 'leonardo', 'javier', 'carlos', 'fernando', 'diego', 'santiago', 'matias',
    'emmanuel', 'maximiliano', 'rodrigo', 'felipe', 'sebastian', 'daniel', 'david', 'jose',
    'antonio', 'juan', 'francisco', 'manuel', 'pedro', 'alejandro', 'rafael', 'jorge',
    'miguel', 'alberto', 'carlos', 'luis', 'pablo', 'javier', 'antonio', 'diego',
    // International names
    'ahmed', 'mohammed', 'ali', 'hassan', 'omar', 'ibrahim', 'youssef', 'khaled', 'mohamed',
    'abdul', 'muhammad', 'abdullah', 'salman', 'tariq', 'khalid', 'umar', 'usman', 'farid',
    'chen', 'wei', 'ming', 'li', 'zhang', 'wang', 'liu', 'chen', 'yang', 'huang', 'zhao',
    'wu', 'zhou', 'xu', 'ma', 'lu', 'sun', 'gao', 'lin', 'he', 'guo', 'zhu', 'cai',
    'hideo', 'takeshi', 'kenji', 'hiroshi', 'masahiro', 'akira', 'taro', 'yuki', 'daichi',
    'ryo', 'shinji', 'kenta', 'satoshi', 'naoki', 'tomohiro', 'kazuki', 'daisuke', 'sho',
    'vikram', 'raj', 'arjun', 'kumar', 'suresh', 'ramesh', 'rajesh', 'deepak', 'sanjay',
    'amit', 'vishal', 'nitin', 'manish', 'rohit', 'sachin', 'pradeep', 'sunil', 'anil'
  ];
  
  const femaleNames = [
    'claire', 'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan',
    'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'helen', 'sandra', 'donna',
    'carol', 'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah',
    'dorothy', 'lisa', 'nancy', 'karen', 'betty', 'helen', 'sandra', 'donna', 'carol',
    'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah', 'dorothy',
    'amy', 'angela', 'brenda', 'emma', 'olivia', 'cynthia', 'marie', 'janet', 'catherine',
    'frances', 'christine', 'samantha', 'debra', 'rachel', 'carolyn', 'janet', 'virginia',
    'maria', 'heather', 'diane', 'julie', 'joyce', 'victoria', 'kelly', 'christina',
    'joan', 'evelyn', 'judith', 'megan', 'cheryl', 'andrea', 'hannah', 'jacqueline',
    'martha', 'gloria', 'teresa', 'sara', 'janice', 'julia', 'marie', 'madison', 'grace',
    'judy', 'theresa', 'beverly', 'denise', 'marilyn', 'amanda', 'stephanie', 'carolyn',
    'catherine', 'frances', 'christine', 'samantha', 'debra', 'rachel', 'carolyn',
    'janet', 'virginia', 'maria', 'heather', 'diane', 'julie', 'joyce', 'victoria',
    // Popular American female names
    'ava', 'isabella', 'sophia', 'charlotte', 'amelia', 'mia', 'harper', 'evelyn', 'abigail',
    'emily', 'elizabeth', 'mila', 'ella', 'avery', 'sofia', 'camila', 'aria', 'scarlett',
    'victoria', 'madison', 'luna', 'grace', 'chloe', 'penelope', 'layla', 'riley', 'zoey',
    'nora', 'lily', 'eleanor', 'hannah', 'lillian', 'addison', 'aubrey', 'ellie', 'stella',
    'natalie', 'zoe', 'leah', 'hazel', 'violet', 'aurora', 'savannah', 'audrey', 'brooklyn',
    'bella', 'claire', 'skylar', 'lucy', 'paisley', 'everly', 'anna', 'caroline', 'nova',
    'genesis', 'aaliyah', 'kennedy', 'kinsley', 'allison', 'maya', 'sarah', 'madelyn',
    'adeline', 'alexa', 'ariel', 'leilani', 'brielle', 'paige', 'adriana', 'willow',
    'gianna', 'naomi', 'piper', 'ruby', 'serenity', 'sadie', 'hazel', 'ivy', 'nora',
    'lily', 'eleanor', 'hannah', 'lillian', 'addison', 'aubrey', 'ellie', 'stella',
    'natalie', 'zoe', 'leah', 'violet', 'aurora', 'savannah', 'audrey', 'brooklyn',
    'bella', 'claire', 'skylar', 'lucy', 'paisley', 'everly', 'anna', 'caroline', 'nova',
    // Additional female names
    'ana', 'rosa', 'carmen', 'isabel', 'lucia', 'dolores', 'pilar', 'concepcion', 'mercedes',
    'cristina', 'angeles', 'margarita', 'josefa', 'francisca', 'antonia', 'dolores', 'teresa',
    'josefa', 'rosario', 'mercedes', 'esperanza', 'soledad', 'encarnacion', 'consuelo',
    'purificacion', 'manuela', 'dolores', 'pilar', 'carmen', 'isabel', 'lucia', 'ana',
    'rosa', 'cristina', 'angeles', 'margarita', 'francisca', 'antonia', 'rosario',
    'esperanza', 'soledad', 'encarnacion', 'consuelo', 'purificacion', 'manuela',
    // International female names
    'fatima', 'aisha', 'khadija', 'zainab', 'aminah', 'mariam', 'hafsa', 'safiya', 'ramla',
    'nusayba', 'ruqayya', 'umm', 'sumayya', 'asma', 'khadija', 'aisha', 'fatima', 'mariam',
    'li', 'wei', 'ming', 'fang', 'jing', 'yan', 'hong', 'mei', 'lan', 'hua', 'ping', 'qin',
    'xiao', 'ling', 'ying', 'yun', 'xia', 'dan', 'li', 'na', 'qing', 'rui', 'xin', 'yu',
    'yoko', 'akiko', 'hiroko', 'naoko', 'sachiko', 'yuki', 'emi', 'mika', 'rika', 'saki',
    'maya', 'yui', 'aoi', 'mai', 'hana', 'kana', 'mio', 'rio', 'sora', 'nana', 'koko',
    'priya', 'kavita', 'anjali', 'shreya', 'divya', 'neha', 'kiran', 'pooja', 'sneha',
    'meera', 'ritu', 'sonia', 'nisha', 'rekha', 'usha', 'leela', 'gita', 'radha', 'sita',
    'anita', 'sunita', 'kavita', 'preeti', 'puja', 'sushma', 'indira', 'geeta', 'lata'
  ];
  
  const name = firstName.toLowerCase().trim();
  
  if (maleNames.includes(name)) return 'male';
  if (femaleNames.includes(name)) return 'female';
  return 'neutral'; // For unisex names or unknown names
};

// Extract meaningful goal from raw goal text
const extractGoal = (rawGoal: string): string | null => {
  if (!rawGoal || rawGoal.trim().length === 0 || rawGoal.trim() === '?' || rawGoal.trim().length < 3) {
    return null;
  }

  const goal = rawGoal.toLowerCase().trim();
  
  // Extract key expedition/mountain goals
  if (goal.includes('everest') || goal.includes('base camp')) {
    return goal.includes('everest') ? 'Everest expedition' : 'Everest Base Camp';
  }
  if (goal.includes('aconcagua')) {
    return 'Aconcagua expedition';
  }
  if (goal.includes('kilimanjaro') || goal.includes('kili')) {
    return 'Kilimanjaro climb';
  }
  if (goal.includes('denali')) {
    return 'Denali expedition';
  }
  if (goal.includes('mont blanc') || goal.includes('montblanc')) {
    return 'Mont Blanc climb';
  }
  if (goal.includes('matterhorn')) {
    return 'Matterhorn climb';
  }
  
  // Extract race/marathon goals
  if (goal.includes('marathon')) {
    return 'marathon';
  }
  if (goal.includes('ultra') || goal.includes('ultramarathon')) {
    return 'ultramarathon';
  }
  if (goal.includes('ironman') || goal.includes('iron man')) {
    return 'Ironman triathlon';
  }
  if (goal.includes('trail') && goal.includes('race')) {
    return 'trail race';
  }
  
  // Extract climbing goals
  if (goal.includes('climb') && goal.includes('mountain')) {
    return 'mountain climbing';
  }
  if (goal.includes('climb') && goal.includes('rock')) {
    return 'rock climbing';
  }
  if (goal.includes('climb') && goal.includes('ice')) {
    return 'ice climbing';
  }
  
  // Extract general fitness goals
  if (goal.includes('hiking') || goal.includes('trekking')) {
    return 'hiking adventures';
  }
  if (goal.includes('cycling') || goal.includes('biking')) {
    return 'cycling';
  }
  if (goal.includes('running') && goal.includes('improve')) {
    return 'running performance';
  }
  if (goal.includes('endurance')) {
    return 'endurance training';
  }
  
  // If goal is too long (>50 chars), extract first meaningful part
  if (rawGoal.length > 50) {
    const sentences = rawGoal.split(/[.!?]/);
    const firstSentence = sentences[0]?.trim();
    if (firstSentence && firstSentence.length < 50) {
      return firstSentence;
    }
  }
  
  return null; // No meaningful goal found
};

// Generate testimonial message based on name, gender, and goal with specific pronouns
const generateTestimonialMessage = (firstName: string, gender: string, rawGoal?: string) => {
  // Define gender-specific pronouns
  const pronouns = {
    male: { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' },
    female: { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' },
    neutral: { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' }
  };
  
  const currentPronouns = pronouns[gender as keyof typeof pronouns];
  
  // Extract meaningful goal from raw goal text
  const extractedGoal = rawGoal ? extractGoal(rawGoal) : null;
  
  // Message templates with Anthony's style - specific discoveries and next steps
  let messageTemplates = [];
  
  // If we have a meaningful goal, create goal-focused messages
  if (extractedGoal) {
    const goalLower = extractedGoal.toLowerCase();
    
    // Check for specific goal types and create targeted messages
    if (goalLower.includes('expedition') || goalLower.includes('climb') || goalLower.includes('mountain')) {
      messageTemplates = [
        `**${firstName}**'s RBI uncovered ${currentPronouns.possessive} breathing patterns and now knows what to work on before ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** discovered ${currentPronouns.possessive} breathing mechanics and has a clear plan to prepare for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** learned ${currentPronouns.possessive} breathing profile and now knows exactly what to focus on for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** found out ${currentPronouns.possessive} breathing efficiency and has a protocol to train before ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}**'s RBI revealed ${currentPronouns.possessive} breathing patterns and now has targeted exercises for ${currentPronouns.possessive} ${extractedGoal}.`
      ];
    } else if (goalLower.includes('race') || goalLower.includes('marathon') || goalLower.includes('ultra')) {
      messageTemplates = [
        `**${firstName}**'s RBI uncovered ${currentPronouns.possessive} breathing patterns and now knows what to work on for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** discovered ${currentPronouns.possessive} breathing mechanics and has a clear plan to improve ${currentPronouns.possessive} performance in ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** learned ${currentPronouns.possessive} breathing profile and now knows exactly what to focus on for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** found out ${currentPronouns.possessive} breathing efficiency and has a protocol to train for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}**'s RBI revealed ${currentPronouns.possessive} breathing patterns and now has targeted exercises for ${currentPronouns.possessive} ${extractedGoal}.`
      ];
    } else {
      // Generic goal-based messages
      messageTemplates = [
        `**${firstName}**'s RBI uncovered ${currentPronouns.possessive} breathing patterns and now knows what to work on for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** discovered ${currentPronouns.possessive} breathing mechanics and has a clear plan to achieve ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** learned ${currentPronouns.possessive} breathing profile and now knows exactly what to focus on for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}** found out ${currentPronouns.possessive} breathing efficiency and has a protocol to train for ${currentPronouns.possessive} ${extractedGoal}.`,
        `**${firstName}**'s RBI revealed ${currentPronouns.possessive} breathing patterns and now has targeted exercises for ${currentPronouns.possessive} ${extractedGoal}.`
      ];
    }
  } else {
    // Fallback to Anthony's style general messages when no meaningful goal is found
    messageTemplates = [
      `**${firstName}**'s RBI uncovered ${currentPronouns.possessive} breathing patterns and now knows what to work on for ${currentPronouns.possessive} next challenge.`,
      `**${firstName}** discovered ${currentPronouns.possessive} breathing mechanics and has a clear plan to improve ${currentPronouns.possessive} performance.`,
      `**${firstName}** learned ${currentPronouns.possessive} breathing profile and now knows exactly what to focus on.`,
      `**${firstName}** found out ${currentPronouns.possessive} breathing efficiency and has a protocol to train it daily.`,
      `**${firstName}**'s RBI revealed ${currentPronouns.possessive} breathing patterns and now has targeted exercises to boost ${currentPronouns.possessive} potential.`,
      `**${firstName}** uncovered ${currentPronouns.possessive} breathing mechanics and now knows which drills to prioritize.`,
      `**${firstName}** discovered ${currentPronouns.possessive} breathing profile and has a personalized plan to improve ${currentPronouns.possessive} endurance.`,
      `**${firstName}** learned ${currentPronouns.possessive} breathing efficiency and now has a clear protocol to train it.`,
      `**${firstName}** found out ${currentPronouns.possessive} breathing patterns and now knows what to work on for ${currentPronouns.possessive} next expedition.`,
      `**${firstName}**'s RBI gave ${currentPronouns.object} the missing link for why ${currentPronouns.possessive} breathing felt limited.`
    ];
  }
  
  // Randomly select a template
  return messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
};

// Function to fetch latest signups from our API
const fetchLatestSignups = async () => {
  try {
    const response = await fetch('/api/latest-signups');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { 
      names: data.names || [], 
      totalCount: data.totalCount || 0,
      goals: data.goals || []
    };
  } catch (error) {
    console.error('Error fetching latest signups:', error);
    return { names: [], totalCount: 0, goals: [] };
  }
};

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [modalLead, setModalLead] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  // Fallback social proof messages (used when live data is unavailable)
  const fallbackSocialProofData = [
    { name: "Claire", gender: "female", message: "**Claire** just discovered her RBI score and uncovered breathing patterns that were limiting her performance." },
    { name: "David", gender: "male", message: "**David** completed the Recal Breath Assessment and now knows exactly what to work on for his next challenge." },
    { name: "Mark", gender: "male", message: "**Mark** found out his breathing efficiency score and has a personalized plan to improve his endurance." },
    { name: "Ravi", gender: "male", message: "**Ravi** took the assessment and discovered hidden factors affecting his recovery and focus." },
    { name: "Jan", gender: "male", message: "**Jan** just learned his breathing profile and now has targeted exercises to boost his performance." },
    { name: "", gender: "neutral", message: "**32** people have taken the Recal Breath Assessment this week." }
  ];

  const [socialProofData, setSocialProofData] = useState(fallbackSocialProofData);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [peopleCount, setPeopleCount] = useState(32);
  const [isLiveData, setIsLiveData] = useState(false);
  // Fetch live data on component mount and periodically
  useEffect(() => {
    const fetchData = async () => {
      const { names, totalCount, goals } = await fetchLatestSignups();
      if (names && names.length > 0) {
        setIsLiveData(true);
        setPeopleCount(totalCount); // Use total count, not just the 5 names
        
        // Create testimonials from the real names and goals
        const testimonials = names.map((fullName: string, index: number) => {
          const firstName = fullName.split(' ')[0] || 'Someone';
          const gender = detectGender(firstName);
          const goal = goals[index] || ''; // Get corresponding goal
          const message = generateTestimonialMessage(firstName, gender, goal);
          
          return {
            name: firstName,
            gender,
            message
          };
        });
        
        // Add the count message with total count
        testimonials.push({
          name: "",
          gender: "neutral",
          message: `**${totalCount}** people have taken the Recal Breath Assessment this week.`
        });
        
        setSocialProofData(testimonials);
      }
    };

    // Fetch immediately
    fetchData();

    // Then fetch every 2 minutes to keep data fresh
    const dataInterval = setInterval(fetchData, 120000);
    return () => clearInterval(dataInterval);
  }, []);

  // Cycle through messages every 6 seconds (slower for better readability)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % socialProofData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [socialProofData.length]);

  // Increment people count slowly (only for fallback data)
  useEffect(() => {
    if (!isLiveData) {
      const countInterval = setInterval(() => {
        setPeopleCount(prev => prev + 1);
      }, 300000); // Every 5 minutes
      return () => clearInterval(countInterval);
    }
  }, [isLiveData]);

  // Get current message with updated count and render bold text
  const getCurrentMessage = () => {
    const current = socialProofData[currentMessageIndex];
    let message = current.message;
    
    if (current.message.includes("people have taken")) {
      message = `**${peopleCount}** people have taken the Recal Breath Assessment this week.`;
    }
    
    // Convert markdown bold to HTML with styling
    return message.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#A2C2C7] font-extrabold">$1</strong>');
  };

  // Add a visual indicator for live data
  const getStatusIndicator = () => {
    if (isLiveData) {
      return <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-green-500 animate-pulse" style={{ animation: 'pulse 2s infinite' }}></div>;
    }
    return <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-amber-500 animate-pulse" style={{ animation: 'pulse 2s infinite' }}></div>;
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

    gtag.event({
      action: 'start_assessment_modal_open',
      category: 'Conversion',
      label: 'Hero Modal CTA',
      value: 1,
    });

    setModalLead({
      firstName: formData.name,
      lastName: '',
      email: formData.email,
    });

    setIsModalOpen(true);
  };

  return (
    <>
    <div className="min-h-screen bg-[#02060f] text-slate-100 relative font-sans" style={{
      backgroundImage: "url('https://storage.googleapis.com/msgsndr/dcxYZfbVVQ2mVgy68ts5/media/699369f51eb3cf934fd3908b.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed"
    }}>
      {/* Dark overlay to ensure text readability */}
      <div className="absolute inset-0 bg-[#02060f]/85 z-0 pointer-events-none"></div>

      {/* Header - Simple Centered Logo (similar to GHL) */}
      <header className="w-full relative z-10 px-4 pt-10">
        <div className="flex justify-center items-center">
          <Image
            src="/Logo Version A White - Recal_no background_small.png"
            alt="Recal Logo"
            width={160}
            height={80}
            className="h-16 w-auto"
          />
        </div>
      </header>

      {/* Main Body Section enclosed in GHL-style cards */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative z-10">

        {/* Card 1: Hero Section & Form */}
        <div className="bg-[#040D1A]/93 backdrop-blur-xl border border-[#A2C2C7]/22 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            
            {/* Left Column - Hero Content with Form */}
            <div className="space-y-8 flex flex-col justify-start lg:justify-between lg:h-full">
              <div className="space-y-6">
                {/* H1 Heading */}
                <h1 className="text-[36px] lg:text-6xl font-bold lg:leading-tight" style={{ color: '#ffffff', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', lineHeight: '1.15' }}>
                  Is Your Breathing Holding You Back?<br />
                  <span style={{ color: '#A2C2C7' }}>Find out in 5 Minutes.</span>
                </h1>
                
                {/* Subtitle */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-1">
                    <svg className="w-5 h-5 flex-shrink-0 text-[#A2C2C7]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <svg className="w-5 h-5 flex-shrink-0 text-[#A2C2C7]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-[16px] lg:text-lg text-slate-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Take our <span className="text-[#A2C2C7] font-semibold">free</span>, science-backed assessment to uncover the hidden metrics limiting your endurance, recovery, and focus.
                  </p>
                </div>
              </div>
              
              {/* Hero Form Container (Nested Card) */}
              <div className="bg-[#010307]/50 rounded-2xl border border-white/5 p-6 shadow-inner relative overflow-hidden h-[330px] flex flex-col justify-between">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#A2C2C7]/30 focus:border-[#A2C2C7] bg-[#010307]/60 text-white placeholder-slate-400 focus:outline-none transition-all"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '16px', height: '48px' }}
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#A2C2C7]/30 focus:border-[#A2C2C7] bg-[#010307]/60 text-white placeholder-slate-400 focus:outline-none transition-all"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '16px', height: '48px' }}
                    required
                  />
                  <button
                    type="submit"
                    id="diagnostic-cta-start"
                    data-gtm="diagnostic-cta-start"
                    className="w-full py-3 px-6 rounded-xl font-bold text-white bg-[#0A4367] hover:bg-[#105987] transition-all border border-[#A2C2C7]/30 shadow-md hover:shadow-[#A2C2C7]/15 cursor-pointer flex items-center justify-center"
                    style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic', fontSize: '16px', height: '48px' }}
                  >
                    Start My Assessment
                  </button>
                  <div className="space-y-1">
                    <p className="text-center text-xs text-slate-400">
                      Takes 5-10 minutes on average to complete
                    </p>
                    <p className="text-center text-[15px] lg:text-sm italic text-[#A2C2C7]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '500', fontStyle: 'italic' }}>
                      Your info will never be shared with anyone.
                    </p>
                  </div>
                </form>
              </div>

              {/* Personal Video Feedback Card (Mobile Only) */}
              <div className="block lg:hidden w-full bg-[#010307]/50 border border-white/5 rounded-2xl p-6 shadow-inner flex flex-col justify-between hover:border-[#A2C2C7]/30 transition-all duration-300 hover:shadow-[#A2C2C7]/5 relative overflow-hidden mt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="relative">
                        <Image
                          src="https://storage.googleapis.com/msgsndr/dcxYZfbVVQ2mVgy68ts5/media/69936ec209780942785c972d.jpeg"
                          alt="Coach Anthony"
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#A2C2C7] shadow-md transition-transform duration-300 hover:scale-105"
                          unoptimized
                        />
                        {/* Video Symbol Badge */}
                        <span className="absolute -top-1.5 -right-1.5 bg-[#A2C2C7] text-[#040D1A] rounded-full p-1.5 shadow-md border border-[#040D1A]">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <p className="text-[10px] font-black text-[#A2C2C7] tracking-widest uppercase bg-[#A2C2C7]/10 px-2 py-0.5 rounded w-max">Personal Video Feedback</p>
                      <h3 className="text-base font-bold text-white leading-tight">Custom Review by Coach Anthony</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Complete your test and get personalized video feedback from Coach Anthony within 24 hours.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 mt-3">
                    <p className="text-[10px] font-bold text-[#A2C2C7] uppercase tracking-wider mb-2">What you receive:</p>
                    <ul className="text-[11px] text-slate-300 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-[#A2C2C7] mt-0.5">📹</span>
                        <span><strong>60-Second Video Review</strong> of your breathing metrics</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#A2C2C7] mt-0.5">🔍</span>
                        <span><strong>Technique check</strong> to find your performance bottleneck</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#A2C2C7] mt-0.5">🏔️</span>
                        <span><strong>Customized breath protocol</strong> for your altitude goals</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#A2C2C7] mt-0.5">💬</span>
                        <span><strong>Direct Q&A access</strong> to Coach Anthony for follow-up support</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image & Social Proof */}
            <div className="hidden lg:flex flex-col justify-between items-center lg:h-full space-y-6">
              <div className="space-y-6 w-full flex flex-col items-center">
                <div className="w-full max-w-sm h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                  <Image
                    src="/hero-image.png"
                    alt="Recal Breath Assessment App"
                    width={300}
                    height={420}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                </div>
                
                {/* Social Proof Widget (Nested Glass) */}
                <div className="w-full max-w-sm bg-[#010307]/50 border border-white/5 rounded-xl p-4 shadow-inner h-24 flex items-center">
                  <div className="flex items-start space-x-3 w-full">
                    {getStatusIndicator()}
                    <p 
                      className="text-sm text-slate-300 leading-relaxed transition-all duration-500 overflow-hidden" 
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                      dangerouslySetInnerHTML={{ __html: getCurrentMessage() }}
                    />
                  </div>
                </div>
              </div>

              {/* Personal Video Feedback Card (Desktop) */}
              <div className="w-full max-w-sm bg-[#010307]/50 border border-white/5 rounded-2xl p-5 shadow-inner flex flex-col justify-between hover:border-[#A2C2C7]/30 transition-all duration-300 hover:shadow-[#A2C2C7]/5 h-[330px] relative overflow-hidden flex-shrink-0">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="relative">
                      <Image
                        src="https://storage.googleapis.com/msgsndr/dcxYZfbVVQ2mVgy68ts5/media/69936ec209780942785c972d.jpeg"
                        alt="Coach Anthony"
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#A2C2C7] shadow-md transition-transform duration-300 hover:scale-105"
                        unoptimized
                      />
                      {/* Video Symbol Badge */}
                      <span className="absolute -top-1.5 -right-1.5 bg-[#A2C2C7] text-[#040D1A] rounded-full p-1.5 shadow-md border border-[#040D1A]">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <p className="text-[10px] font-black text-[#A2C2C7] tracking-widest uppercase bg-[#A2C2C7]/10 px-2 py-0.5 rounded w-max">Personal Video Feedback</p>
                    <h3 className="text-base font-bold text-white leading-tight">Custom Review by Coach Anthony</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Complete your test and get personalized video feedback from Coach Anthony within 24 hours.
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 mt-3">
                  <p className="text-[10px] font-bold text-[#A2C2C7] uppercase tracking-wider mb-1.5">What you receive:</p>
                  <ul className="text-[11px] text-slate-300 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-[#A2C2C7] mt-0.5">📹</span>
                      <span><strong>60-Second Video Review</strong> of your breathing metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#A2C2C7] mt-0.5">🔍</span>
                      <span><strong>Technique check</strong> to find your performance bottleneck</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#A2C2C7] mt-0.5">🏔️</span>
                      <span><strong>Customized breath protocol</strong> for your altitude goals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#A2C2C7] mt-0.5">💬</span>
                      <span><strong>Direct Q&A access</strong> to Coach Anthony for follow-up support</span>
                    </li>
                  </ul>
                </div>

                <div className="text-[10px] text-slate-400 mt-3 flex items-center justify-between">
                  <span>⚡ Next review batch starting soon</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Active Now
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Card 2: Mobile Trusted By Section */}
        <div className="block lg:hidden bg-[#040D1A]/93 backdrop-blur-xl border border-[#A2C2C7]/22 rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#ffffff', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
              Trusted By Athletes of:
            </h2>
          </div>
          
          <div className="bg-[#010307]/50 rounded-2xl border border-white/5 p-4 shadow-inner overflow-hidden">
            <div className="flex items-center justify-center h-24">
              <div className="flex items-center space-x-4 animate-scroll">
                {partnerLogos.slice(0, 8).map((logo, index) => (
                  <div key={`mobile-first-${index}`} className="flex-shrink-0 flex items-center justify-center h-16 w-16">
                    <Image
                      src={`/assets/${logo}`}
                      alt={`Partner ${index + 1}`}
                      width={60}
                      height={60}
                      className="w-full h-full object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Desktop Trusted By Section */}
        <div className="hidden lg:block bg-[#040D1A]/93 backdrop-blur-xl border border-[#A2C2C7]/22 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-6" style={{ color: '#ffffff', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
              Trusted By Athletes of:
            </h2>
          </div>
          
          <div className="bg-[#010307]/50 rounded-2xl border border-white/5 p-8 shadow-inner overflow-hidden">
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-8 animate-scroll">
                {partnerLogos.map((logo, index) => (
                  <div key={`first-${index}`} className="flex-shrink-0 flex items-center justify-center h-36 w-36">
                    <Image
                      src={`/assets/${logo}`}
                      alt={`Partner ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                ))}
                {partnerLogos.map((logo, index) => (
                  <div key={`second-${index}`} className="flex-shrink-0 flex items-center justify-center h-36 w-36">
                    <Image
                      src={`/assets/${logo}`}
                      alt={`Partner ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-full object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Science Section */}
        <div className="bg-[#040D1A]/93 backdrop-blur-xl border border-[#A2C2C7]/22 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch min-h-[600px]">
            
            {/* Left Column */}
            <div className="space-y-8 flex flex-col justify-between h-full">
              <h2 className="text-[30px] lg:text-3xl font-bold leading-tight" style={{ color: '#ffffff', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                Get a Personalized Breakdown of your Breathing Profile
              </h2>
              
              {/* YouTube Video */}
              <div className="w-full">
                <div
                  className="w-full aspect-video cursor-pointer rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#010307]/50"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="rounded-xl p-4 md:p-6 shadow-inner border border-white/5 bg-[#010307]/50">
                  <div className="text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full flex items-center justify-center bg-[#0A4367]/20 border border-[#A2C2C7]/15">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-[#A2C2C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="6"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                      </svg>
                    </div>
                    <h3 className="text-xs md:text-sm font-semibold text-slate-100 uppercase tracking-wider leading-snug" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Find Your Performance Bottleneck
                    </h3>
                  </div>
                </div>
                
                <div className="rounded-xl p-4 md:p-6 shadow-inner border border-white/5 bg-[#010307]/50">
                  <div className="text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full flex items-center justify-center bg-[#0A4367]/20 border border-[#A2C2C7]/15">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-[#A2C2C7]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeMiterlimit="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.37 36C22.82 30.75 27.89 27 33.73 27.62C39.29 28.21 43.71 32.9 43.99 38.48C44.06 39.95 43.86 41.36 43.43 42.67C43.17 43.47 42.39 44 41.54 44H11.7584C6.71004 44 2.92371 39.3814 3.91377 34.4311L9.99994 4H21.9999L25.9999 11L17.43 17.13L14.9999 14"></path>
                        <path d="M17.4399 17.13L22 34"></path>
                      </svg>
                    </div>
                    <h3 className="text-xs md:text-sm font-semibold text-slate-100 uppercase tracking-wider leading-snug" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Unlock Your Hidden Strengths
                    </h3>
                  </div>
                </div>
                
                <div className="rounded-xl p-4 md:p-6 shadow-inner border border-white/5 bg-[#010307]/50">
                  <div className="text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full flex items-center justify-center bg-[#0A4367]/20 border border-[#A2C2C7]/15">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-[#A2C2C7]" viewBox="0 0 32 32" fill="currentColor">
                        <path d="M15.999 1.129c-8.812 0-15.98 7.169-15.98 15.981 0 5.536 2.803 10.6 7.497 13.544 0.467 0.296 1.084 0.152 1.378-0.316s0.152-1.085-0.316-1.378c-1.691-1.061-3.095-2.439-4.17-4.027l1.048-0.605c0.478-0.276 0.643-0.887 0.366-1.366-0.277-0.48-0.889-0.642-1.366-0.366l-1.050 0.606c-0.763-1.579-1.228-3.306-1.353-5.107h1.113c0.552 0 1-0.448 1-1s-0.447-1-1-1h-1.108c0.132-1.834 0.618-3.572 1.393-5.143l1.005 0.58c0.157 0.091 0.329 0.134 0.499 0.134 0.346 0 0.681-0.179 0.867-0.5 0.277-0.479 0.112-1.090-0.366-1.366l-0.995-0.574c1.003-1.463 2.277-2.728 3.75-3.719l0.563 0.975c0.185 0.322 0.521 0.5 0.867 0.5 0.17 0 0.342-0.043 0.499-0.134 0.479-0.277 0.643-0.887 0.366-1.366l-0.561-0.971c1.542-0.744 3.24-1.208 5.030-1.338v1.246c0 0.553 0.447 1 1 1s1-0.447 1-1v-1.25c1.831 0.127 3.567 0.606 5.137 1.373l-0.543 0.939c-0.276 0.479-0.113 1.090 0.366 1.366 0.157 0.091 0.329 0.134 0.499 0.134 0.346 0 0.681-0.178 0.867-0.5l0.54-0.936c1.459 0.993 2.721 2.255 3.715 3.713l-0.936 0.541c-0.479 0.277-0.642 0.887-0.366 1.366 0.186 0.322 0.521 0.5 0.867 0.5 0.17 0 0.342-0.043 0.499-0.134l0.942-0.543c0.768 1.571 1.248 3.307 1.377 5.139h-1.098c-0.552 0-1 0.448-1 1s0.448 1 1 1h1.098c-0.127 1.777-0.581 3.482-1.328 5.041l-0.99-0.572c-0.477-0.276-1.091-0.111-1.366 0.366-0.276 0.479-0.113 1.090 0.366 1.366l0.993 0.573c-1.097 1.633-2.545 3.044-4.292 4.119-0.471 0.29-0.616 0.907-0.327 1.376 0.189 0.306 0.517 0.476 0.852 0.476 0.178 0 0.36-0.048 0.523-0.148 4.764-2.934 7.608-8.024 7.608-13.614 0-8.811-7.169-15.98-15.98-15.98zM23.378 13.992c0.478-0.277 0.642-0.887 0.366-1.366s-0.888-0.642-1.366-0.366l-5.432 3.136c-0.29-0.164-0.62-0.265-0.977-0.265-1.102 0-1.995 0.893-1.995 1.994 0 1.102 0.893 1.995 1.995 1.995s1.995-0.893 1.995-1.995c0-0.002-0-0.005-0-0.007z"></path>
                      </svg>
                    </div>
                    <h3 className="text-xs md:text-sm font-semibold text-slate-100 uppercase tracking-wider leading-snug" style={{ fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                      Get an Actionable Score
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-12 flex flex-col justify-center h-full">
              <h3 className="text-[30px] lg:text-5xl font-bold leading-tight" style={{ color: '#ffffff', fontFamily: 'Rogue Sans Ext, sans-serif', fontStyle: 'italic' }}>
                The Science Behind the Recal Breath Index
              </h3>
              <p className="text-[16px] lg:text-lg leading-relaxed text-slate-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
                The Recal Breath Assessment was created by Anthony Lorubbio after years of working with athletes at altitude and in endurance sports. It measures your breathing performance across five proven tests to give you a complete profile — what we call your <strong className="text-[#A2C2C7] font-bold">Recal Breath Index.</strong>
              </p>
              <p className="text-[16px] lg:text-lg leading-relaxed text-slate-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
                This isn't just about lung capacity — it's about efficiency, endurance, and mechanics. The results show you where you're strong, where you need work, and which protocols can help you improve.
              </p>
              <p className="text-[16px] lg:text-lg leading-relaxed font-bold text-[#A2C2C7]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Your breathing is one of the most overlooked factors in performance. The Recal Breath Assessment makes it measurable — and actionable.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#010307]/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs text-slate-500 italic">
              © 2025 Recal Training. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>



    </div>
    <DiagnosticModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      initialLead={modalLead}
    />
    </>
  );
}
