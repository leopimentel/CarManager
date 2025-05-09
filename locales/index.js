// import { Platform, NativeModules } from 'react-native';
import I18n from 'i18n-js';
import en from './en-US';
import pt from './pt-BR';

// const normalizeTranslate = {
//   'en_US': 'en_US',
//   'pt_BR': 'pt_BR',
//   'en': 'en_US',
//   'pt_US': 'pt_BR',
// };

// const getLanguageByDevice = () => {
//   return Platform.OS === 'ios'
//     ? NativeModules.SettingsManager.settings.AppleLocale
//     : NativeModules.I18nManager.localeIdentifier
// };

I18n.translations = {
  'en_US': en,
  'pt_BR': pt,
};

const setLanguageToI18n = () => {
  // const language = getLanguageByDevice();
  // const translateNormalize = normalizeTranslate[language];
  // const iHaveThisLanguage = I18n.translations.hasOwnProperty(translateNormalize);
  // iHaveThisLanguage
    // ? I18n.locale = 'pt_BR' //@todo change to choose language automatically
    // : I18n.defaultLocale = 'en_US';
  I18n.locale = I18n.defaultLocale = 'pt_BR'
};

setLanguageToI18n();

function t(key, params) {
  return I18n.t(key, params);
}

/**
 * Based on https://medium.com/reactbrasil/internacionaliza%C3%A7%C3%A3o-em-react-native-77fb1a56f8e9
 */
export {
  t
}
