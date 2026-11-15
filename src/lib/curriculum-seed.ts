/**
 * Starter curriculum: "Python Foundations", four modules in CIC's module template
 * (pretest → learn → check → practice → exit → posttest). CIC staff can edit all of it
 * in the curriculum editor; this only exists so a fresh install is useful on day one.
 */

type Q = { id: string; prompt: string; choices: string[]; answer: number; concept: string; explanation: string };
type Act = { kind: string; title: string; concept: string; content: any };
export type SeedModule = { title: string; summary: string; concepts: string[]; lessons: { title: string; activities: Act[] }[] };

const quiz = (questions: Q[], intro = "") => ({ intro, questions });

function moduleOf(m: {
  title: string;
  summary: string;
  concepts: string[];
  assessment: Q[]; // same questions pre and post, so the gain is apples to apples
  slides: { title: string; body: string }[];
  videoBody: string;
  check: Q[];
  worksheet: { intro: string; prompts: { id: string; prompt: string; long?: boolean }[] };
  code: { title: string; concept: string; prompt: string; starter: string; tests: { name: string; code: string }[]; solution: string };
  exit: Q[];
}): SeedModule {
  return {
    title: m.title,
    summary: m.summary,
    concepts: m.concepts,
    lessons: [
      {
        title: "Warm-up",
        activities: [
          {
            kind: "pretest",
            title: "What do you already know?",
            concept: "",
            content: quiz(m.assessment, "No pressure: this just shows where you're starting. Guessing is fine."),
          },
        ],
      },
      {
        title: "Learn",
        activities: [
          { kind: "video", title: "Watch: the big idea", concept: m.concepts[0], content: { url: "", body: m.videoBody } },
          { kind: "slides", title: "Step by step", concept: m.concepts[0], content: { slides: m.slides } },
          { kind: "check", title: "Quick check", concept: m.concepts[0], content: quiz(m.check) },
        ],
      },
      {
        title: "Practice",
        activities: [
          { kind: "worksheet", title: "Worksheet", concept: m.concepts[0], content: { ...m.worksheet, prompts: m.worksheet.prompts.map((p) => ({ long: false, ...p })) } },
          {
            kind: "code",
            title: m.code.title,
            concept: m.code.concept,
            content: { prompt: m.code.prompt, starter: m.code.starter, tests: m.code.tests, solution: m.code.solution },
          },
        ],
      },
      {
        title: "Wrap-up",
        activities: [
          { kind: "exit", title: "Exit ticket", concept: m.concepts[0], content: quiz(m.exit) },
          { kind: "posttest", title: "Show what you learned", concept: "", content: quiz(m.assessment, "Same questions as the warm-up. Let's see how far you came!") },
        ],
      },
    ],
  };
}

export const COURSE = {
  title: "Python Foundations",
  description: "Coding in Color's first-semester course: from your first print() to writing your own functions.",
};

export const MODULES: SeedModule[] = [
  moduleOf({
    title: "Variables & Printing",
    summary: "Store information in variables and show it with print().",
    concepts: ["variables", "print"],
    assessment: [
      { id: "a1", prompt: 'What does print("Hi " + "there") show?', choices: ["Hi there", "Hi + there", "\"Hi there\"", "An error"], answer: 0, concept: "print", explanation: "+ joins two strings together." },
      { id: "a2", prompt: "After x = 5 and then x = x + 2, what is x?", choices: ["5", "2", "7", "x + 2"], answer: 2, concept: "variables", explanation: "The right side is worked out first (5 + 2), then stored back in x." },
      { id: "a3", prompt: "Which is a valid variable name?", choices: ["2cool", "my score", "my_score", "my-score"], answer: 2, concept: "variables", explanation: "Names can't start with a digit or contain spaces or dashes." },
      { id: "a4", prompt: 'What type is "42" (with quotes)?', choices: ["Number", "Text (string)", "True/False", "Nothing"], answer: 1, concept: "variables", explanation: "Anything in quotes is a string, even if it looks like a number." },
    ],
    videoBody:
      "A **variable** is a labelled box that holds a value. `name = \"Ana\"` puts the text Ana in a box called name.\n\n`print()` shows whatever you give it on the screen. You can print text, numbers, or variables: `print(name)` shows Ana.\n\nYou can change what's in the box at any time: `score = 0`, then later `score = score + 10`.",
    slides: [
      { title: "Your first line of code", body: "print(\"Hello, world!\")\n\nprint shows text on the screen. The quotes tell Python this is text." },
      { title: "Variables are labelled boxes", body: "name = \"Ana\"\nage = 15\n\nThe = sign means \"store\", not \"equals\"." },
      { title: "Use them together", body: "print(\"Hi \" + name)\n\nThis shows: Hi Ana" },
      { title: "Changing a variable", body: "score = 0\nscore = score + 10\nprint(score)  # 10" },
    ],
    check: [
      { id: "c1", prompt: 'name = "Leo". What does print("Hey " + name) show?', choices: ["Hey name", "Hey Leo", "Hey + Leo", "Error"], answer: 1, concept: "variables", explanation: "name holds Leo, so Python joins Hey and Leo." },
      { id: "c2", prompt: "What does = do in score = 10?", choices: ["Checks if score is 10", "Stores 10 in score", "Prints 10", "Nothing"], answer: 1, concept: "variables", explanation: "A single = stores a value." },
    ],
    worksheet: {
      intro: "This replaces the printed \"About Me in Code\" worksheet.",
      prompts: [
        { id: "w1", prompt: "Write three variables that describe you (for example favorite_food = \"tacos\")." },
        { id: "w2", prompt: "In your own words, what is a variable? Explain it to a friend who has never coded.", long: true },
      ],
    },
    code: {
      title: "Code it: your profile card",
      concept: "variables",
      prompt: "Create a variable called `name` with your name, and a variable called `age` with a number. Then create `greeting` that equals \"Hi, I'm \" followed by your name.",
      starter: "# Create name, age and greeting below\n\nprint(greeting)\n",
      tests: [
        { name: "name is text", code: "assert isinstance(name, str) and len(name) > 0, 'name should be some text in quotes'" },
        { name: "age is a number", code: "assert isinstance(age, int), 'age should be a whole number without quotes'" },
        { name: "greeting uses name", code: "assert greeting == \"Hi, I'm \" + name, 'greeting should be \"Hi, I\\'m \" + name'" },
      ],
      solution: "name = \"Ana\"\nage = 15\ngreeting = \"Hi, I'm \" + name\nprint(greeting)",
    },
    exit: [
      { id: "e1", prompt: "points = 3, then points = points * 2. What is points?", choices: ["3", "5", "6", "points * 2"], answer: 2, concept: "variables", explanation: "3 × 2 = 6, stored back in points." },
    ],
  }),
  moduleOf({
    title: "Making Decisions",
    summary: "Use if, elif and else so your program can choose what to do.",
    concepts: ["conditionals", "comparison"],
    assessment: [
      { id: "a1", prompt: "What does 7 > 3 evaluate to?", choices: ["True", "False", "7", "Error"], answer: 0, concept: "comparison", explanation: "7 is greater than 3, so the comparison is True." },
      { id: "a2", prompt: "Which checks if x equals 10?", choices: ["x = 10", "x == 10", "x := 10", "x equals 10"], answer: 1, concept: "comparison", explanation: "== compares; = stores." },
      { id: "a3", prompt: 'temp = 50. if temp > 80: print("hot") else: print("cool"). What prints?', choices: ["hot", "cool", "both", "nothing"], answer: 1, concept: "conditionals", explanation: "50 > 80 is False, so the else branch runs." },
      { id: "a4", prompt: "What comes after if when the first condition is false and you want to check another?", choices: ["else", "elif", "then", "or if"], answer: 1, concept: "conditionals", explanation: "elif means \"else, if\"." },
    ],
    videoBody:
      "Programs make choices with **if**. `if score >= 60:` runs the indented lines only when the condition is True.\n\n**elif** checks another condition, and **else** catches everything left over.\n\nComparisons: `==` equal, `!=` not equal, `>`, `<`, `>=`, `<=`.",
    slides: [
      { title: "if runs code only when True", body: "if age >= 16:\n    print(\"You can drive in Arizona\")" },
      { title: "else catches the rest", body: "if age >= 16:\n    print(\"Drive!\")\nelse:\n    print(\"Not yet\")" },
      { title: "elif checks more cases", body: "if grade >= 90:\n    print(\"A\")\nelif grade >= 80:\n    print(\"B\")\nelse:\n    print(\"Keep going\")" },
      { title: "Indentation matters", body: "The 4 spaces tell Python which lines belong to the if." },
    ],
    check: [
      { id: "c1", prompt: "x = 5. Which runs? if x > 10: A  elif x > 3: B  else: C", choices: ["A", "B", "C", "B and C"], answer: 1, concept: "conditionals", explanation: "x > 10 is False, x > 3 is True, so B runs and Python stops checking." },
      { id: "c2", prompt: "What does != mean?", choices: ["Equal", "Not equal", "Assign", "Greater"], answer: 1, concept: "comparison", explanation: "!= is True when the two sides are different." },
    ],
    worksheet: {
      intro: "This replaces the printed \"Choose Your Path\" worksheet.",
      prompts: [
        { id: "w1", prompt: "Describe a decision you make every morning as an if / else (in plain English).", long: true },
        { id: "w2", prompt: "Write a condition that is True when a number n is between 1 and 10." },
      ],
    },
    code: {
      title: "Code it: grade calculator",
      concept: "conditionals",
      prompt: "Write a function `letter(score)` that returns \"A\" for 90 or more, \"B\" for 80–89, \"C\" for 70–79 and \"F\" for anything lower.",
      starter: "def letter(score):\n    # your if / elif / else here\n    pass\n\nprint(letter(95))\n",
      tests: [
        { name: "95 is an A", code: "assert letter(95) == 'A', 'letter(95) should be A'" },
        { name: "85 is a B", code: "assert letter(85) == 'B', 'letter(85) should be B'" },
        { name: "70 is a C (edge case)", code: "assert letter(70) == 'C', 'letter(70) should be C: check >= vs >'" },
        { name: "12 is an F", code: "assert letter(12) == 'F', 'letter(12) should be F'" },
      ],
      solution: "def letter(score):\n    if score >= 90:\n        return 'A'\n    elif score >= 80:\n        return 'B'\n    elif score >= 70:\n        return 'C'\n    else:\n        return 'F'",
    },
    exit: [
      { id: "e1", prompt: "Which line is True when n is 0?", choices: ["n > 0", "n != 0", "n == 0", "n >= 1"], answer: 2, concept: "comparison", explanation: "0 == 0 is True." },
    ],
  }),
  moduleOf({
    title: "Loops",
    summary: "Repeat code with for and while instead of copying it.",
    concepts: ["loops", "range"],
    assessment: [
      { id: "a1", prompt: "How many times does for i in range(5): run?", choices: ["4", "5", "6", "Forever"], answer: 1, concept: "range", explanation: "range(5) is 0, 1, 2, 3, 4: five numbers." },
      { id: "a2", prompt: "What is the first value of i in for i in range(3)?", choices: ["0", "1", "3", "None"], answer: 0, concept: "range", explanation: "range starts at 0 unless you give a start." },
      { id: "a3", prompt: "total = 0, then for n in [2, 4, 6]: total = total + n. What is total?", choices: ["6", "12", "0", "246"], answer: 1, concept: "loops", explanation: "0 + 2 + 4 + 6 = 12." },
      { id: "a4", prompt: "When does a while loop stop?", choices: ["After 10 runs", "When its condition becomes False", "Never", "When it prints"], answer: 1, concept: "loops", explanation: "while keeps going as long as the condition is True." },
    ],
    videoBody:
      "A **loop** repeats code. `for i in range(3):` runs the indented block three times, with i = 0, then 1, then 2.\n\nYou can loop over a list: `for name in names:` visits each name.\n\nA common pattern is the **accumulator**: start `total = 0`, then add to it inside the loop.",
    slides: [
      { title: "Repeat without copying", body: "for i in range(3):\n    print(\"Hip hip hooray!\")" },
      { title: "range counts from 0", body: "for i in range(4):\n    print(i)\n# 0 1 2 3" },
      { title: "Loop over a list", body: "for city in [\"Phoenix\", \"Mesa\", \"Tempe\"]:\n    print(\"Hello \" + city)" },
      { title: "The accumulator pattern", body: "total = 0\nfor n in [5, 10, 15]:\n    total = total + n\nprint(total)  # 30" },
    ],
    check: [
      { id: "c1", prompt: "What does for i in range(2, 5): print(i) show?", choices: ["2 3 4 5", "2 3 4", "0 1 2 3 4", "5"], answer: 1, concept: "range", explanation: "range(2, 5) starts at 2 and stops before 5." },
      { id: "c2", prompt: "Where must the total = 0 line go in an accumulator?", choices: ["Inside the loop", "Before the loop", "After the loop", "Anywhere"], answer: 1, concept: "loops", explanation: "Inside the loop it would reset to 0 every time." },
    ],
    worksheet: {
      intro: "This replaces the printed \"Loop Detective\" worksheet.",
      prompts: [
        { id: "w1", prompt: "Name something in real life that repeats until a condition changes (that's a while loop!)." },
        { id: "w2", prompt: "Explain why total = 0 must be before the loop, not inside it.", long: true },
      ],
    },
    code: {
      title: "Code it: sum it up",
      concept: "loops",
      prompt: "Write a function `total_of(numbers)` that uses a for loop to add up every number in the list and returns the total. (Don't use the built-in sum()!)",
      starter: "def total_of(numbers):\n    total = 0\n    # loop over numbers here\n    return total\n\nprint(total_of([1, 2, 3]))\n",
      tests: [
        { name: "adds [1, 2, 3]", code: "assert total_of([1, 2, 3]) == 6, 'total_of([1, 2, 3]) should be 6'" },
        { name: "empty list is 0", code: "assert total_of([]) == 0, 'an empty list should total 0'" },
        { name: "works with negatives", code: "assert total_of([10, -4, 5]) == 11, 'total_of([10, -4, 5]) should be 11'" },
      ],
      solution: "def total_of(numbers):\n    total = 0\n    for n in numbers:\n        total = total + n\n    return total",
    },
    exit: [
      { id: "e1", prompt: "How many lines print? for i in range(1, 4): print(i)", choices: ["1", "3", "4", "0"], answer: 1, concept: "range", explanation: "range(1, 4) is 1, 2, 3." },
    ],
  }),
  moduleOf({
    title: "Functions",
    summary: "Package code into reusable functions with parameters and return values.",
    concepts: ["functions", "return"],
    assessment: [
      { id: "a1", prompt: "Which keyword creates a function?", choices: ["func", "def", "function", "make"], answer: 1, concept: "functions", explanation: "def defines a function." },
      { id: "a2", prompt: "def double(n): return n * 2. What is double(4)?", choices: ["4", "6", "8", "n * 2"], answer: 2, concept: "return", explanation: "4 × 2 = 8 is returned." },
      { id: "a3", prompt: "What does a function return if it has no return line?", choices: ["0", "None", "An error", "The last line"], answer: 1, concept: "return", explanation: "Python returns None by default." },
      { id: "a4", prompt: "In def greet(name):, what is name?", choices: ["A parameter", "A loop", "A return value", "A string"], answer: 0, concept: "functions", explanation: "name is a parameter: a variable that receives the value you pass in." },
    ],
    videoBody:
      "A **function** is a named recipe. `def greet(name):` creates one; `greet(\"Ana\")` runs it with name set to Ana.\n\n**return** sends a value back to whoever called the function, so you can store or print it.\n\nprint shows something; return hands it back. They are not the same!",
    slides: [
      { title: "Define once, use many times", body: "def cheer():\n    print(\"Go team!\")\n\ncheer()\ncheer()" },
      { title: "Parameters are inputs", body: "def greet(name):\n    print(\"Hi \" + name)\n\ngreet(\"Ana\")" },
      { title: "return gives back a value", body: "def area(w, h):\n    return w * h\n\nroom = area(3, 4)  # 12" },
      { title: "print vs return", body: "print shows text to a human.\nreturn hands a value to your code." },
    ],
    check: [
      { id: "c1", prompt: "def add(a, b): return a + b. What is add(2, 3) * 2?", choices: ["7", "10", "8", "Error"], answer: 1, concept: "return", explanation: "add(2, 3) returns 5, and 5 × 2 = 10." },
      { id: "c2", prompt: "Why use a function?", choices: ["To make code slower", "To reuse code without copying", "Python requires it", "To print things"], answer: 1, concept: "functions", explanation: "Functions let you reuse logic." },
    ],
    worksheet: {
      intro: "This replaces the printed \"Recipe Cards\" worksheet.",
      prompts: [
        { id: "w1", prompt: "Write a recipe you know as a function: what are its parameters (ingredients) and what does it return (the dish)?", long: true },
        { id: "w2", prompt: "What's the difference between print and return?" },
      ],
    },
    code: {
      title: "Code it: tip calculator",
      concept: "functions",
      prompt: "Write `tip(bill, percent)` that returns the tip amount: bill × percent ÷ 100. Then write `total_with_tip(bill, percent)` that uses `tip` and returns bill + tip.",
      starter: "def tip(bill, percent):\n    pass\n\ndef total_with_tip(bill, percent):\n    pass\n\nprint(total_with_tip(40, 15))\n",
      tests: [
        { name: "15% of 40 is 6", code: "assert tip(40, 15) == 6, 'tip(40, 15) should be 6'" },
        { name: "total is 46", code: "assert total_with_tip(40, 15) == 46, 'total_with_tip(40, 15) should be 46'" },
        { name: "returns, not prints", code: "assert tip(100, 20) is not None, 'tip should return a value (did you use print instead of return?)'" },
      ],
      solution: "def tip(bill, percent):\n    return bill * percent / 100\n\ndef total_with_tip(bill, percent):\n    return bill + tip(bill, percent)",
    },
    exit: [
      { id: "e1", prompt: "def f(x): return x + 1. What is f(f(1))?", choices: ["2", "3", "1", "Error"], answer: 1, concept: "functions", explanation: "f(1) = 2, then f(2) = 3." },
    ],
  }),
];
