import React from 'react';
import { render } from '@testing-library/react-native';
import {
  buildFuelAverageChartData,
  buildSpendingChartData,
  SpendingChart,
} from '../components/SpendingChart';

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

describe('SpendingChart', () => {
  it('keeps each fueling as a separate consumption point', () => {
    const result = buildFuelAverageChartData([
      ['1', '01/01/2024', 'Gasoline', '', '', '', '', '', '', '10.50'],
      ['2', '15/01/2024', 'Gasoline', '', '', '', '', '', '', '12.00'],
    ]);

    expect(result.labels).toEqual(['01/01/2024', '15/01/2024']);
    expect(result.datasets[0].data).toEqual([10.5, 12]);
  });

  it('builds chart datasets from spending rows', () => {
    const rows = [
      ['1', '01/01/2024', '10.50', 'Fuel', '100', 'first', 'shop'],
      ['2', '15/01/2024', '5.25', 'Fuel', '150', 'second', 'shop'],
      ['3', '02/02/2024', '7.00', 'Maintenance', '200', 'repair', 'garage'],
    ];

    const result = buildSpendingChartData(rows, { totalLabel: 'Total' });

    expect(result.labels).toEqual(['01/2024', '02/2024']);
    expect(result.types).toEqual(['Fuel', 'Maintenance', 'Total']);
    expect(result.datasets[0].label).toBe('Fuel');
    expect(result.datasets[0].data).toEqual([15.75, 0]);
    expect(result.datasets[1].label).toBe('Maintenance');
    expect(result.datasets[1].data).toEqual([0, 7]);
    expect(result.datasets[2].label).toBe('Total');
    expect(result.datasets[2].data).toEqual([15.75, 7]);
  });

  it('renders the chart title and legend when visible', () => {
    const chartData = buildSpendingChartData([
      ['1', '01/01/2024', '10.50', 'Fuel', '100', 'first', 'shop'],
    ], { totalLabel: 'Total' });

    const { getByText } = render(
      <SpendingChart
        visible
        title="Spending over time"
        chartData={chartData}
        currency="R$"
        closeLabel="Close"
        totalLabel="Total"
        onClose={() => {}}
      />
    );

    expect(getByText('Spending over time')).toBeTruthy();
    expect(getByText('Fuel')).toBeTruthy();
    expect(getByText('Close')).toBeTruthy();
  });
});
