// This script seeds the database with initial content for the experiment, including:
// Information sheet content, Consent statements, Survey questions.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  /* CLEAR EXISTING DATA */
  await prisma.interaction.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.experimentSession.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.surveyQuestion.deleteMany();
  await prisma.consentStatement.deleteMany();
  await prisma.informationSheet.deleteMany();

  /* INFORMATION SHEET */
  await prisma.informationSheet.create({
    data: {
      title: 'Participant Information Sheet',
      content: `
Study Title: An Investigation of Privacy Leakage in Human-Chatbot Interactions

Principal Researcher: Rafaela Mauricio Amado
Supervisor: Nigel Beacham

Purpose:
This study investigates how users disclose sensitive information in chatbot interactions.

Participation:
- Chat interaction (~10 minutes)
- Survey (~5 minutes)
- Fictional data only
- No real personal data allowed

Data:
- Stored securely on Render
- GDPR compliant
- Deleted July 2026

You may withdraw at any time before 20 April 2026.
      `,
    },
  });

  /* CONSENT STATEMENTS */
  await prisma.consentStatement.createMany({
    data: [
      { text: 'I have read and understood the participant information sheet.', order: 1 },
      { text: 'I understand participation is voluntary and I can withdraw at any time.', order: 2 },
      { text: 'I agree to my data being collected and processed for this research.', order: 3 },
      { text: 'I agree to anonymised data being used in publications.', order: 4 },
      { text: 'I understand my data can only be withdrawn before 20 April 2026.', order: 5 },
      { text: 'I consent to take part in this research study.', order: 6 },
    ],
  });

  /* SURVEY QUESTIONS */
  await prisma.surveyQuestion.createMany({
    data: [
      {
        questionText: 'How often do you use conversational AI systems?',
        questionType: 'single_choice',
        options: ['Daily', 'Frequently', 'Occasionally', 'Rarely', 'Never'],
        required: true,
        order: 1,
      },
      {
        questionText: 'What do you primarily use chatbots for?',
        questionType: 'multiple_choice',
        options: [
          'Learning or studying',
          'Writing or editing text',
          'Programming or technical help',
          'General information',
          'Other',
        ],
        required: true,
        order: 2,
      },
      {
        questionText: 'I was aware that information entered could pose a privacy risk.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: true,
        order: 3,
      },
      {
        questionText: 'I felt confident the chatbot handled data securely.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: true,
        order: 4,
      },
      {
        questionText: 'It was clear to me how my inputs might be stored by the system.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: false,
        order: 7,
      },
      {
        questionText: 'The interaction made me more aware of how personal details could be included in chatbot prompts.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: true,
        order: 13,
      },
      {
        questionText: 'In real-world use, I would be cautious about including personal or sensitive information in similar systems.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
        required: true, 
        order: 14,
      },
      {
        questionText: 'The chatbot felt conversational and informal.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: false,
        order: 5,
      },
      {
        questionText: 'I felt comfortable interacting with the chatbot, even when using fictional information.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: false,
        order: 6,
      },
      {
        questionText: 'I found myself including more details in my prompts than was strictly necessary for the task.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: false,
        order: 12,
      },
      {
        questionText: 'I felt in control of what information was included in my prompts.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: true,
        order: 10,
      },
      {
        questionText: 'At any point, I felt the chatbot encouraged me to share more detailed information.',
        questionType: 'likert',
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], 
        required: true,
        order: 9,
      },
      {
        questionText: 'When using fictional examples, how closely did your prompts resemble realistic personal scenarios.',
        questionType: 'single_choice',
        options: ['Not at all', 'Slightly', 'Moderately', 'Very closely', 'Almost identically'],
        required: true,
        order: 8,
      },
      {
        questionText: 'What influenced how much detail you included in your prompts.',
        questionType: 'multiple_choice',
        options: ['Tone of the chatbot', 'Wanting more accurate responses', 'Task instructions', 'Time pressure', 'Not thinking about privacy at the time', 'Trust in the system', 'Other'], 
        required: true,
        order: 11,
      },
      {
        questionText: 'Do you have any thoughts about privacy when interacting with chatbots?',
        questionType: 'text',
        options: [],
        required: false,
        order: 15,
      },
    ],
  });

  /* PERSONAS — structured to match real database schema */
  await prisma.persona.createMany({
    data: [
      {
        data: {
          PER: {
            full_name: "Leo Chen",
            username: "leo_chen",
          },
          DEM: {
            age: 28,
            nationality: "British",
            job_title: "Digital Marketing Manager",
            education_level: "Bachelor's degree",
          },
          LOC: {
            city: "London",
            country: "United Kingdom",
          },
          ORG: {
            organisation: "Nexus Digital Solutions Ltd",
          },
          CODE: {
            email: "leo.chen@nexussolutions.co.uk",
            phone: "07700 123456",
          },
          PROFILE: {
            background: "Leo grew up in a middle-class family in Reading, attended a local comprehensive school. He pursued a Bachelor of Science in Digital Marketing at the University of Westminster, graduating in 2016. After internships at small marketing agencies in London, he joined Nexus Digital Solutions in 2018, quickly rising through the ranks to his current role overseeing campaign strategy and team leadership.",
            goals: "Leo aims to transition into a senior leadership role within the next 3-5 years, potentially moving into a Product Manager position. He also seeks to deepen his expertise in data analytics and AI-driven marketing strategies.",
            communication_style: "Leo is articulate and analytical in his communication, preferring clear, data-backed explanations. He is approachable and collaborative in team settings but values efficiency and direct communication in professional contexts.",
          },
          DATETIME: {
            birth_year: 1996,
            career_start_year: 2018,
          },
          QUANTITY: {
            income_range: "£35,000-£45,000",
          },
        },
      },
      {
        data: {
          PER: {
            full_name: "Aamir Iqbal",
            username: "aamir_iqbal",
          },
          DEM: {
            age: 38,
            nationality: "British",
            job_title: "Mechanical Engineering Lecturer",
            education_level: "Master's degree",
          },
          LOC: {
            city: "Birmingham",
            country: "United Kingdom",
          },
          ORG: {
            organisation: "Birmingham Community College",
          },
          CODE: {
            email: "aamir.iqbal@example.com",
            phone: "07700 900123",
          },
          PROFILE: {
            background: "Aamir grew up in Birmingham's Sparkhill area, the son of Pakistani immigrants. He studied Mechanical Engineering at university and later completed a Master's degree. He has spent over a decade teaching engineering principles and mentoring students in technical disciplines.",
            goals: "Aamir aims to inspire more students from underrepresented backgrounds to pursue engineering careers and improve practical learning outcomes in his department.",
            communication_style: "Patient and methodical, explains technical concepts clearly.",
          },
          DATETIME: {
            birth_year: 1986,
            career_start_year: 2009,
          },
          QUANTITY: {
            income_range: "£42,000-£52,000",
          },
        },
      },
      {
        data: {
          PER: {
            full_name: "Rupert Calloway",
            username: "rcalloway",
          },
          DEM: {
            age: 48,
            nationality: "British",
            job_title: "Senior Partner - Corporate Law",
            education_level: "Master's degree in Law",
          },
          LOC: {
            city: "London",
            country: "United Kingdom",
          },
          ORG: {
            organisation: "Harrow & Bennett Solicitors",
          },
          CODE: {
            email: "rupert.c@example.com",
            phone: "07000 987654",
          },
          PROFILE: {
            background: "Rupert is a senior corporate lawyer with over 25 years of experience in mergers, acquisitions, and commercial contracts. He trained at a prestigious London law firm before becoming a partner.",
            goals: "Maintain strong client relationships and expand corporate practice.",
            communication_style: "Formal, precise, and authoritative.",
          },
          DATETIME: {
            birth_year: 1976,
            career_start_year: 1998,
          },
          QUANTITY: {
            income_range: "£85,000-£120,000",
          },
        },
      },
      {
        data: {
          PER: {
            full_name: "Kwame Mensah",
            username: "kmensah",
          },
          DEM: {
            age: 29,
            nationality: "British",
            job_title: "Digital Content Producer",
            education_level: "Bachelor's degree in Media Studies",
          },
          LOC: {
            city: "Birmingham",
            country: "United Kingdom",
          },
          ORG: {
            organisation: "Creative Spark Media Ltd",
          },
          CODE: {
            email: "kwame.m@example.org",
            phone: "07123 456789",
          },
          PROFILE: {
            background: "Kwame studied Media Studies at university and built his career in digital content creation, working across social media campaigns, video production, and brand storytelling for agencies and startups.",
            goals: "Advance to senior content strategy and eventually run his own agency.",
            communication_style: "Creative, concise, and collaborative.",
          },
          DATETIME: {
            birth_year: 1995,
            career_start_year: 2017,
          },
          QUANTITY: {
            income_range: "£28,000-£35,000",
          },
        },
      },
      {
        data: {
          PER: {
            full_name: "Mateo Kowalski",
            username: "mkowalski",
          },
          DEM: {
            age: 38,
            nationality: "Polish-British",
            job_title: "Hotel Operations Manager",
            education_level: "Higher National Diploma",
          },
          LOC: {
            city: "Bristol",
            country: "United Kingdom",
          },
          ORG: {
            organisation: "Riverside Hotel Management Ltd",
          },
          CODE: {
            email: "mateo.k@example.com",
            phone: "07700 912345",
          },
          PROFILE: {
            background: "Mateo moved to the UK from Poland and worked his way up from entry-level hospitality roles to operations management, specialising in hotel logistics and guest experience optimisation.",
            goals: "Improve operational efficiency and implement digital systems.",
            communication_style: "Direct, practical, and efficiency-focused.",
          },
          DATETIME: {
            birth_year: 1986,
            career_start_year: 2006,
          },
          QUANTITY: {
            income_range: "£32,000-£38,000",
          },
        },
      },
    ],
  });

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });