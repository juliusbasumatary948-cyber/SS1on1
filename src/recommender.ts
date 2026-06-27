/**
 * Sikho Sikhow - AI Matchmaker & Tutor Recommender Model
 * Pure TypeScript implementation of Random Forest Regressor
 * to predict tutor recommendation suitability scores, initialized with
 * a comprehensive database of Indian educational subjects.
 */

export interface IndianSubject {
  name: string;
  category: "Science" | "Commerce" | "Humanities" | "General" | "Languages" | "Vocational";
  boardAvailability: string[]; // ["CBSE", "ICSE", "State Boards"]
  description: string;
}

// ── FULL LIST OF SUBJECTS AVAILABLE IN INDIA ──
export const INDIAN_SUBJECTS: IndianSubject[] = [
  // General / Lower Grades
  { name: "Science (General)", category: "General", boardAvailability: ["CBSE", "ICSE", "State Boards"], description: "Integrated science covering physics, chemistry, and biology for classes 1-10." },
  { name: "Social Studies", category: "General", boardAvailability: ["CBSE", "ICSE", "State Boards"], description: "Integrated history, civics, economics, and geography for primary & middle classes." },
  { name: "Mathematics", category: "General", boardAvailability: ["CBSE", "ICSE", "State Boards"], description: "Core mathematics covering algebra, calculus, geometry, and statistics." },
  { name: "Environmental Studies (EVS)", category: "General", boardAvailability: ["CBSE", "ICSE", "State Boards"], description: "Basic environmental awareness and science for classes 1-5." },
  
  // Science Stream (Classes 11-12, JEE/NEET Prep)
  { name: "Physics", category: "Science", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Mechanics, thermodynamics, electrostatics, optics, and modern physics." },
  { name: "Chemistry", category: "Science", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Physical, inorganic, and organic chemistry reactions." },
  { name: "Biology", category: "Science", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Botany, zoology, genetics, biochemistry, and human physiology." },
  { name: "Biotechnology", category: "Science", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Cell biology, genetic engineering, and bio-industrial applications." },
  { name: "Applied Mathematics", category: "Science", boardAvailability: ["CBSE", "State Boards"], description: "Hands-on application of mathematical tools in business, logistics, and data science." },

  // Commerce Stream (Classes 11-12)
  { name: "Accountancy", category: "Commerce", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Double-entry bookkeeping, partnership forms, company accounts, and ratios." },
  { name: "Business Studies", category: "Commerce", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Principles of management, marketing, business environment, and finance." },
  { name: "Economics", category: "Commerce", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Microeconomics, macroeconomics, statistics, and Indian economic development." },
  { name: "Entrepreneurship", category: "Commerce", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Business planning, venture evaluation, resource mobilization, and marketing." },

  // Humanities & Arts Stream (Classes 11-12)
  { name: "History", category: "Humanities", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Themes in world history, ancient civilisations, and modern Indian periods." },
  { name: "Geography", category: "Humanities", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Global maps, physical landforms, human resource distribution, and Indian soils." },
  { name: "Political Science", category: "Humanities", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Indian policy, governance structures, global alliances, and democracy theory." },
  { name: "Sociology", category: "Humanities", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Social institutions, cultural dynamics, inequalities, and social movements." },
  { name: "Psychology", category: "Humanities", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Human development, therapeutic approaches, personality traits, and mental health." },
  { name: "Philosophy", category: "Humanities", boardAvailability: ["ISC", "State Boards"], description: "Vedic, Buddhist, Western philosophy, standard ethics, and formal logic structures." },
  { name: "Legal Studies", category: "Humanities", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Indian legal structure, torts, contracts, international law, and arbitration." },
  { name: "Home Science", category: "Humanities", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Family psychology, structural nutrition, clothes styling, and resource management." },

  // Languages
  { name: "English Literature & Grammar", category: "Languages", boardAvailability: ["CBSE", "ICSE/ISC", "State Boards"], description: "English communication, drama, poetry analysis, prose, and syntax check." },
  { name: "Hindi", category: "Languages", boardAvailability: ["CBSE", "ICSE", "State Boards"], description: "Hindi literature, grammar, speech comprehension, and core translations." },
  { name: "Sanskrit", category: "Languages", boardAvailability: ["CBSE", "ICSE", "State Boards"], description: "Ancient Sanskrit shlokas, grammar patterns, varnamala, and translations." },

  // Vocational / Specialized Streams
  { name: "Computer Science", category: "Vocational", boardAvailability: ["CBSE", "ISC", "State Boards"], description: "Programming in Python, MySQL databases, OOP concepts, and computer networks." },
  { name: "Informatics Practices", category: "Vocational", boardAvailability: ["CBSE", "State Boards"], description: "Data analytics using Python Pandas, matplotlib visualization, and basic safe net usage." },
  { name: "Web Applications", category: "Vocational", boardAvailability: ["CBSE", "State Boards"], description: "Modern HTML5, CSS3, Javascript, backend basics, and multimedia design." },
  { name: "Physical Education", category: "Vocational", boardAvailability: ["CBSE", "ICSE", "State Boards"], description: "Body anatomical structures, athletic measurements, yogic postures, and wellness." },
  { name: "Fine Arts / Commercial Art", category: "Vocational", boardAvailability: ["CBSE", "State Boards"], description: "Traditional painting techniques, historical sketches, and sculpture molding." },
  { name: "Business Mathematics", category: "Commerce", boardAvailability: ["State Boards"], description: "Commercial arithmetic, annuities, equations, and mathematical operations for accounting." }
];

// Map subjects names to continuous integers to emulate encode_subject in Python code
export function getSubjectCode(subjectName: string): number {
  const norm = subjectName.toLowerCase().trim();
  if (norm.includes("math")) return 1;
  if (norm.includes("science")) return 2;
  if (norm.includes("english")) return 3;
  if (norm.includes("program") || norm.includes("comput")) return 4;
  if (norm.includes("physic")) return 5;
  if (norm.includes("chemist")) return 6;
  if (norm.includes("biolog")) return 7;
  if (norm.includes("history") || norm.includes("social")) return 8;
  if (norm.includes("account")) return 9;
  if (norm.includes("business")) return 10;
  if (norm.includes("econom")) return 11;
  if (norm.includes("geograph")) return 12;
  if (norm.includes("polit")) return 13;
  return 0; // Default Code
}

export interface FeedbackRow {
  student_level: number;       // e.g. Class 11 grade
  subject_code: number;        // subject code integer representation
  tutor_experience: number;    // years of experience numeric
  tutor_rating: number;        // current overall review rating of tutor (average 1-5)
  session_price: number;       // price of session in Rupees
  student_rating: number;      // target feedback rating between 1 and 5
}

// ── CUSTOM LIGHTWEIGHT DECISION TREE REGRESSOR ──
interface TreeNode {
  isLeaf: boolean;
  prediction?: number;
  feature?: keyof FeedbackRow;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
}

class DecisionTreeRegressor {
  private root: TreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;

  constructor(maxDepth = 5, minSamplesSplit = 2) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  public fit(data: FeedbackRow[]) {
    this.root = this.buildTree(data, 0);
  }

  public predict(row: Omit<FeedbackRow, "student_rating">): number {
    if (!this.root) return 4.0; // Default prediction
    return this.traverse(this.root, row);
  }

  private traverse(node: TreeNode, row: Omit<FeedbackRow, "student_rating">): number {
    if (node.isLeaf) return node.prediction!;
    const val = row[node.feature!];
    if (val <= node.splitValue!) {
      return this.traverse(node.left!, row);
    } else {
      return this.traverse(node.right!, row);
    }
  }

  private calculateMSE(data: FeedbackRow[], mean: number): number {
    let sumSquares = 0;
    for (const r of data) {
      sumSquares += Math.pow(r.student_rating - mean, 2);
    }
    return sumSquares / (data.length || 1);
  }

  private buildTree(data: FeedbackRow[], depth: number): TreeNode {
    if (data.length === 0) {
      return { isLeaf: true, prediction: 4.0 };
    }

    const ratingsSum = data.reduce((acc, r) => acc + r.student_rating, 0);
    const meanRating = ratingsSum / data.length;

    // Base conditions
    if (depth >= this.maxDepth || data.length < this.minSamplesSplit) {
      return { isLeaf: true, prediction: parseFloat(meanRating.toFixed(2)) };
    }

    // Check if all student ratings are the same
    let allSame = true;
    for (let i = 1; i < data.length; i++) {
      if (data[i].student_rating !== data[0].student_rating) {
        allSame = false;
        break;
      }
    }
    if (allSame) {
      return { isLeaf: true, prediction: data[0].student_rating };
    }

    // Find best split
    let bestSplitFeature: keyof FeedbackRow | null = null;
    let bestSplitValue = 0;
    let bestSplitMSE = Infinity;
    let bestLeftData: FeedbackRow[] = [];
    let bestRightData: FeedbackRow[] = [];

    const featuresToTry: (keyof FeedbackRow)[] = [
      "student_level",
      "subject_code",
      "tutor_experience",
      "tutor_rating",
      "session_price"
    ];

    for (const feat of featuresToTry) {
      // Find all possible values of this feature to test splitting
      const values = Array.from(new Set(data.map(r => r[feat])));
      
      for (const val of values) {
        const left = data.filter(r => r[feat] <= val);
        const right = data.filter(r => r[feat] > val);

        if (left.length === 0 || right.length === 0) continue;

        const leftMean = left.reduce((acc, r) => acc + r.student_rating, 0) / left.length;
        const rightMean = right.reduce((acc, r) => acc + r.student_rating, 0) / right.length;

        const leftMSE = this.calculateMSE(left, leftMean);
        const rightMSE = this.calculateMSE(right, rightMean);

        // Weighted sum of MSEs
        const totalSplitMSE = (left.length / data.length) * leftMSE + (right.length / data.length) * rightMSE;

        if (totalSplitMSE < bestSplitMSE) {
          bestSplitMSE = totalSplitMSE;
          bestSplitFeature = feat;
          bestSplitValue = val;
          bestLeftData = left;
          bestRightData = right;
        }
      }
    }

    // If no reasonable split found, return leaf
    if (!bestSplitFeature || bestLeftData.length === 0 || bestRightData.length === 0) {
      return { isLeaf: true, prediction: parseFloat(meanRating.toFixed(2)) };
    }

    return {
      isLeaf: false,
      feature: bestSplitFeature,
      splitValue: bestSplitValue,
      left: this.buildTree(bestLeftData, depth + 1),
      right: this.buildTree(bestRightData, depth + 1)
    };
  }
}

// ── CUSTOM PORTABLE ENSEMBLE RANDOM FOREST REGRESSOR ──
export class RandomForestRegressorTS {
  private trees: DecisionTreeRegressor[] = [];
  private numEstimators: number;
  private maxDepth: number;

  constructor(numEstimators = 15, maxDepth = 6) {
    this.numEstimators = numEstimators;
    this.maxDepth = maxDepth;
  }

  public fit(data: FeedbackRow[]) {
    this.trees = [];
    if (data.length === 0) return;

    for (let i = 0; i < this.numEstimators; i++) {
      const tree = new DecisionTreeRegressor(this.maxDepth, 2);
      // Bootstrapping: Sample dataset with replacement
      const bootstrapped: FeedbackRow[] = [];
      for (let j = 0; j < data.length; j++) {
        const index = Math.floor(Math.random() * data.length);
        bootstrapped.push(data[index]);
      }
      tree.fit(bootstrapped);
      this.trees.push(tree);
    }
  }

  public predict(row: Omit<FeedbackRow, "student_rating">): number {
    if (this.trees.length === 0) return 4.0;
    
    let sum = 0;
    for (const tree of this.trees) {
      sum += tree.predict(row);
    }
    const score = sum / this.trees.length;
    return parseFloat(score.toFixed(2));
  }
}

// ── DEFAULT DATASET FOR COLD START (INDIAN SCHOOL TUTOR FEEDBACK FEED) ──
export const INITIAL_FEEDBACK_DATA: FeedbackRow[] = [
  // High satisfaction matching of subject codes & grades
  { student_level: 11, subject_code: 1, tutor_experience: 7, tutor_rating: 4.9, session_price: 600, student_rating: 5.0 }, // Math, 7yr, 4.9, 600
  { student_level: 12, subject_code: 1, tutor_experience: 5, tutor_rating: 4.5, session_price: 500, student_rating: 4.5 },
  { student_level: 11, subject_code: 6, tutor_experience: 5, tutor_rating: 4.8, session_price: 550, student_rating: 4.8 }, // Chem
  { student_level: 12, subject_code: 5, tutor_experience: 9, tutor_rating: 4.9, session_price: 700, student_rating: 5.0 }, // Physics
  { student_level: 10, subject_code: 3, tutor_experience: 6, tutor_rating: 4.7, session_price: 480, student_rating: 4.6 }, // English

  // Tutors with low ratings / high price matching leads to lower ratings in feedback
  { student_level: 8, subject_code: 1, tutor_experience: 1, tutor_rating: 3.5, session_price: 800, student_rating: 2.5 },
  { student_level: 12, subject_code: 2, tutor_experience: 2, tutor_rating: 4.0, session_price: 750, student_rating: 3.2 },
  { student_level: 9, subject_code: 1, tutor_experience: 3, tutor_rating: 4.2, session_price: 300, student_rating: 4.0 },
  { student_level: 11, subject_code: 5, tutor_experience: 15, tutor_rating: 4.9, session_price: 1500, student_rating: 4.9 },

  // Moderate outcomes
  { student_level: 10, subject_code: 2, tutor_experience: 4, tutor_rating: 4.3, session_price: 400, student_rating: 4.1 },
  { student_level: 7, subject_code: 3, tutor_experience: 3, tutor_rating: 4.1, session_price: 350, student_rating: 3.8 },
  { student_level: 12, subject_code: 6, tutor_experience: 8, tutor_rating: 4.7, session_price: 650, student_rating: 4.7 },
  { student_level: 11, subject_code: 1, tutor_experience: 2, tutor_rating: 3.9, session_price: 250, student_rating: 3.5 },
  { student_level: 12, subject_code: 4, tutor_experience: 6, tutor_rating: 4.5, session_price: 600, student_rating: 4.5 }
];

// Helper to calculate mean absolute error (MAE)
export function calculateMAE(predictions: number[], targets: number[]): number {
  if (predictions.length === 0) return 0;
  let absSum = 0;
  for (let i = 0; i < predictions.length; i++) {
    absSum += Math.abs(predictions[i] - targets[i]);
  }
  return parseFloat((absSum / predictions.length).toFixed(4));
}
