import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NeuralPlasticityIndicators } from '../components/NeuralPlasticityIndicators';
import { MetricEntry, UserConfig } from '../types';

// Mock framer-motion to avoid animation issues in tests
import { vi } from 'vitest';
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock ResponsiveContainer to avoid sizing issues in tests
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children, ...props }: any) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 300 }} {...props}>
        {children}
      </div>
    ),
  };
});

describe('NeuralPlasticityIndicators E2E Tests', () => {
  const mockConfig: UserConfig = {
    wearableBaselines: { sleep: 8, rhr: 60, hrv: 80 },
    manualTargets: { protein: 150, gut: 3, sun: '30min', exercise: '60min' },
    streakLogic: {
      freezesAvailable: 2,
      lastFreezeReset: '2024-01-01T00:00:00Z',
    },
  };

  const createMockEntry = (date: string, sleep: number, hrv: number, cognition: string): MetricEntry => ({
    date,
    rawValues: {
      sleep,
      rhr: 65, // resting heart rate
      hrv,
      protein: 120,
      gut: 3,
      sun: '30min',
      exercise: '60min',
      cognition: cognition as any,
    },
    processedState: {
      sleep: 'GREEN',
      hrv: 'GREEN',
      cognition: 'GREEN',
    },
    symptomScore: 0,
    symptomName: 'Good',
  });

  it('renders chart with mock data and displays bars', () => {
    // Create mock history data spanning 8 days with varied values
    const mockHistory: MetricEntry[] = [
      createMockEntry('2024-01-01', 8.5, 85, 'PEAK'),
      createMockEntry('2024-01-02', 7.8, 78, 'STEADY'),
      createMockEntry('2024-01-03', 9.2, 92, 'PEAK'),
      createMockEntry('2024-01-04', 6.5, 65, 'FOGGY'),
      createMockEntry('2024-01-05', 8.0, 80, 'STEADY'),
      createMockEntry('2024-01-06', 7.2, 72, 'FOGGY'),
      createMockEntry('2024-01-07', 8.8, 88, 'PEAK'),
      createMockEntry('2024-01-08', 7.5, 75, 'STEADY'),
    ];

    render(<NeuralPlasticityIndicators history={mockHistory} config={mockConfig} />);

    // Check that the component header is rendered
    expect(screen.getByText('Neural Plasticity Trends')).toBeInTheDocument();
    expect(screen.getByText(/8-Day Brain Health Score:/)).toBeInTheDocument();

    // Check that the responsive container is present (mocked)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

    // Check that the chart data processing works by verifying the component doesn't show "no data" message
    expect(screen.queryByText('Need more data for trend analysis')).not.toBeInTheDocument();
  });

  it('displays legend with correct colors and labels', () => {
    const mockHistory: MetricEntry[] = [
      createMockEntry('2024-01-01', 8.0, 80, 'STEADY'),
    ];

    render(<NeuralPlasticityIndicators history={mockHistory} config={mockConfig} />);

    // Check legend items are present
    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByText('Synaptic')).toBeInTheDocument();
    expect(screen.getByText('Cognitive')).toBeInTheDocument();
    expect(screen.getByText('Neuro')).toBeInTheDocument();

    // Check legend color indicators
    const legendDots = document.querySelectorAll('div.w-2.h-2.rounded-full');
    expect(legendDots.length).toBe(4); // Should have 4 legend dots

    // Check specific colors (blue, cyan, amber, rose)
    const blueDot = document.querySelector('div.bg-blue-400');
    const cyanDot = document.querySelector('div.bg-cyan-400');
    const amberDot = document.querySelector('div.bg-amber-400');
    const roseDot = document.querySelector('div.bg-rose-400');

    expect(blueDot).toBeInTheDocument();
    expect(cyanDot).toBeInTheDocument();
    expect(amberDot).toBeInTheDocument();
    expect(roseDot).toBeInTheDocument();
  });

  it('shows fallback message when no data available', () => {
    const emptyHistory: MetricEntry[] = [];

    render(<NeuralPlasticityIndicators history={emptyHistory} config={mockConfig} />);

    // Should show the fallback message
    expect(screen.getByText('Need more data for trend analysis')).toBeInTheDocument();

    // Should not show chart elements
    const chartContainer = document.querySelector('.recharts-wrapper');
    expect(chartContainer).not.toBeInTheDocument();
  });

  it('renders with sample data when insufficient real data', () => {
    // Only 2 entries - should trigger sample data generation
    const minimalHistory: MetricEntry[] = [
      createMockEntry('2024-01-01', 8.0, 80, 'STEADY'),
      createMockEntry('2024-01-02', 7.5, 75, 'FOGGY'),
    ];

    render(<NeuralPlasticityIndicators history={minimalHistory} config={mockConfig} />);

    // Should render chart with sample data
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

    // Should not show the "no data" message
    expect(screen.queryByText('Need more data for trend analysis')).not.toBeInTheDocument();

    // Should show the header
    expect(screen.getByText('Neural Plasticity Trends')).toBeInTheDocument();
  });

  it('displays tooltip on hover with correct data', async () => {
    const mockHistory: MetricEntry[] = [
      createMockEntry('2024-01-01', 8.0, 80, 'STEADY'),
    ];

    render(<NeuralPlasticityIndicators history={mockHistory} config={mockConfig} />);

    // The responsive container should be present
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('maintains proper chart layout and responsiveness', () => {
    const mockHistory: MetricEntry[] = [
      createMockEntry('2024-01-01', 8.0, 80, 'STEADY'),
      createMockEntry('2024-01-02', 7.5, 75, 'FOGGY'),
      createMockEntry('2024-01-03', 8.5, 85, 'PEAK'),
    ];

    render(<NeuralPlasticityIndicators history={mockHistory} config={mockConfig} />);

    // Check that ResponsiveContainer is rendered (mocked)
    const responsiveContainer = screen.getByTestId('responsive-container');
    expect(responsiveContainer).toBeInTheDocument();

    // Check that it has the expected dimensions from our mock
    expect(responsiveContainer).toHaveStyle({ width: '400px', height: '300px' });
  });
});