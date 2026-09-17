import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerOption } from '../components/AnswerOption';
import { QuizProgress } from '../components/QuizProgress';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ArrowRight, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuizPage: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string | null;
    explanation?: string | null;
    repetitionScheduled?: boolean;
    repeatedAtPosition?: number | null;
    isComplete?: boolean;
  } | null>(null);

  const questionStartTimeRef = useRef<number>(Date.now());
  const isSubmittingRef = useRef<boolean>(false);

  // Fetch session and active question
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await ApiClient.getQuizSession(sessionId);
      setSessionData(res);

      if (res.session.isCompleted || !res.currentQuestion) {
        navigate(`/quiz/${sessionId}/results`);
        return;
      }

      // Reset local state for next question
      setSelectedOption(null);
      setIsAnswered(false);
      setFeedback(null);
      questionStartTimeRef.current = Date.now();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load quiz session' });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate, addToast]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Continue to next question or results
  const handleContinue = useCallback(async () => {
    if (feedback && feedback.isComplete) {
      navigate(`/quiz/${sessionId}/results`);
    } else {
      await loadSession();
    }
  }, [feedback, sessionId, navigate, loadSession]);

  // Answer submission
  const handleSubmitAnswer = async (optionToSubmit?: string) => {
    const opt = optionToSubmit || selectedOption;
    if (!opt || submitting || isSubmittingRef.current || isAnswered || !sessionData?.currentQuestion) return;

    isSubmittingRef.current = true;
    setSubmitting(true);
    const responseTimeMs = Date.now() - questionStartTimeRef.current;

    try {
      const res = await ApiClient.submitQuizAnswer(sessionId!, {
        questionId: sessionData.currentQuestion.questionId,
        selectedOption: opt,
        responseTimeMs
      });

      setIsAnswered(true);

      // If already completed, directly navigate to results
      if (res.alreadyCompleted) {
        navigate(`/quiz/${sessionId}/results`);
        return;
      }

      // In TEST mode, auto-advance immediately or load next
      if (sessionData.session.mode === 'test') {
        if (res.sessionComplete) {
          navigate(`/quiz/${sessionId}/results`);
        } else {
          await loadSession();
        }
        return;
      }

      // In PRACTICE mode, set rich feedback with isComplete in one atomic call
      setFeedback({
        isCorrect: res.isCorrect,
        correctAnswer: res.correctAnswer,
        explanation: res.explanation,
        repetitionScheduled: res.repetitionScheduled,
        repeatedAtPosition: res.repeatedAtPosition,
        isComplete: Boolean(res.sessionComplete)
      });

      // Show toast if unlocked achievements
      if (res.earnedAchievements && res.earnedAchievements.length > 0) {
        for (const ach of res.earnedAchievements) {
          addToast({
            type: 'achievement',
            title: `🏆 Achievement Unlocked: ${ach.name}!`,
            message: ach.description
          });
        }
      }

      // If correct and mastered, small confetti burst
      if (res.isCorrect && res.progressUpdates?.masteryPromoted && res.progressUpdates?.newMastery === 'MASTERED') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
        addToast({
          type: 'success',
          title: '🌟 Question Mastered!',
          message: 'Repeated success achieved. This question is now in your Mastered repertoire!'
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to submit answer' });
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = async () => {
    if (!sessionData?.currentQuestion) return;
    try {
      const res = await ApiClient.toggleBookmark(sessionData.currentQuestion.questionId);
      setSessionData((prev: any) => ({
        ...prev,
        currentQuestion: {
          ...prev.currentQuestion,
          isBookmarked: res.bookmarked
        }
      }));
      addToast({
        type: 'info',
        message: res.bookmarked ? 'Question bookmarked' : 'Bookmark removed'
      });
    } catch (err: any) {
      addToast({ type: 'error', message: 'Failed to update bookmark' });
    }
  };

  // Keyboard shortcut listener (A, B, C, D, E, F, Enter, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toUpperCase();

      // If answered or feedback panel is showing, Enter or Space triggers continue
      if (isAnswered || feedback) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleContinue();
        }
        return;
      }

      if (submitting || isSubmittingRef.current) return;

      // Option selection by key (supports up to F)
      if (['A', 'B', 'C', 'D', 'E', 'F'].includes(key)) {
        e.preventDefault();
        setSelectedOption(key);
        handleSubmitAnswer(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, feedback, sessionData, selectedOption, submitting, handleContinue]);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  const currentQ = sessionData?.currentQuestion;
  const progress = sessionData?.progress;
  const session = sessionData?.session;

  if (!currentQ) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <CheckCircle2 size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Quiz Session Complete!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          All questions and adaptive reviews in this session have been answered.
        </p>
        <button
          onClick={() => navigate(`/quiz/${sessionId}/results`)}
          className="btn btn-primary"
        >
          View Quiz Results
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-screen">
      {/* Top Header Progress */}
      <QuizProgress
        currentPosition={progress.currentPosition}
        totalQuestions={progress.totalQuestions}
        completedCount={progress.completedCount}
        correctCount={progress.correctCount}
        incorrectCount={progress.incorrectCount}
        mode={session.mode}
        timeLimitSec={session.time_limit_sec}
        onTimeExpired={async () => {
          addToast({ type: 'info', message: 'Test time expired. Submitting test...' });
          await ApiClient.completeQuizSession(sessionId!);
          navigate(`/quiz/${sessionId}/results`);
        }}
      />

      {/* Question Card */}
      <QuestionCard
        questionText={currentQ.questionText}
        topicName={currentQ.topicName}
        subtopicName={currentQ.subtopicName}
        difficulty={currentQ.difficulty}
        isBookmarked={currentQ.isBookmarked}
        isRepeated={currentQ.isRepeated}
        repeatCount={currentQ.repeatCount}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Answer Options Grid */}
      <div className="options-grid">
        {currentQ.options.map((opt: any) => {
          const isSelected = selectedOption === opt.key;
          let isOptCorrect: boolean | null = null;
          if (feedback) {
            isOptCorrect = feedback.correctAnswer === opt.key;
          }

          return (
            <AnswerOption
              key={opt.key}
              optionKey={opt.key}
              optionText={opt.text}
              isSelected={isSelected}
              isCorrect={isOptCorrect}
              isRevealed={Boolean(feedback)}
              disabled={isAnswered || submitting}
              onSelect={() => {
                setSelectedOption(opt.key);
                handleSubmitAnswer(opt.key);
              }}
            />
          );
        })}
      </div>

      {/* Immediate Feedback Panel (Practice Mode) */}
      {feedback && (
        <FeedbackPanel
          isCorrect={feedback.isCorrect}
          userAnswer={selectedOption || ''}
          correctAnswer={feedback.correctAnswer}
          explanation={feedback.explanation}
          repetitionScheduled={feedback.repetitionScheduled}
          repeatedAtPosition={feedback.repeatedAtPosition}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
};
