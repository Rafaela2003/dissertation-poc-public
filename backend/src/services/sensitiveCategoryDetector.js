// Sensitive Category Detector

class SensitiveCategoryDetector {
  constructor() {
    // Sensitive category keywords
    this.sensitiveCategories = {
      health: [
        "cancer",
        "tumor",
        "tumour",
        "diabetes",
        "hiv",
        "aids",
        "depression",
        "anxiety",
        "ptsd",
        "schizophrenia",
        "bipolar",
        "adhd",
        "autism",
        "therapy",
        "therapist",
        "psychiatrist",
        "medication",
        "diagnosis",
        "disease",
        "illness",
        "sick",
        "hospital",
        "surgery",
        "treatment",
        "mental health",
        "disabled",
        "disability",
        "pregnant",
        "pregnancy",
        "abortion",
        "miscarriage",
        "fertility",
        "chronic",
        "terminal",
        "condition",
        "symptom",
        "prescription",
      ],
      sexual_orientation: [
        "gay",
        "lesbian",
        "bisexual",
        "transgender",
        "queer",
        "lgbtq",
        "lgbt",
        "homosexual",
        "heterosexual",
        "pansexual",
        "asexual",
        "orientation",
        "coming out",
        "closeted",
        "trans",
        "non-binary",
        "genderqueer",
        "sex life",
        "sexual activity",
        "i have sex",
        "sleeping with",
        "slept with",
        "sexual partner",
        "one night",
        "hookup",
      ],
      religion: [
        "christian",
        "muslim",
        "jewish",
        "hindu",
        "buddhist",
        "atheist",
        "agnostic",
        "catholic",
        "protestant",
        "islam",
        "judaism",
        "christianity",
        "hinduism",
        "buddhism",
        "sikh",
        "religious",
        "religion",
        "faith",
        "pray",
        "prayer",
        "church",
        "mosque",
        "synagogue",
        "temple",
        "bible",
        "quran",
        "torah",
        "god",
        "allah",
        "jesus",
        "muhammad",
        "prophet",
      ],
      race_ethnicity: [
        "black",
        "white",
        "asian",
        "hispanic",
        "latino",
        "latina",
        "african american",
        "caucasian",
        "indigenous",
        "native american",
        "aboriginal",
        "race",
        "racial",
        "ethnicity",
        "ethnic",
        "racist",
        "racism",
      ],
      political: [
        "conservative",
        "liberal",
        "democrat",
        "republican",
        "socialist",
        "communist",
        "fascist",
        "marxist",
        "left wing",
        "right wing",
        "political party",
        "vote",
        "voting",
        "election",
        "politics",
        "political",
      ],
      illegal_activity: [
        "make a bomb",
        "build a bomb",
        "how to make explosives",
        "pipe bomb",
        "improvised explosive",
        "ied",
        "semtex",
        "c4 explosive",
        "make a gun",
        "illegal firearm",
        "unregistered weapon",
        "silencer",
        // Drugs
        "make meth",
        "cook meth",
        "synthesize drugs",
        "make cocaine",
        "drug synthesis",
        "manufacture drugs",
        // Hacking / fraud
        "hack into",
        "steal credit card",
        "credit card fraud",
        "identity theft",
        "make fake id",
        "counterfeit money",
        // Violence
        "how to kill",
        "hire a hitman",
        "commit murder",
        "poison someone",
      ],
    };

    console.log("Sensitive Category Detector initialised");
  }

  // Detect sensitive categories in text
  detect(text) {
    const textLower = text.toLowerCase();
    const detected = [];

    for (const [category, keywords] of Object.entries(
      this.sensitiveCategories,
    )) {
      for (const keyword of keywords) {
        // Word boundary check to avoid false positives
        const regex = new RegExp(`\\b${keyword}\\b`, "i");
        if (regex.test(text)) {
          detected.push({
            category,
            keyword,
            confidence: 0.9,
          });
          break; // One match per category is enough
        }
      }
    }

    return {
      isBlocked: detected.length > 0,
      categories: detected,
      primaryCategory: detected[0]?.category || null,
    };
  }

  // Generate user-friendly warning message
  getWarningMessage(category) {
    const messages = {
      health:
        "This message contains health-related information that cannot be processed. Please avoid sharing information about medical conditions, diagnoses, or treatments.",
      sexual_orientation:
        "This message contains information about sexual orientation or sex life that cannot be processed. Please avoid sharing such personal information.",
      religion:
        "This message contains religious beliefs or affiliations that cannot be processed. Please avoid sharing information about your religious views.",
      race_ethnicity:
        "This message contains racial or ethnic information that cannot be processed. Please avoid sharing such personal information.",
      illegal_activity:
        "This message contains a request related to illegal activity that cannot be processed.",
      political:
        "This message contains political beliefs or affiliations that cannot be processed. Please avoid sharing your political views.",
    };

    return (
      messages[category] ||
      "This message contains sensitive personal information that cannot be processed by the system. Please avoid sharing information about health conditions, sexual orientation, religion, race, or political beliefs and try again."
    );
  }
}

export default new SensitiveCategoryDetector();
