import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as React from 'react';

import FillingScreen from '../screens/FillingScreen';
import FuelConsumptionScreen from '../screens/FuelConsumptionScreen';
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { t } from '../locales'
const BottomTab = createBottomTabNavigator();
const INITIAL_ROUTE_NAME = 'Home';
import Colors from '../constants/Colors';

function BottomTabNavigator({ navigation, route }) {
  // Set the header title on the parent stack navigator depending on the
  // currently active tab. Learn more in the documentation:
  // https://reactnavigation.org/docs/en/screen-options-resolution.html
  navigation.setOptions({ headerTitle: getHeaderTitle(route) });
  const iconSize = 30

  return (
    <BottomTab.Navigator initialRouteName={INITIAL_ROUTE_NAME}>
      <BottomTab.Screen
        name="Fuel"
        component={FillingScreen}
        options={{
          title: t('fueling'),
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons
          style={{ color: getFocusedColor(focused) }}
          name="gas-station" size={iconSize}  />,
        }}
      />
      <BottomTab.Screen
        name="Consumption"
        component={FuelConsumptionScreen}
        options={{
          title: t('consumption'),
          tabBarIcon: ({ focused }) => <Entypo name="bar-graph" size={iconSize} style={{ color: getFocusedColor(focused) }} />,
        }}
      />
      {/* <BottomTab.Screen
        name="Spending"
        component={LinksScreen}
        options={{
          title: t('spending'),
          tabBarIcon: ({ focused }) => <Foundation name="dollar" size={iconSize} style={{ color: getFocusedColor(focused) }} />,
        }}
      />
      <BottomTab.Screen
        name="Report"
        component={LinksScreen}
        options={{
          title: t('report'),
          tabBarIcon: ({ focused }) => <Foundation name="list-number" size={iconSize} style={{ color: getFocusedColor(focused) }} />,
        }}
      /> */}
    </BottomTab.Navigator>
  );
}

function getFocusedColor(focused) {
  return focused ? Colors.tabIconSelected : Colors.tabIconDefault
}

function getHeaderTitle(route) {
  const routeName = route.state?.routes[route.state.index]?.name ?? INITIAL_ROUTE_NAME;

  switch (routeName) {
    case 'Fueling':
      return t('fueling');
    case 'Consumption':
      return t('consumption');
    case 'Spending':
      return t('spending');
    case 'Report':
      return t('report');
  }
}

export default BottomTabNavigator
