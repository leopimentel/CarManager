import React from 'react';
import { render } from '@testing-library/react-native';
import {
  buildFuelAverageChartData,
  buildSpendingChartData,
  BarChart,
} from '../components/BarChart';

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));
import { t } from '../locales'

describe('BarChart', () => {
  it('keeps each fueling as a separate consumption point', () => {
    const fullTankFueling = ['1', '01/01/2024', 'Gasoline', '', '', '', '', '', '', '10.50'];
    const secondFullTankFueling = ['2', '15/01/2024', 'Gasoline', '', '', '', '', '', '', '12.00'];
    fullTankFueling[10] = t('yes');
    secondFullTankFueling[10] = t('yes');

    const result = buildFuelAverageChartData([fullTankFueling, secondFullTankFueling]);

    expect(result.labels).toEqual(['01/24', '01/24']);
    expect(result.datasets[0].data).toEqual([10.5, 12]);
  });

  it('excludes fuelings that are not full tank', () => {
    const fullTankFueling = ['1', '01/01/2024', 'Gasoline', '', '', '', '', '', '', '10.50', ''];
    const partialFueling = ['2', '15/01/2024', 'Gasoline', '', '', '', '', '', '', '12.00', ''];
    fullTankFueling[10] = t('yes');
    partialFueling[10] = t('no');

    const result = buildFuelAverageChartData([fullTankFueling, partialFueling]);

    expect(result.labels).toEqual(['01/24']);
    expect(result.datasets[0].data).toEqual([10.5]);
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
      <BarChart
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
