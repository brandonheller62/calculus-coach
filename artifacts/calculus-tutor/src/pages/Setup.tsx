import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronRight, RotateCcw } from "lucide-react";

export type QuizType = "MCQ" | "FRQ" | "Mixed";

export interface SessionConfig {
  topic: string;
  quizType: QuizType;
}

interface SetupProps {
  onStart: (config: SessionConfig) => void;
}

const UNITS = [
  { id: "unit1", label: "Unit 1", name: "Limits and Continuity" },
  { id: "unit2", label: "Unit 2", name: "Differentiation: Definition and Fundamental Properties" },
  { id: "unit3", label: "Unit 3", name: "Differentiation: Composite, Implicit, and Inverse Functions" },
  { id: "unit4", label: "Unit 4", name: "Contextual Applications of Differentiation" },
  { id: "unit5", label: "Unit 5", name: "Applying Derivatives to Analyze Functions" },
  { id: "unit6", label: "Unit 6", name: "Integration and Accumulation of Change" },
  { id: "unit7", label: "Unit 7", name: "Differential Equations" },
  { id: "unit8", label: "Unit 8", name: "Applications of Integration" },
];

const QUIZ_TYPES: { type: QuizType; label: string; description: string }[] = [
  {
    type: "MCQ",
    label: "MCQ Quiz",
    description: "Multiple choice questions with one correct answer",
  },
  {
    type: "FRQ",
    label: "FRQ Quiz",
    description: "Free response questions requiring full written solutions",
  },
  {
    type: "Mixed",
    label: "Mixed Quiz",
    description: "4 MCQ questions for every 1 FRQ question",
  },
];

export default function Setup({ onStart }: SetupProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  function handleTopicSelect(topic: string) {
    setSelectedTopic(topic);
    setStep(2);
  }

  function handleQuizSelect(quizType: QuizType) {
    if (!selectedTopic) return;
    onStart({ topic: selectedTopic, quizType });
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-card/50 px-6 py-3 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-none text-foreground">Brandon's Tutor</h1>
          <span className="text-xs text-muted-foreground mt-0.5 block">Your AP Calculus AB study partner</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex shrink-0 items-center gap-2 px-6 pt-8 pb-2 mx-auto w-full max-w-2xl">
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? "bg-primary" : "bg-border"}`} />
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="py-6">
                  <h2 className="text-xl font-semibold text-foreground">Choose a topic</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select a unit to focus on, or practice everything.</p>
                </div>

                {/* General Review first */}
                <button
                  onClick={() => handleTopicSelect("General Review")}
                  data-testid="topic-general"
                  className="mb-3 flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 text-left transition-all hover:bg-primary/20 hover:border-primary/50"
                >
                  <div>
                    <div className="text-sm font-semibold text-primary">General Review</div>
                    <div className="text-xs text-muted-foreground mt-0.5">All units — randomized across the full course</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                </button>

                <div className="flex flex-col gap-2">
                  {UNITS.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => handleTopicSelect(unit.name)}
                      data-testid={`topic-${unit.id}`}
                      className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/30 px-5 py-4 text-left transition-all hover:bg-card hover:border-border"
                    >
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{unit.label}</span>
                          <span className="text-sm font-medium text-foreground">{unit.name}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="py-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Choose quiz type</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Topic: <span className="text-foreground font-medium">{selectedTopic}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    data-testid="back-to-step1"
                    className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/30 px-3 py-2 text-xs text-muted-foreground transition-all hover:bg-card hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Change topic
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {QUIZ_TYPES.map(({ type, label, description }) => (
                    <button
                      key={type}
                      onClick={() => handleQuizSelect(type)}
                      data-testid={`quiz-${type.toLowerCase()}`}
                      className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/30 px-5 py-5 text-left transition-all hover:bg-card hover:border-primary/30 group"
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{description}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
