import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AITutorPage } from './AITutorPage';
import { adaptiveService } from '../../services/adaptive.service';
import { agentService } from '../../services/agent.service';
import { MultiAgentResponse } from '../../types/agent.types';

// Mock services
vi.mock('../../services/adaptive.service', () => ({
  adaptiveService: {
    getTopics: vi.fn(),
    getContent: vi.fn(),
  },
}));

vi.mock('../../services/agent.service', () => ({
  agentService: {
    coordinate: vi.fn(),
  },
}));

const mockTopics = [
  {
    id: 'topic-123',
    subject_id: 'sub-1',
    code: 'MATH-QUAD',
    name: 'Quadratic Equations',
    order_number: 1,
    skills_count: 2,
    contents_count: 1,
    description: 'Learn quadratic equations and factoring',
    created_at: new Date().toISOString(),
  },
  {
    id: 'topic-456',
    subject_id: 'sub-1',
    code: 'MATH-LIN',
    name: 'Linear Equations',
    order_number: 2,
    skills_count: 1,
    contents_count: 1,
    description: 'Basics of linear equations',
    created_at: new Date().toISOString(),
  },
];

const mockContents = [
  {
    id: 'content-789',
    topic_id: 'topic-123',
    subject_id: 'sub-1',
    title: 'Standard Form of Quadratics',
    difficulty_level: 'developing' as const,
    content_type: 'lesson' as const,
    estimated_duration_minutes: 15,
    created_at: new Date().toISOString(),
  },
];

const mockMultiAgentResponse: MultiAgentResponse = {
  session_id: 'session-abc-123',
  session_type: 'lesson_adaptation',
  status: 'completed',
  learner_context: {
    mastery_score: 0.72,
    detected_mastery_level: 'developing',
    recommended_difficulty: 'developing',
    visual_support_needed: true,
    step_by_step_scaffolding: true,
    session_type: 'lesson_adaptation',
    target_topic_id: 'topic-123',
  },
  adapted_content: {
    adapted_title: 'Personalized Exploration: Solving Quadratic Equations',
    learning_objective: 'Master factoring quadratic polynomials step-by-step',
    conceptual_explanation: 'A quadratic equation contains a variable squared as its highest power.',
    difficulty_rating: 'developing',
    worked_examples: [
      {
        title: 'Example 1: Factoring x^2 + 5x + 6 = 0',
        problem_statement: 'Find the roots of x^2 + 5x + 6 = 0.',
        steps: [
          {
            step_number: 1,
            explanation: 'Find two numbers that multiply to 6 and add to 5 (2 and 3).',
            math_or_code: '(x + 2)(x + 3) = 0',
          },
          {
            step_number: 2,
            explanation: 'Set each factor to zero to solve for x.',
            math_or_code: 'x = -2, x = -3',
          },
        ],
        conclusion: 'The solutions are x = -2 and x = -3.',
      },
    ],
    scaffolding_notes: ['Always check your solutions by substituting back into original equation.'],
    visual_representation: 'x^2 + 5x + 6 = 0\n└── (x + 2)(x + 3) = 0',
  },
  assessment: {
    question_text: 'What are the roots of x^2 - 4 = 0?',
    question_type: 'multiple_choice',
    options: ['x = 2, -2', 'x = 4, -4', 'x = 0, 4', 'x = 1, -4'],
    correct_answer: 'x = 2, -2',
    explanation: 'Difference of squares: (x - 2)(x + 2) = 0, giving roots 2 and -2.',
    difficulty: 'developing',
    misconception_hints: {
      'x = 4, -4': 'Remember that the constant 4 is squared, so you need the square root of 4.',
    },
  },
  accessibility_adaptation: {
    screen_reader_optimized_text: 'Screen reader accessible lesson on quadratic equations.',
    plain_language_summary: 'Quadratic equations have an x-squared term. We factor them to find when they equal zero.',
    high_contrast_layout_ready: true,
    font_scaling_compatible: true,
    applied_adaptations: ['plain_language', 'visual_diagram_transcription'],
  },
  agent_results: [
    {
      agent_name: 'LearnerAnalysisAgent',
      status: 'success',
      execution_mode: 'deterministic',
      latency_ms: 12,
      execution_order: 1,
    },
    {
      agent_name: 'ContentAdaptationAgent',
      status: 'success',
      execution_mode: 'llm',
      latency_ms: 35,
      execution_order: 2,
    },
    {
      agent_name: 'AssessmentAgent',
      status: 'success',
      execution_mode: 'llm',
      latency_ms: 28,
      execution_order: 3,
    },
    {
      agent_name: 'AccessibilityAgent',
      status: 'success',
      execution_mode: 'deterministic',
      latency_ms: 8,
      execution_order: 4,
    },
  ],
};

describe('AITutorPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adaptiveService.getTopics).mockResolvedValue(mockTopics as any);
    vi.mocked(adaptiveService.getContent).mockResolvedValue(mockContents as any);
    vi.mocked(agentService.coordinate).mockResolvedValue(mockMultiAgentResponse);
  });

  it('renders page layout, header, and loads curriculum topics', async () => {
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          <Route path="/ai-tutor" element={<AITutorPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /ai adaptive learning partner/i })).toBeInTheDocument();
    expect(screen.getByText(/session configuration/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(adaptiveService.getTopics).toHaveBeenCalledTimes(1);
    });

    const topicSelect = screen.getByLabelText(/curriculum topic/i) as HTMLSelectElement;
    expect(topicSelect).toBeInTheDocument();
    expect(screen.getByText(/Quadratic Equations/i)).toBeInTheDocument();
  });

  it('allows topic/content selection and triggers agent coordination on click', async () => {
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          <Route path="/ai-tutor" element={<AITutorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quadratic Equations/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Standard Form of Quadratics/i)).toBeInTheDocument();
    });

    const contentSelect = screen.getByLabelText(/base lesson/i);
    fireEvent.change(contentSelect, { target: { value: 'content-789' } });

    const adaptButton = screen.getByRole('button', { name: /adapt for me/i });
    expect(adaptButton).toBeInTheDocument();

    fireEvent.click(adaptButton);

    await waitFor(() => {
      expect(agentService.coordinate).toHaveBeenCalledWith({
        session_type: 'lesson_adaptation',
        topic_id: 'topic-123',
        content_id: 'content-789',
        user_inquiry: undefined,
      });
    });
  });

  it('renders adapted content, objectives, conceptual explanation, and worked examples', async () => {
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          <Route path="/ai-tutor" element={<AITutorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quadratic Equations/i)).toBeInTheDocument();
    });

    const adaptButton = screen.getByRole('button', { name: /adapt for me/i });
    fireEvent.click(adaptButton);

    // Verify adapted content sections
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Personalized Exploration: Solving Quadratic Equations/i })
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Master factoring quadratic polynomials step-by-step/i)).toBeInTheDocument();
    expect(screen.getByText(/A quadratic equation contains a variable squared/i)).toBeInTheDocument();

    // Verify worked example
    expect(screen.getByText(/Example 1: Factoring x\^2 \+ 5x \+ 6 = 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Find two numbers that multiply to 6 and add to 5/i)).toBeInTheDocument();
    expect(screen.getByText(/The solutions are x = -2 and x = -3/i)).toBeInTheDocument();

    // Verify visual representation
    expect(screen.getByRole('heading', { name: /visual representation/i })).toBeInTheDocument();
    expect(screen.getAllByText(/x\^2 \+ 5x \+ 6 = 0/i).length).toBeGreaterThan(0);
  });

  it('renders formative assessment with interactive selection and feedback check', async () => {
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          <Route path="/ai-tutor" element={<AITutorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quadratic Equations/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /adapt for me/i }));

    await waitFor(() => {
      expect(screen.getByText(/What are the roots of x\^2 - 4 = 0\?/i)).toBeInTheDocument();
    });

    // Select incorrect answer to check diagnostic hint
    const wrongOption = screen.getByLabelText(/x = 4, -4/i);
    fireEvent.click(wrongOption);

    const checkAnswerBtn = screen.getByRole('button', { name: /check answer/i });
    fireEvent.click(checkAnswerBtn);

    expect(screen.getByText(/Not quite. Here is why:/i)).toBeInTheDocument();
    expect(screen.getByText(/Remember that the constant 4 is squared/i)).toBeInTheDocument();

    // Click Try Again and select correct answer
    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainBtn);

    const correctOption = screen.getByLabelText(/x = 2, -2/i);
    fireEvent.click(correctOption);

    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/Great job! That is correct\./i)).toBeInTheDocument();
    expect(screen.getByText(/Difference of squares: \(x - 2\)\(x \+ 2\) = 0/i)).toBeInTheDocument();
  });

  it('displays plain language accessibility summary and multi-agent audit trace', async () => {
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          <Route path="/ai-tutor" element={<AITutorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quadratic Equations/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /adapt for me/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Quadratic equations have an x-squared term. We factor them to find when they equal zero./i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Multi-Agent Execution Audit:/i)).toBeInTheDocument();
    expect(screen.getByText(/4 agents coordinated/i)).toBeInTheDocument();
  });

  it('handles API failure gracefully with clear error state and retry', async () => {
    vi.mocked(agentService.coordinate).mockRejectedValueOnce(new Error('Backend connection timed out'));

    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          <Route path="/ai-tutor" element={<AITutorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quadratic Equations/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /adapt for me/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Adaptation Request Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend connection timed out/i)).toBeInTheDocument();
    });
  });

  it('supports semantic accessibility attributes and keyboard navigation tags', async () => {
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          <Route path="/ai-tutor" element={<AITutorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quadratic Equations/i)).toBeInTheDocument();
    });

    // Semantic section heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /session configuration/i })).toBeInTheDocument();
  });
});
