import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Alert } from 'react-native';
import { showConfirmAlert, showMessageAlert } from '../utils/alert';

// Mock the Alert module
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// // Mock the translation function
jest.mock('../locales', () => ({
  t: jest.fn((key) => key),
}));

describe('Alert Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showConfirmAlert', () => {
    it('should call Alert.alert with default button texts when not provided', () => {
      const title = 'Confirm Action';
      const message = 'Are you sure?';
      const onConfirm = jest.fn();

      showConfirmAlert(title, message, onConfirm);

      expect(Alert.alert).toHaveBeenCalledWith(
        title,
        message,
        [
          { text: 'yes', onPress: onConfirm },
          { text: 'no', style: 'cancel' },
        ]
      );
    });

    it('should call Alert.alert with custom button texts when provided', () => {
      const title = 'Confirm Action';
      const message = 'Are you sure?';
      const onConfirm = jest.fn();
      const confirmText = 'OK';
      const cancelText = 'Cancel';

      showConfirmAlert(title, message, onConfirm, confirmText, cancelText);

      expect(Alert.alert).toHaveBeenCalledWith(
        title,
        message,
        [
          { text: confirmText, onPress: onConfirm },
          { text: cancelText, style: 'cancel' },
        ]
      );
    });

    it('should call Alert.alert with empty message when not provided', () => {
      const title = 'Confirm Action';
      const onConfirm = jest.fn();

      showConfirmAlert(title, undefined, onConfirm);

      expect(Alert.alert).toHaveBeenCalledWith(
        title,
        '',
        [
          { text: 'yes', onPress: onConfirm },
          { text: 'no', style: 'cancel' },
        ]
      );
    });
  });

  describe('showMessageAlert', () => {
    it('should call Alert.alert with default OK text when not provided', () => {
      const title = 'Info';
      const message = 'This is a message';

      showMessageAlert(title, message);

      expect(Alert.alert).toHaveBeenCalledWith(
        title,
        message,
        [
          { text: 'ok', onPress: expect.any(Function), style: 'cancel' },
        ]
      );
    });

    it('should call Alert.alert with custom OK text when provided', () => {
      const title = 'Info';
      const message = 'This is a message';
      const onOk = jest.fn();
      const okText = 'Got It';

      showMessageAlert(title, message, onOk, okText);

      expect(Alert.alert).toHaveBeenCalledWith(
        title,
        message,
        [
          { text: okText, onPress: onOk, style: 'cancel' },
        ]
      );
    });

    it('should call Alert.alert with empty message when not provided', () => {
      const title = 'Info';

      showMessageAlert(title);

      expect(Alert.alert).toHaveBeenCalledWith(
        title,
        '',
        [
          { text: 'ok', onPress: expect.any(Function), style: 'cancel' },
        ]
      );
    });
  });
});
