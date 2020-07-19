import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as React from 'react';

import FillingScreen from '../screens/FillingScreen';
import SpendingScreen from '../screens/SpendingScreen';
import SpendingReportScreen from '../screens/SpendingReportScreen'
import FuelConsumptionScreen from '../screens/FuelConsumptionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MaterialCommunityIcons, Entypo, Foundation, Feather } from '@expo/vector-icons';
import { t } from '../locales'
const BottomTab = createBottomTabNavigator();
const INITIAL_ROUTE_NAME = 'Fuel';
import Colors from '../constants/Colors';

function BottomTabNavigator({ navigation, route }) {
  // Set the header title on the parent stack navigator depending on the
  // currently active tab. Learn more in the documentation:
  // https://reactnavigation.org/docs/en/screen-options-resolution.html
   navigation.setOptions({ headerTitle: getHeaderTitle(route), headerTintColor: Colors.headerTintColor,
   headerStyle: {
     backgroundColor: Colors.headerStyleBackgroundColor,
     height: 75
   } });
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
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="numeric" size={iconSize} style={{ color: getFocusedColor(focused) }} />,
        }}
      />
      <BottomTab.Screen
        name="Spending"
        component={SpendingScreen}
        options={{
          title: t('spending'),
          tabBarIcon: ({ focused }) => <Foundation name="dollar" size={iconSize} style={{ color: getFocusedColor(focused) }} />,
        }}
      />
      <BottomTab.Screen
        name="Report"
        component={SpendingReportScreen}
        options={{
          title: t('report'),
          tabBarIcon: ({ focused }) => <Entypo name="bar-graph" size={iconSize} style={{ color: getFocusedColor(focused) }} />,
        }}
      />
      <BottomTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings'),
          tabBarIcon: ({ focused }) => <Feather name="settings" size={iconSize} style={{ color: getFocusedColor(focused) }} />,
        }}
      />
    </BottomTab.Navigator>
  );
}

function getFocusedColor(focused) {
  return focused ? Colors.tabIconSelected : Colors.tabIconDefault
}

function getHeaderTitle(route) {
  const routeName = route.state?.routes[route.state.index]?.name ?? INITIAL_ROUTE_NAME;

  switch (routeName) {
    case 'Fuel':
      return t('fueling');
    case 'Consumption':
      return t('consumption');
    case 'Spending':
      return t('spending');
    case 'Report':
      return t('report');
    case 'Settings':
      return t('settings');
  }
}

export default BottomTabNavigator
