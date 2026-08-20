import { UserProfile } from './db';
import { stripLatex } from './latex-parser';

export interface JDAnalysis {
  requiredSkills: string[];
  preferredSkills: string[];
  technologies: string[];
  responsibilities: string[];
  experienceRequirements: string[];
  atsKeywords: string[];
  matchingSkills: string[];
  missingSkills: string[];
  matchScore: {
    overall: number;
    skills: number;
    experience: number;
    project: number;
    keyword: number;
  };
}

export interface CVAudit {
  keep: string[];
  reduce: string[];
  improve: Array<{ original: string; suggested: string; reason: string }>;
  add: string[];
  missingSkills: Array<{ skill: string; recommendation: string }>;
}

const COMMON_TECH_LIST = [
  'React', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express', 'FastAPI', 'Django',
  'Flask', 'Python', 'TypeScript', 'JavaScript', 'C++', 'C', 'Java', 'Go', 'Rust', 'PHP',
  'SQL', 'PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'SQLite', 'GraphQL', 'REST API',
  'AWS', 'Docker', 'Kubernetes', 'GCP', 'Azure', 'Linux', 'Git', 'CI/CD', 'Microservices',
  'Unit Testing', 'Jest', 'PyTorch', 'TensorFlow', 'System Design', 'Agile', 'Scrum'
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function analyzeJobDescription(jdText: string, userProfile?: UserProfile | null): JDAnalysis {
  const lowerJD = jdText.toLowerCase();

  // Extract detected technologies safely
  const detectedTech = COMMON_TECH_LIST.filter(tech => {
    try {
      const safeTech = escapeRegExp(tech);
      const re = new RegExp(`\\b${safeTech}\\b`, 'i');
      return re.test(jdText);
    } catch {
      return false;
    }
  });

  const requiredSkills = detectedTech.slice(0, Math.ceil(detectedTech.length * 0.7));
  const preferredSkills = detectedTech.slice(Math.ceil(detectedTech.length * 0.7));

  // Extract candidate's existing skills
  const userSkillsSet = new Set<string>();
  if (userProfile) {
    userProfile.skills.languages.forEach(s => userSkillsSet.add(s.toLowerCase()));
    userProfile.skills.frameworks.forEach(s => userSkillsSet.add(s.toLowerCase()));
    userProfile.skills.databases.forEach(s => userSkillsSet.add(s.toLowerCase()));
    userProfile.skills.tools.forEach(s => userSkillsSet.add(s.toLowerCase()));
    if (userProfile.extractedKeywords) {
      userProfile.extractedKeywords.forEach(s => userSkillsSet.add(s.toLowerCase()));
    }
  }

  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  detectedTech.forEach(tech => {
    if (userSkillsSet.has(tech.toLowerCase())) {
      matchingSkills.push(tech);
    } else {
      missingSkills.push(tech);
    }
  });

  // Extract responsibilities heuristics
  const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);
  const responsibilities = lines
    .filter(l => l.length > 25 && (l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /develop|build|design|manage|lead|collaborate/i.test(l)))
    .slice(0, 5);

  const experienceRequirements = lines
    .filter(l => /\b\d+\+?\s*years?\b/i.test(l) || /bachelor|master|degree/i.test(l))
    .slice(0, 3);

  // Match score calculation
  const totalTechCount = detectedTech.length || 1;
  const matchRatio = matchingSkills.length / totalTechCount;

  const skillsScore = Math.min(98, Math.max(45, Math.round(matchRatio * 100)));
  const experienceScore = Math.min(95, Math.max(50, Math.round(skillsScore * 0.9 + 5)));
  const projectScore = Math.min(92, Math.max(55, Math.round(skillsScore * 0.85 + 10)));
  const keywordScore = Math.min(96, Math.max(50, Math.round(skillsScore * 0.95 + 2)));
  const overallScore = Math.round((skillsScore * 0.35) + (experienceScore * 0.25) + (projectScore * 0.2) + (keywordScore * 0.2));

  return {
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : ['Software Engineering', 'Problem Solving', 'System Architecture'],
    preferredSkills: preferredSkills.length > 0 ? preferredSkills : ['Cloud Infrastructure', 'Agile Methodologies'],
    technologies: detectedTech.length > 0 ? detectedTech : ['Full-Stack Web Development', 'REST APIs', 'Git'],
    responsibilities: responsibilities.length > 0 ? responsibilities : ['Design, develop and maintain scalable web applications and microservices.', 'Collaborate with cross-functional teams to deliver high quality features.'],
    experienceRequirements: experienceRequirements.length > 0 ? experienceRequirements : ['3+ years of relevant experience in software engineering'],
    atsKeywords: detectedTech,
    matchingSkills,
    missingSkills,
    matchScore: {
      overall: overallScore,
      skills: skillsScore,
      experience: experienceScore,
      project: projectScore,
      keyword: keywordScore,
    },
  };
}

export function auditCVAgainstJD(profile: UserProfile | null, masterLaTeX: string, jdAnalysis: JDAnalysis): CVAudit {
  const keep: string[] = [];
  const reduce: string[] = [];
  const improve: Array<{ original: string; suggested: string; reason: string }> = [];
  const add: string[] = [];
  const missingSkillsRecs: Array<{ skill: string; recommendation: string }> = [];

  if (!profile) {
    return {
      keep: ['Core software engineering achievements and baseline experience.'],
      reduce: ['Irrelevant non-technical bullet points.'],
      improve: [],
      add: [],
      missingSkills: [],
    };
  }

  // 1. Keep relevant profile info
  jdAnalysis.matchingSkills.forEach(tech => {
    keep.push(`Proven expertise in ${tech} (Matches Job Requirements)`);
  });
  if (keep.length === 0) {
    keep.push('Core software engineering background and degree education');
  }

  // 2. Add: Skills the user HAS in their profile that are missing in current resume version
  const userProfileSkills = [
    ...profile.skills.languages,
    ...profile.skills.frameworks,
    ...profile.skills.databases,
    ...profile.skills.tools,
  ];

  userProfileSkills.forEach(skill => {
    const isMatchingJD = jdAnalysis.atsKeywords.some(kw => kw.toLowerCase() === skill.toLowerCase());
    if (isMatchingJD && !masterLaTeX.toLowerCase().includes(skill.toLowerCase())) {
      add.push(`Highlight existing ${skill} skill in the resume summary/skills section`);
    }
  });

  // 3. Improve bullet points to align truthful experience with JD
  if (profile.experience.length > 0 && profile.experience[0].bullets.length > 0) {
    const origBullet = profile.experience[0].bullets[0];
    const topKeywords = jdAnalysis.matchingSkills.slice(0, 3).join(', ');
    const targetTech = topKeywords || 'key framework technologies';
    
    improve.push({
      original: origBullet,
      suggested: `${origBullet} Leveraged ${targetTech} to improve system scalability, code maintainability, and delivery speed.`,
      reason: `Aligns bullet wording with primary target job keywords (${targetTech}).`,
    });
  }

  // 4. Reduce/Remove irrelevant noise
  reduce.push('Non-technical details or older outdated legacy tool references.');

  // 5. Anti-Hallucination Missing Skills recommendations
  jdAnalysis.missingSkills.forEach(missing => {
    missingSkillsRecs.push({
      skill: missing,
      recommendation: `Consider learning/highlighting ${missing} separately. Do NOT add it to the CV as an existing skill since it is not in your master profile.`,
    });
  });

  return {
    keep,
    reduce,
    improve,
    add,
    missingSkills: missingSkillsRecs,
  };
}

export function generateCoverLetter(
  profile: UserProfile | null,
  companyName: string,
  positionTitle: string,
  jdText: string
): { tex: string; text: string } {
  const candidateName = profile?.name || 'Applicant';
  const candidateEmail = profile?.email || 'applicant@email.com';
  const candidatePhone = profile?.phone || '';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const skillsSummary = profile?.skills.frameworks.concat(profile?.skills.languages || []).slice(0, 4).join(', ') || 'software development, system design, and problem solving';

  const plainText = `Dear Hiring Team at ${companyName},

I am writing to express my strong enthusiasm for the ${positionTitle} position at ${companyName}. With a solid foundation in ${skillsSummary} and proven hands-on project delivery experience, I am confident in my ability to make an immediate impact on your team.

Having reviewed the role requirements, I was particularly drawn to your work in scaling performance and building resilient engineering solutions. Throughout my career, I have consistently focused on writing clean, scalable code, optimizing system workflows, and collaborating effectively across teams to deliver robust features.

${companyName}'s emphasis on innovation aligns perfectly with my professional goals. I welcome the opportunity to discuss how my technical expertise and background can support ${companyName}'s goals.

Thank you for your time and consideration.

Sincerely,
${candidateName}
${candidateEmail}${candidatePhone ? ' | ' + candidatePhone : ''}
`;

  const latex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{hyperref}
\\usepackage{parskip}

\\begin{document}
\\thispagestyle{empty}

{\\Large \\textbf{${candidateName}}}\\\\
${candidateEmail} ${candidatePhone ? '| ' + candidatePhone : ''} \\\\
${profile?.linkedin ? '\\url{' + profile.linkedin + '}' : ''}

\\vspace{1em}
\\hfill ${dateStr}

\\textbf{Hiring Manager / Talent Acquisition}\\\\
${companyName}\\\\

\\vspace{1.5em}
\\textbf{Re: Application for ${positionTitle}}

\\vspace{1em}
Dear Hiring Team at ${companyName},

I am writing to express my strong enthusiasm for the \\textbf{${positionTitle}} position at \\textbf{${companyName}}. With a solid foundation in ${skillsSummary} and proven hands-on project delivery experience, I am confident in my ability to make an immediate impact on your engineering team.

Having reviewed the role requirements, I was particularly drawn to your mission and technical roadmap. Throughout my background, I have consistently focused on writing clean, scalable code, optimizing system workflows, and collaborating effectively to deliver robust features.

${companyName}'s emphasis on innovation aligns perfectly with my professional goals. I welcome the opportunity to discuss how my technical expertise and background can support ${companyName}'s growth.

Thank you for your time and consideration.

\\vspace{1.5em}
Sincerely,\\\\
\\vspace{1em}\\\\
\\textbf{${candidateName}}

\\end{document}
`;

  return { tex: latex, text: plainText };
}

export function generateColdEmail(
  recruiterName: string,
  companyName: string,
  roleTitle: string,
  jdText: string,
  profile: UserProfile | null
): { subject: string; body: string } {
  const name = profile?.name || 'Software Engineer Candidate';
  const skills = profile?.skills.languages.slice(0, 3).join(', ') || 'full-stack web development';
  const targetRecruiter = recruiterName || 'Hiring Team';

  const subject = `Application / Inquiry: ${roleTitle} — ${name}`;
  const body = `Hi ${targetRecruiter},

Hope you are having a great week!

I came across the ${roleTitle} role at ${companyName} and was really impressed by what the team is building. 

As a developer with experience in ${skills}, I've built high-performance backend APIs and responsive modern web apps. I believe my technical background aligns closely with what you're looking for in this position.

I've attached my updated Resume for your review. If you have 5 minutes, I'd love to connect and learn more about your engineering team's current focus.

Best regards,
${name}
${profile?.email || ''}
${profile?.linkedin ? 'LinkedIn: ' + profile.linkedin : ''}
`;

  return { subject, body };
}
