import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet, View } from 'react-native';
import Colors from './constants/Colors'
import useCachedResources from './hooks/useCachedResources';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import Bell from './components/Bell'
import BellProvider from './providers/BellProvider'
import ReminderScreen from './screens/ReminderScreen';
import RemindersScreen from './screens/RemindersScreen';

import { t } from './locales'

const Stack = createStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    accent: Colors.accent,
  },
};

export default function App(_) {
  const isLoadingComplete = useCachedResources();

  if (!isLoadingComplete) return null;
  
  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        <NavigationContainer>
          <BellProvider>
            <Stack.Navigator>
              <Stack.Screen name="Filling" component={BottomTabNavigator} options={({navigation, route}) => { 
                return {
                  ...getOptionsNavigation(navigation),
                  ...getHeaderStyles(),
                  headerTitle: getHeaderTitle(route),
                }}
              }/>

              <Stack.Screen name="Reminder" component={ReminderScreen}
                options={{
                  ...getHeaderStyles(),
                  title: t('reminder'),
                }}
              />

              <Stack.Screen name="Reminders" component={RemindersScreen}
                options={{
                  ...getHeaderStyles(),          
                  title: t('reminders'),
                }}
              />
            </Stack.Navigator>
          </BellProvider>
        </NavigationContainer>
      </View>
    </PaperProvider>
  );

  function getHeaderStyles() {
    return {
      headerTintColor: Colors.headerTintColor,
      headerStyle: {
        backgroundColor: Colors.headerStyleBackgroundColor,
      }
    }
  }

  function getOptionsNavigation(navigation) {
    return {
      headerRight: () => (
        <View style={{ marginRight: 20 }}>
          <Bell onPress={() => navigation.navigate('Reminders', { screen: 'Reminders' })} />
        </View>
      ),
      headerShown: true,
    };
  }
}

function getHeaderTitle(route) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? "Fuel";
  console.log('Nome atual' + routeName)

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
    case 'Reminder':
      return t('reminder');
    case 'Reminders':
      return t('reminders');
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
