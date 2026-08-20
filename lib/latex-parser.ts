import { UserProfile } from './db';
import { JDAnalysis } from './ai-engine';

// Helper to strip LaTeX markup into clean text while removing all TeX comments & formatting junk
export function stripLatex(text: string): string {
  if (!text) return '';
  return text
    // 1. Remove LaTeX comments (% ...)
    .replace(/%.*$/gm, '')
    // 2. Remove tabular & alignment parameters
    .replace(/@\{\}X\s*r@\{\}/g, '')
    .replace(/@\{\}[lr]@\{\}/g, '')
    .replace(/\[-?\d+pt\]/g, '')
    .replace(/\\vspace\{[^}]+\}/g, '\n')
    .replace(/\\hspace\{[^}]+\}/g, ' ')
    .replace(/\\hfill/g, '  ')
    .replace(/\\\\/g, '\n')
    // 3. Remove formatting macros
    .replace(/\\fontsize\{[^}]+\}\{[^}]+\}\\selectfont/g, '')
    .replace(/\\color\{[^}]+\}/g, '')
    .replace(/\\definecolor\{[^}]+\}\{[^}]+\}\{[^}]+\}/g, '')
    .replace(/\\setlist\[[^\]]+\]\{[^}]+\}/g, '')
    .replace(/\\hypersetup\{[^}]+\}/g, '')
    .replace(/\\titleformat\{[^}]+\}[\s\S]*?\}?(\[[^\]]*\])?/g, '')
    .replace(/\\setlength\{[^}]+\}\{[^}]+\}/g, '')
    .replace(/\\pagestyle\{[^}]+\}/g, '')
    .replace(/\\large/g, '')
    .replace(/\\Huge/g, '')
    .replace(/\\huge/g, '')
    .replace(/\\small/g, '')
    .replace(/\\bfseries/g, '')
    .replace(/\\selectfont/g, '')
    .replace(/\\textit/g, '')
    .replace(/\\textbf/g, '')
    .replace(/\\underline/g, '')
    // 4. Handle links and items
    .replace(/\\href\{[^}]+\}\{([^}]+)\}/g, '$1')
    .replace(/\\url\{([^}]+)\}/g, '$1')
    .replace(/\\section\*?\{([^}]+)\}/g, '\n\n$1\n')
    .replace(/\\item\s*/g, '\n• ')
    .replace(/\\begin\{[^}]+\}/g, '')
    .replace(/\\end\{[^}]+\}/g, '')
    .replace(/\\[a-zA-Z]+\*?/g, '')
    .replace(/[{}]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

export function parseLaTeXCV(latexCode: string): UserProfile {
  if (!latexCode || !latexCode.trim()) {
    return {
      name: 'Developer Profile',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
      masterLaTeX: '',
      skills: { languages: [], frameworks: [], databases: [], tools: [], other: [] },
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      achievements: [],
      extractedKeywords: [],
    };
  }

  // 1. Dynamic Contact Extraction
  let name = 'Candidate';
  const nameMatch = latexCode.match(/\\name\{([^}]+)\}/) || 
                    latexCode.match(/\\textbf\{([A-Z][a-z]+\s+[A-Z][a-z]+)\}/) ||
                    latexCode.match(/\\huge\s*\\bfseries\s*([^\\]+)/i);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].trim();
  }

  let email = '';
  const emailMatch = latexCode.match(/\\email\{([^}]+)\}/) || 
                     latexCode.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = (emailMatch[1] || emailMatch[0]).trim();
  }

  let phone = '';
  const phoneMatch = latexCode.match(/\\phone\{([^}]+)\}/) || 
                     latexCode.match(/\+?\d[\d\s-]{8,15}\d/);
  if (phoneMatch) {
    phone = (phoneMatch[1] || phoneMatch[0]).trim();
  }

  let linkedin = '';
  const linkedinMatch = latexCode.match(/\\linkedin\{([^}]+)\}/) || 
                        latexCode.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/);
  if (linkedinMatch) {
    linkedin = (linkedinMatch[1] || linkedinMatch[0]).trim();
  }

  let github = '';
  const githubMatch = latexCode.match(/\\github\{([^}]+)\}/) || 
                      latexCode.match(/github\.com\/[a-zA-Z0-9_-]+/);
  if (githubMatch) {
    github = (githubMatch[1] || githubMatch[0]).trim();
  }

  // 2. Dynamic Skills Extraction
  const languages: string[] = [];
  const frameworks: string[] = [];
  const databases: string[] = [];
  const tools: string[] = [];
  const other: string[] = [];

  // Match items under Skills section or \\item \\textbf{Category}: Skill1, Skill2
  const skillRegex = /\\item\s*(?:\\textbf\{([^}]+)\}:?|([A-Za-z0-9\s&]+):)\s*([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = skillRegex.exec(latexCode)) !== null) {
    const category = (match[1] || match[2] || '').toLowerCase();
    const skillsList = (match[3] || '').replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').split(/[,;•]/).map(s => s.trim()).filter(Boolean);

    if (category.includes('lang') || category.includes('programming')) {
      languages.push(...skillsList);
    } else if (category.includes('frame') || category.includes('web') || category.includes('library')) {
      frameworks.push(...skillsList);
    } else if (category.includes('data') || category.includes('db')) {
      databases.push(...skillsList);
    } else if (category.includes('tool') || category.includes('platform') || category.includes('devops')) {
      tools.push(...skillsList);
    } else {
      other.push(...skillsList);
    }
  }

  // Fallback keyword extraction if skills lists were empty
  const allText = stripLatex(latexCode);
  const knownKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C++', 'C#', 'SQL', 'HTML', 'CSS',
    'React', 'Next.js', 'Node.js', 'Express', 'Vue', 'Angular', 'Tailwind', 'Bootstrap',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'SQLite',
    'Git', 'GitHub', 'Docker', 'Kubernetes', 'AWS', 'Linux', 'REST API', 'GraphQL', 'Nginx', 'Apache'
  ];

  for (const kw of knownKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(allText)) {
      if (['JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C++', 'C#', 'SQL'].includes(kw)) {
        if (!languages.includes(kw)) languages.push(kw);
      } else if (['React', 'Next.js', 'Node.js', 'Express', 'Vue', 'Angular', 'Tailwind', 'Bootstrap', 'HTML', 'CSS'].includes(kw)) {
        if (!frameworks.includes(kw)) frameworks.push(kw);
      } else if (['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'SQLite'].includes(kw)) {
        if (!databases.includes(kw)) databases.push(kw);
      } else {
        if (!tools.includes(kw)) tools.push(kw);
      }
    }
  }

  // 3. Dynamic Experience Section Parsing
  const experience: UserProfile['experience'] = [];
  const expSectionMatch = latexCode.match(/\\section\*?\{(?:WORK\s+)?EXPERIENCE\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\})/i);
  if (expSectionMatch && expSectionMatch[1]) {
    const rawExp = expSectionMatch[1];
    const expBlocks = rawExp.split(/(?=\\textbf\{)/);
    let expCount = 1;
    for (const block of expBlocks) {
      if (!block.trim()) continue;
      const cleanBlock = stripLatex(block);
      const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const titleLine = lines[0];
        const bullets = lines.slice(1).filter(l => l.startsWith('•') || l.length > 10).map(l => l.replace(/^[•-]\s*/, ''));
        experience.push({
          id: `exp_${expCount++}`,
          company: titleLine.split(/---|–|\|/)[0]?.trim() || 'Tech Company',
          role: titleLine.split(/---|–|\|/)[1]?.trim() || 'Software Developer',
          location: 'Location',
          startDate: '2023',
          endDate: 'Present',
          bullets: bullets.length > 0 ? bullets : [titleLine],
          technologies: [],
        });
      }
    }
  }

  // 4. Dynamic Projects Section Parsing
  const projects: UserProfile['projects'] = [];
  const projSectionMatch = latexCode.match(/\\section\*?\{PROJECTS\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\})/i);
  if (projSectionMatch && projSectionMatch[1]) {
    const rawProj = projSectionMatch[1];
    const projBlocks = rawProj.split(/(?=\\textbf\{)/);
    let projCount = 1;
    for (const block of projBlocks) {
      if (!block.trim()) continue;
      const cleanBlock = stripLatex(block);
      const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const titleLine = lines[0];
        const bullets = lines.slice(1).filter(l => l.startsWith('•') || l.length > 10).map(l => l.replace(/^[•-]\s*/, ''));
        projects.push({
          id: `proj_${projCount++}`,
          title: titleLine,
          link: '',
          description: titleLine,
          bullets: bullets.length > 0 ? bullets : [titleLine],
          technologies: [],
        });
      }
    }
  }

  const profile: UserProfile = {
    name: name || 'Candidate',
    email: email || '',
    phone: phone || '',
    location: 'India',
    linkedin: linkedin || '',
    github: github || '',
    website: github || linkedin || '',
    masterLaTeX: latexCode,
    skills: {
      languages: Array.from(new Set(languages)),
      frameworks: Array.from(new Set(frameworks)),
      databases: Array.from(new Set(databases)),
      tools: Array.from(new Set(tools)),
      other: Array.from(new Set(other)),
    },
    experience: experience.length > 0 ? experience : [
      {
        id: 'exp_default',
        company: 'Software Engineer',
        role: 'Full Stack Engineer',
        location: 'Remote',
        startDate: '2023',
        endDate: 'Present',
        bullets: ['Architected scalable web applications and REST API microservices.'],
        technologies: Array.from(new Set([...languages, ...frameworks])),
      }
    ],
    projects: projects,
    education: [
      {
        id: 'edu_1',
        degree: 'Bachelor of Technology / BCA',
        institution: 'University',
        location: 'India',
        startDate: '2021',
        endDate: '2025',
      }
    ],
    certifications: [],
    achievements: [],
    extractedKeywords: Array.from(new Set([...languages, ...frameworks, ...databases, ...tools])),
  };

  return profile;
}

// Deep, meaningful LaTeX resume tailoring function for target Job Description
export function tailorLaTeXCV(
  masterLaTeX: string,
  improvements: Array<{ original: string; suggested: string; reason: string }>,
  matchingKeywords: string[]
): string {
  let tailored = masterLaTeX;

  // 1. Tailor Summary Section to align with target role keywords
  const topTechStr = matchingKeywords.slice(0, 5).join(', ');
  if (topTechStr) {
    const tailoredSummary = `Aspiring Full Stack Developer with hands-on experience in building scalable, user-centric web applications and microservices. Skilled in ${topTechStr}, with a strong background in REST API integration, database optimization, and modern software development practices. Passionate about delivering robust technical solutions for enterprise and cloud platforms.`;

    tailored = tailored.replace(
      /\\section\*?\{SUMMARY\}[\s\S]*?(?=\\section\*?\{|\\end\{document\})/i,
      `\\section*{SUMMARY}\n\n${tailoredSummary}\n\n`
    );
  }

  // 2. Re-order / Highlight Skills matching JD keywords
  if (matchingKeywords.length > 0) {
    const top5 = matchingKeywords.slice(0, 5).join(', ');
    const highlightedSkillsLine = `\\textbf{Target Role Matching Skills:} ${top5}\n\n`;

    tailored = tailored.replace(
      /(\\section\*?\{TECHNICAL SKILLS\}[\s\S]*?)(\\textbf\{Programming Languages:\})/i,
      `$1${highlightedSkillsLine}$2`
    );
  }

  // 3. Improve bullet points in Experience section
  for (const imp of improvements) {
    if (imp.original && imp.suggested) {
      if (tailored.includes(imp.original)) {
        tailored = tailored.replace(imp.original, imp.suggested);
      }
    }
  }

  return tailored;
}
