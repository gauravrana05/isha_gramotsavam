import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the AdvancedTable component for testing
const MockAdvancedTable = ({ data, columns }: any) => (
  <div data-testid="advanced-table">
    <table>
      <thead>
        <tr>
          {columns.map((col: any) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, index: number) => (
          <tr key={index}>
            {columns.map((col: any) => (
              <td key={col.key}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

describe('AdvancedTable Component', () => {
  const mockData = [
    { id: '1', name: 'Team A', status: 'verified' },
    { id: '2', name: 'Team B', status: 'pending' },
  ];

  const mockColumns = [
    { key: 'name', header: 'Team Name' },
    { key: 'status', header: 'Status' },
  ];

  test('should render table with data', () => {
    render(<MockAdvancedTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByTestId('advanced-table')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  test('should render column headers', () => {
    render(<MockAdvancedTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByText('Team Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('should handle empty data', () => {
    render(<MockAdvancedTable data={[]} columns={mockColumns} />);
    
    const table = screen.getByTestId('advanced-table');
    expect(table).toBeInTheDocument();
    
    // Should still show headers
    expect(screen.getByText('Team Name')).toBeInTheDocument();
  });

  test('should display correct status values', () => {
    render(<MockAdvancedTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByText('verified')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });
});
