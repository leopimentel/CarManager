import { Alert } from 'react-native';
import { t } from '../locales';

/**
 * Shows a confirmation alert with customizable title, message, and button actions.
 * @param {string} title - The title of the alert.
 * @param {string} [message=''] - The message to display in the alert (optional).
 * @param {Function} onConfirm - The callback function to execute on confirmation.
 * @param {string} [confirmText] - Custom text for the confirm button (defaults to translated 'yes').
 * @param {string} [cancelText] - Custom text for the cancel button (defaults to translated 'no').
 */
export const showConfirmAlert = (
  title,
  message = '',
  onConfirm,
  confirmText = t('yes'),
  cancelText = t('no')
) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: confirmText,
        onPress: onConfirm,
      },
      {
        text: cancelText,
        style: 'cancel',
      },
    ]
  );
};

/**
 * Shows a simple message alert with a single OK button.
 * @param {string} title - The title of the alert.
 * @param {string} [message=''] - The message to display in the alert (optional).
 * @param {Function} [onOk] - Optional callback function to execute when OK is pressed.
 * @param {string} [okText] - Custom text for the OK button (defaults to translated 'ok').
 */
export const showMessageAlert = (
  title,
  message = '',
  onOk = () => {},
  okText = t('ok')
) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: okText,
        onPress: onOk,
        style: 'cancel',
      },
    ]
  );
};
