// Unit test for VehiclePicker component
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import VehiclePicker from '../components/VehiclePicker';

// Mock dependencies to avoid importing React Native or Expo modules
jest.mock('../database/queries', () => ({
  updatePrimaryVehicle: jest.fn(() => Promise.resolve()),
}));

// jest.mock('../locales', () => ({
//   t: jest.fn((key) => key),
// }));

// jest.mock('../utils/string', () => ({
//   ucfirst: jest.fn((str) => str.charAt(0).toUpperCase() + str.slice(1)),
// }));

// Mock the Picker component to test onValueChange
// jest.mock('@react-native-picker/picker', () => {
//   const Picker = ({ children, selectedValue, onValueChange, testID, style }) => {
//     // Simulate a component that can trigger onValueChange for testing
//     const mockChange = (value) => {
//       if (onValueChange) {
//         onValueChange(value);
//       }
//     };
//     return {
//       props: { children, selectedValue, testID, style },
//       mockChange, // Expose a method to simulate value change
//     };
//   };
//   Picker.Item = ({ label, value }) => ({ label, value });
//   return { Picker };
// });

describe('VehiclePicker', () => {
  const mockSetVehicleId = jest.fn();
  const vehicles = [
    { index: 1, value: 'car1' },
    { index: 2, value: 'car2' },
    { index: 3, value: 'car3' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when there are no vehicles', () => {
    const result = VehiclePicker({
      vehicles: [],
      vehicleId: 1,
      setVehicleId: mockSetVehicleId,
      style: {},
    });
    expect(result).toBeNull();
  });

  it('returns null when there is only one vehicle', () => {
    const result = VehiclePicker({
      vehicles: [{ index: 1, value: 'car1' }],
      vehicleId: 1,
      setVehicleId: mockSetVehicleId,
      style: {},
    });
    expect(result).toBeNull();
  });

  it('renders picker for multiple vehicles', () => {
    const result = VehiclePicker({
      vehicles: vehicles,
      vehicleId: 1,
      setVehicleId: mockSetVehicleId,
      style: {},
    });
    expect(result).toBeDefined();
  });

  it('handles value change and updates vehicle ID', async () => {
    const result = VehiclePicker({
      vehicles: vehicles,
      vehicleId: 1,
      setVehicleId: mockSetVehicleId,
      style: {},
    });
    // Simulate value change to cover lines 19 and 20
    await result.props.onValueChange(2);
    expect(mockSetVehicleId).toHaveBeenCalledWith(2);
    expect(require('../database/queries').updatePrimaryVehicle).toHaveBeenCalledWith(2);
  });
});
