import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import Colors from './constants/Colors'
import useCachedResources from './hooks/useCachedResources';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import LinkingConfiguration from './navigation/LinkingConfiguration';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import Bell from './components/Bell'
import BellProvider from './providers/BellProvider'

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
        {Platform.OS === 'ios' && <StatusBar barStyle="dark-content" />}
        <NavigationContainer linking={LinkingConfiguration}>
          <BellProvider>
            <Stack.Navigator>
              <Stack.Screen name="Fuel" component={BottomTabNavigator} options={({navigation}) => ({
                headerRight: () => (
                  <View style={{marginRight: 20}}>
                    <Bell onPress={() => navigation.navigate('Reminders') } />
                  </View>
                ),
              })}/>
            </Stack.Navigator>
          </BellProvider>
        </NavigationContainer>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
