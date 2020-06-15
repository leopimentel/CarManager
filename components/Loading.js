import * as React from 'react';
import { ActivityIndicator, Colors } from 'react-native-paper';

export function Loading(props) {
  return props.loading && <ActivityIndicator animating={true} color={Colors.red800} style={{ backgroundColor: Colors.grey100 }}/>;
}
