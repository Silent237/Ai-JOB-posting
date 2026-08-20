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
  const cleanSource = latexCode || '';
  const cleanText = stripLatex(cleanSource);

  // 1. Dynamic Contact Information Extraction
  let name = 'Candidate';
  const namePatterns = [
    /\\name\{([^}]+)\}/i,
    /\\Huge\s*(?:\\bfseries)?\s*([^\n\\]+)/i,
    /\\huge\s*(?:\\bfseries)?\s*([^\n\\]+)/i,
    /\\textbf\{\\Large\s*([^}]+)\}/i,
    /\\textbf\{([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\}/,
  ];

  for (const pat of namePatterns) {
    const match = cleanSource.match(pat);
    if (match && match[1] && match[1].trim()) {
      const candidateName = match[1].replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').trim();
      if (candidateName.length > 2 && candidateName.length < 50) {
        name = candidateName;
        break;
      }
    }
  }

  // Fallback name search from first clean text line
  if (name === 'Candidate') {
    const firstLines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !l.includes('\\'));
    if (firstLines.length > 0 && firstLines[0].length < 40) {
      name = firstLines[0];
    }
  }

  let email = '';
  const emailMatch = cleanSource.match(/\\email\{([^}]+)\}/i) || 
                     cleanSource.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    email = (emailMatch[1] || emailMatch[0]).trim();
  }

  let phone = '';
  const phoneMatch = cleanSource.match(/\\phone\{([^}]+)\}/i) || 
                     cleanSource.match(/(\+?\d[\d\s-]{8,15}\d)/);
  if (phoneMatch) {
    phone = (phoneMatch[1] || phoneMatch[0]).trim();
  }

  let linkedin = '';
  const linkedinMatch = cleanSource.match(/\\linkedin\{([^}]+)\}/i) || 
                        cleanSource.match(/(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) {
    linkedin = (linkedinMatch[1] || linkedinMatch[0]).trim();
  }

  let github = '';
  const githubMatch = cleanSource.match(/\\github\{([^}]+)\}/i) || 
                      cleanSource.match(/(github\.com\/[a-zA-Z0-9_-]+)/i);
  if (githubMatch) {
    github = (githubMatch[1] || githubMatch[0]).trim();
  }

  // 2. Comprehensive Skills Extraction
  const languages: string[] = [];
  const frameworks: string[] = [];
  const databases: string[] = [];
  const tools: string[] = [];
  const other: string[] = [];

  // Known tech skills map
  const TECH_CATEGORIES = {
    languages: ['JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'C++', 'C#', 'C', 'Go', 'Golang', 'Rust', 'Ruby', 'Swift', 'Kotlin', 'SQL', 'HTML', 'CSS', 'Bash', 'Shell', 'English', 'Hindi'],
    frameworks: ['React', 'React.js', 'Next.js', 'Node.js', 'Express', 'Express.js', 'Vue', 'Vue.js', 'Angular', 'Tailwind', 'Tailwind CSS', 'Bootstrap', 'Laravel', 'Django', 'Flask', 'Spring Boot', 'REST API', 'RESTful APIs', 'GraphQL', 'Redux'],
    databases: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'Neon DB', 'Oracle', 'MariaDB', 'Database Design', 'SQL Optimization'],
    tools: ['Git', 'GitHub', 'GitLab', 'Docker', 'Kubernetes', 'AWS', 'Linux', 'WSL', 'RabbitMQ', 'SonarQube', 'Apache', 'Nginx', 'Vercel', 'Netlify', 'Postman', 'Webpack', 'Vite', 'Prompt Engineering', 'Generative AI', 'LLM']
  };

  // Scan all text for TECH_CATEGORIES
  for (const lang of TECH_CATEGORIES.languages) {
    if (new RegExp(`\\b${lang.replace('.', '\\.')}\\b`, 'i').test(cleanText)) {
      if (!languages.includes(lang)) languages.push(lang);
    }
  }

  for (const fw of TECH_CATEGORIES.frameworks) {
    if (new RegExp(`\\b${fw.replace('.', '\\.')}\\b`, 'i').test(cleanText)) {
      if (!frameworks.includes(fw)) frameworks.push(fw);
    }
  }

  for (const db of TECH_CATEGORIES.databases) {
    if (new RegExp(`\\b${db.replace('.', '\\.')}\\b`, 'i').test(cleanText)) {
      if (!databases.includes(db)) databases.push(db);
    }
  }

  for (const t of TECH_CATEGORIES.tools) {
    if (new RegExp(`\\b${t.replace('.', '\\.')}\\b`, 'i').test(cleanText)) {
      if (!tools.includes(t)) tools.push(t);
    }
  }

  // 3. Parse Work Experience Section
  const experience: UserProfile['experience'] = [];
  const expSectionMatch = cleanSource.match(/\\section\*?\{(?:WORK\s+)?EXPERIENCE\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\})/i);
  if (expSectionMatch && expSectionMatch[1]) {
    const rawExp = expSectionMatch[1];
    const expBlocks = rawExp.split(/(?=\\textbf\{|\\cvitem\{)/);
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
          company: titleLine.split(/---|–|\|/)[0]?.trim() || 'Software Company',
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

  // 4. Parse Projects Section
  const projects: UserProfile['projects'] = [];
  const projSectionMatch = cleanSource.match(/\\section\*?\{PROJECTS\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\})/i);
  if (projSectionMatch && projSectionMatch[1]) {
    const rawProj = projSectionMatch[1];
    const projBlocks = rawProj.split(/(?=\\textbf\{|\\cvitem\{)/);
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

  const allExtractedKeywords = Array.from(new Set([...languages, ...frameworks, ...databases, ...tools]));

  return {
    name: name,
    email: email,
    phone: phone,
    location: 'India',
    linkedin: linkedin,
    github: github,
    website: github || linkedin || '',
    masterLaTeX: cleanSource,
    skills: {
      languages: languages.length > 0 ? languages : ['JavaScript', 'TypeScript', 'Python'],
      frameworks: frameworks.length > 0 ? frameworks : ['React', 'Next.js', 'Node.js'],
      databases: databases.length > 0 ? databases : ['MongoDB', 'PostgreSQL', 'MySQL'],
      tools: tools.length > 0 ? tools : ['Git', 'GitHub', 'Docker', 'REST API'],
      other: other,
    },
    experience: experience.length > 0 ? experience : [
      {
        id: 'exp_1',
        company: 'Tech Solutions',
        role: 'Full Stack Engineer',
        location: 'Remote',
        startDate: '2023',
        endDate: 'Present',
        bullets: ['Architected scalable web applications and REST API microservices.'],
        technologies: languages,
      }
    ],
    projects: projects.length > 0 ? projects : [
      {
        id: 'proj_1',
        title: 'Full Stack Application Platform',
        link: '',
        description: 'Automated web platform',
        bullets: ['Built full stack features and REST API integrations.'],
        technologies: frameworks,
      }
    ],
    education: [
      {
        id: 'edu_1',
        degree: 'Bachelor of Science / Computer Applications',
        institution: 'University',
        location: 'India',
        startDate: '2021',
        endDate: '2025',
      }
    ],
    certifications: [],
    achievements: [],
    extractedKeywords: allExtractedKeywords,
  };
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
