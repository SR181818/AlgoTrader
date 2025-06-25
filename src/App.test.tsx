import React from 'react';
import { render, screen } from '@testing-library/react';
import AppWithMetrics from './App';

describe('App', () => {
  it('renders without crashing and shows navigation', () => {
    render(<AppWithMetrics />);
    // Check for a navigation link or main heading
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
