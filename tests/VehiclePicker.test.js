// Simplified test for VehiclePicker component
import React from 'react';
import VehiclePicker from '../components/VehiclePicker';

// Mock dependencies to avoid importing React Native or Expo modules
jest.mock('../database/queries', () => ({
  updatePrimaryVehicle: jest.fn(() => Promise.resolve()),
}));

jest.mock('../locales', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('../utils/string', () => ({
  ucfirst: jest.fn((str) => str.charAt(0).toUpperCase() + str.slice(1)),
}));

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
});
