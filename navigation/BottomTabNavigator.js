import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FillingScreen from '../screens/FillingScreen';
import SpendingScreen from '../screens/SpendingScreen';
import SpendingReportScreen from '../screens/SpendingReportScreen'
import FuelConsumptionScreen from '../screens/FuelConsumptionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MaterialCommunityIcons, Entypo, Foundation, Feather } from '@expo/vector-icons';
import { t } from '../locales'
import Colors from '../constants/Colors';

const BottomTab = createBottomTabNavigator();

function BottomTabNavigator({ navigation, route }) {
  return (
    <BottomTab.Navigator initialRouteName="Fuel">
      <BottomTab.Screen name="Fuel" component={FillingScreen}
        options={{
          ...getCommonOptions('fueling'),
          tabBarIcon: ({ focused }) => getIcon('MaterialCommunityIcons', "gas-station", focused),
        }}
      />
      <BottomTab.Screen name="Consumption" component={FuelConsumptionScreen}
        options={{
          ...getCommonOptions('consumption'),
          tabBarIcon: ({ focused }) => getIcon('MaterialCommunityIcons', "numeric", focused),
        }}
      />
      <BottomTab.Screen name="Spending" component={SpendingScreen}
        options={{
          ...getCommonOptions('spending'),
          tabBarIcon: ({ focused }) => getIcon('Foundation', "dollar", focused),
        }}
      />
      <BottomTab.Screen name="Report" component={SpendingReportScreen}
        options={{
          ...getCommonOptions('report'),
          tabBarIcon: ({ focused }) => getIcon('Entypo', "bar-graph", focused),
        }}
      />
      <BottomTab.Screen name="Settings" component={SettingsScreen}
        options={{
          ...getCommonOptions('settings'),
          tabBarIcon: ({ focused }) => getIcon('Feather', "settings", focused),
        }}
      />
    </BottomTab.Navigator>
  );
}

function getCommonOptions(titleToTranslate) {
  return {
    headerShown: false,
    title: t(titleToTranslate),
  }
}

function getIcon(type, name, focused) {
  const iconSize = 30
  if (type === 'MaterialCommunityIcons')
    return <MaterialCommunityIcons name={name} size={iconSize} style={{ color: getFocusedColor(focused) }} />
  if (type === 'Foundation')
    return <Foundation name={name} size={iconSize} style={{ color: getFocusedColor(focused) }} />
  if (type === 'Entypo')
    return <Entypo name={name} size={iconSize} style={{ color: getFocusedColor(focused) }} />
  if (type === 'Feather')
    return <Feather name={name} size={iconSize-3} style={{ color: getFocusedColor(focused) }} />
}

function getFocusedColor(focused) {
  return focused ? Colors.tabIconSelected : Colors.tabIconDefault
}

export default BottomTabNavigator
