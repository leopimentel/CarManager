import * as React from 'react';
import { ActivityIndicator } from 'react-native-paper';
import Colors from '../constants/Colors'

export function Loading(props) {
  return props.loading && <ActivityIndicator animating={true} color={Colors.loadingColor} style={{ backgroundColor: Colors.loadingBackgroundColor }}/>;
}
