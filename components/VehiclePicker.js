import React from 'react';
import { Picker } from '@react-native-picker/picker';
import { ucfirst } from '../utils/string';
import { updatePrimaryVehicle } from '../database/queries';
import { t } from '../locales'

const VehiclePicker = ({ vehicles, vehicleId, setVehicleId, style }) => {
  if (vehicles.length <= 1) {
    return null;
  }

  return (
    <Picker
      dropdownIconColor="#000"
      style={style}
      label={t('vehicle')}
      selectedValue={vehicleId}
      onValueChange={async (itemValue) => {
        setVehicleId(itemValue);
        await updatePrimaryVehicle(itemValue);
      }}
      testID="picker"
    >
      {vehicles.map(vehicle => (
        <Picker.Item
          label={ucfirst(vehicle.value)}
          value={vehicle.index}
          key={vehicle.index}
        />
      ))}
    </Picker>
  );
};

export default VehiclePicker;
