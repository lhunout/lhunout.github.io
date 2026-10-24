// Single source of truth for everything the site displays. The chatbot prompt
// at the bottom is generated from the same data, so the assistant knows exactly
// what a visitor can read on the page.

export const personalInfo = {
  name: 'Lilian Hunout',
  title: 'Senior Machine Learning Engineer @ Criteo',
  description:
    'Senior Machine Learning Engineer at Criteo, building recommender systems end to end: sequential models, large-scale training, low-latency serving and A/B tests.',
  headline: 'building RecSys',
  tagline: 'just an engineer who likes agents, fast code and GPUs going brrr',
  availability: 'Open to chat',
  // Search engines only (structured data), not shown on the page.
  expertise: [
    'Machine Learning',
    'Recommender Systems',
    'Personalization',
    'Deep Learning',
    'Large-Scale Machine Learning',
    'A/B Testing',
    'Online Advertising',
    'AI Agents',
  ],
  email: 'lilian.hunout@outlook.com',
  location: 'Paris, France',
  github: 'https://github.com/lhunout',
  linkedin: 'https://linkedin.com/in/lilian-hunout',
}

export const workflow = {
  title: 'What I build',
  intro: [
    'Two loops.',
    'Offline, a sequential model is retrained every day on fresh session sequences and rolled out progressively; when a new configuration beats it on offline metrics, it goes to an A/B test.',
    'Online, your last actions collapse into one embedding, and an approximate nearest-neighbor search returns the closest products before the page finishes loading.',
  ],
  offline: [
    { label: 'Event logs', caption: 'Raw user actions, partitioned by day' },
    { label: 'Data preparation', caption: 'Cleaned and grouped into session sequences' },
    { label: 'Training', caption: 'Loss converging on held-out sessions' },
    { label: 'Offline eval', caption: 'recall@k · nDCG · AUC' },
  ],
  online: [
    { label: 'User sequence', caption: 'The last actions in the session' },
    { label: 'Inference', caption: 'One pass → one user embedding' },
    { label: 'ANN search', caption: 'Approximate nearest neighbors in the index' },
    { label: 'A/B test', caption: 'New config wins offline → 50/50 on live traffic' },
  ],
  deploy:
    'Daily rollout (no A/B test): the same configuration retrained on fresh data replaces yesterday’s model. The inference server keeps both versions loaded and requests shift from v1 to v2 within a short window. A/B tests are only for new configurations.',
  costPanel:
    'An interactive panel lets visitors tune sequence length, model depth, embedding dimension and nprobe, and see the effect on ANN recall and serving cost.',
}

// Several positions within the same company.
export const workExperience = [
  {
    company: 'Criteo',
    logo: '/logos/criteo.svg',
    location: 'Paris, France',
    totalPeriod: 'Apr. 2024 - Current',
    positions: [
      {
        title: 'Senior Machine Learning Engineer',
        period: 'Oct. 2026 - Current',
        description: [
          'Reco Retrieval team (AI for Performance group), owning retrieval models end to end, from research idea to worldwide production',
          'Lead the design of new retrieval systems and write the design docs that align research, engineering and product',
          "Build sequential user models that learn from shoppers' latest actions to retrieve relevant products in real time",
          'Run large-scale training pipelines (data preparation, daily retraining on fresh data, offline evaluation) and keep making them faster and cheaper',
          'Launch A/B tests up to worldwide traffic, analyze them statistically, and turn the results into ship decisions',
          'Deploy models to production and optimize online inference to fit strict latency constraints',
          'Monitor model quality and serving health across offline and online systems, and act as on-call engineer when production breaks',
          'Mentor engineers and researchers, and write the documentation the team relies on',
          'Ship fast and iterate faster by putting AI agents into every step above',
        ],
      },
      { title: 'Machine Learning Engineer II', period: 'Oct. 2025 - Oct. 2026', description: [] },
      { title: 'Machine Learning Engineer', period: 'Oct. 2024 - Oct. 2025', description: [] },
      {
        title: 'Machine Learning Research Intern',
        period: 'Apr. 2024 - Oct. 2024',
        description: [],
      },
    ],
  },
]

// Hierarchical on purpose: the Erasmus at TalTech and the double degree at
// Tours happened during the INSA programme, so they nest under it instead of
// reading as successive steps.
export type EducationEntry = {
  degree: string
  school: string
  logo?: string
  location: string
  period: string
  description: string[]
  /** Short link label, never the article's title. */
  press?: { label: string; url: string }[]
  within?: EducationEntry[]
}

// Top level sorted by end date, most recent first.
export const education: EducationEntry[] = [
  {
    degree: 'MSc in Mathematics, Vision, Apprentissage (MVA)',
    school: 'Ecole Normale Supérieure Paris‑Saclay',
    logo: '/logos/ens-paris-saclay.png',
    location: 'Paris, France',
    period: 'Sep. 2023 - Sep. 2024',
    description: [
      "World's leading #1 university in Mathematics (ARWU)",
      'Courses: Deep Learning (theory and practice), Computer Vision, Object Recognition, Reinforcement Learning, Time Series Analysis, Natural Language Processing, Speech Processing, Convex Optimization, Probabilistic Graphical Models, Deep Generative Models, Signal Processing',
      'Representative of a class of 250+ students',
    ],
    press: [
      {
        label: 'Interviewed in Le Monde',
        url: 'https://www.lemonde.fr/campus/article/2024/10/03/a-peine-diplomes-deja-chasses-les-jeunes-ingenieurs-en-ia-connaissent-un-demarrage-de-carriere-florissant_6342219_4401467.html',
      },
    ],
  },
  {
    degree: 'MEng in Industrial Systems',
    school: 'INSA Centre Val de Loire',
    logo: '/logos/insa.svg',
    location: 'Bourges, France',
    period: 'Sep. 2018 - Sep. 2023',
    description: [
      'Courses: Statistical Theory and Methods, Machine Learning, Computer Vision, Complex Systems Engineering, Risk Management',
      'Student representative, active participation in various events (student council campaign, open days, etc.)',
    ],
    within: [
      {
        degree: 'MSc in Applied Physics (Double Degree)',
        school: 'University of Tours',
        logo: '/logos/uni_tours.svg',
        location: 'Tours, France',
        period: 'Sep. 2022 - Sep. 2023',
        description: [
          'Courses: Automatics, Robotics, Cyber‑Physical Systems, Multiphysics Modelling',
        ],
      },
      {
        degree: 'School of Information Technologies (Erasmus)',
        school: 'Tallinn University of Technology',
        logo: '/logos/taltech.svg',
        location: 'Tallinn, Estonia',
        period: 'Sep. 2021 - Jan. 2022',
        description: [
          'Courses: Data Mining, Machine Learning, System Programming, Embedded Systems',
        ],
      },
    ],
  },
]

const list = (lines: string[], indent = '') => lines.map((line) => `${indent}- ${line}`).join('\n')

const flattenEducation = (entries: EducationEntry[]): EducationEntry[] =>
  entries.flatMap((entry) => [entry, ...flattenEducation(entry.within ?? [])])

const promptExperience = workExperience
  .map((company) =>
    [
      `${company.company} (${company.location}, ${company.totalPeriod})`,
      ...company.positions.map((position) =>
        [`- ${position.title}, ${position.period}`, list(position.description, '  ')]
          .filter(Boolean)
          .join('\n'),
      ),
    ].join('\n'),
  )
  .join('\n')

const promptEducation = list(
  flattenEducation(education).map((entry) =>
    [
      `${entry.degree}, ${entry.school} (${entry.location}, ${entry.period}): ${entry.description.join('; ')}`,
      ...(entry.press ?? []).map((article) => `${article.label}: ${article.url}`),
    ].join('. '),
  ),
)

const promptWorkflow = [
  workflow.intro.join(' '),
  list([...workflow.offline, ...workflow.online].map((step) => `${step.label}: ${step.caption}`)),
  workflow.deploy,
  workflow.costPanel,
].join('\n')

export const chatbotPrompt = `You are the assistant on Lilian Hunout's personal website. Visitors ask you about Lilian; answer on his behalf, in the third person.

Rules:
- Answer only from the facts below. If something is not covered, say you don't know and suggest emailing Lilian at ${personalInfo.email}.
- Reply in the visitor's language.
- Keep it short: two to four sentences, or a short list when listing things. No headings.
- Never invent numbers, employers, dates or opinions.

About Lilian:
- ${personalInfo.title}, based in ${personalInfo.location}. He/him. ${personalInfo.availability}.
- ${personalInfo.description}
- In his own words: "${personalInfo.tagline}"
- Contact: ${personalInfo.email} · GitHub ${personalInfo.github} · LinkedIn ${personalInfo.linkedin}

${workflow.title} (the recommender pipeline shown on the site, with illustrative numbers):
${promptWorkflow}

Experience:
${promptExperience}

Education:
${promptEducation}`
