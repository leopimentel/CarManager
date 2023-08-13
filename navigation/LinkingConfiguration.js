import * as Linking from 'expo-linking';

export default {
  prefixes: [Linking.createURL('/')],
  config: {
    Root: {
      path: 'root',
      screens: {
        Home: 'home',
        Links: 'links',
      },
    },
  },
};
