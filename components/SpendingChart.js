import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import moment from 'moment';

const chartColors = [
  '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63'
];
const totalColor = '#222';

const getColorForType = (type, idx, totalLabel) =>
  type === totalLabel ? totalColor : chartColors[idx % chartColors.length];

export const buildSpendingChartData = (tableData = [], options = {}) => {
  const totalLabel = options.totalLabel || 'Total';
  const grouped = {};

  tableData.forEach((row) => {
    if (!row || row.length < 4) {
      return;
    }

    const type = row[3];
    const date = moment(row[1], 'DD/MM/YYYY').format('MM/YYYY');

    if (!grouped[type]) {
      grouped[type] = {};
    }

    if (!grouped[type][date]) {
      grouped[type][date] = 0;
    }

    grouped[type][date] += parseFloat(row[2]) || 0;
  });

  const allDates = Array.from(
    new Set(Object.values(grouped).flatMap((typeObj) => Object.keys(typeObj)))
  ).sort();

  const types = Object.keys(grouped);
  const datasets = types.map((type, idx) => ({
    data: allDates.map((date) => grouped[type][date] || 0),
    color: () => getColorForType(type, idx, totalLabel),
    strokeWidth: 2,
    label: type,
  }));

  const totalData = allDates.map((date) =>
    types.reduce((sum, type) => sum + (grouped[type][date] || 0), 0)
  );

  datasets.push({
    data: totalData,
    color: () => totalColor,
    strokeWidth: 0.1,
    label: totalLabel,
  });

  types.push(totalLabel);

  return {
    labels: allDates,
    datasets,
    types,
  };
};

export const SpendingChart = ({
  visible,
  title,
  chartData,
  currency = '',
  closeLabel = 'Close',
  totalLabel = 'Total',
  onClose,
}) => {
  const [tooltip, setTooltip] = useState(null);

  if (!visible) {
    return null;
  }

  const safeChartData = chartData || { labels: [], datasets: [], types: [] };
  const chartWidth = Math.max(
    Dimensions.get('window').width,
    safeChartData.labels.length * 60
  );

  const handleClose = () => {
    setTooltip(null);
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={{ flex: 1, padding: 10, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>{title}</Text>
        <ScrollView horizontal>
          <View>
            <LineChart
              data={{
                labels: safeChartData.labels,
                datasets: safeChartData.datasets,
              }}
              width={chartWidth}
              height={650}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  strokeOpacity: 0,
                },
                propsForDots: { r: '10', strokeWidth: '0' },
              }}
              onDataPointClick={(data) => {
                setTooltip({
                  x: data.x,
                  y: data.y,
                  value: Math.round((Number(data.value) || 0) * 100) / 100,
                  label: safeChartData.labels[data.index] || '',
                  type: data.dataset?.label || totalLabel,
                });
              }}
            />
            {tooltip && (
              <View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  left: Math.max(tooltip.x - 60, 10),
                  top: Math.max(tooltip.y + 30, 10),
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: '#ccc',
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  minWidth: 100,
                  zIndex: 999,
                }}
              >
                <Text
                  style={{
                    fontWeight: 'bold',
                    color: getColorForType(
                      tooltip.type,
                      safeChartData.types.indexOf(tooltip.type),
                      totalLabel
                    ),
                  }}
                >
                  {tooltip.type}
                </Text>
                <Text>{tooltip.label}</Text>
                <Text>{currency}{tooltip.value}</Text>
                <TouchableOpacity onPress={() => setTooltip(null)} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                  <Text style={{ color: '#007AFF', fontSize: 12 }}>{closeLabel}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {safeChartData.types.map((type, idx) => (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, marginBottom: 5 }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: getColorForType(type, idx, totalLabel),
                  marginRight: 5,
                }}
              />
              <Text>{type}</Text>
            </View>
          ))}
        </View>

        <Button mode="contained" style={{ marginTop: 10 }} onPress={handleClose}>
          {closeLabel}
        </Button>
      </View>
    </Modal>
  );
};

export default SpendingChart;
