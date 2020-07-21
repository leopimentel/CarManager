import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, List } from 'react-native-paper';
import { getStyles } from './style'
import { t } from '../locales'
import { databaseFilePath, databaseName, openDatabase, closeDatabase } from '../database'
import { Loading } from '../components/Loading'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system'

function SettingsScreen({ theme }) {
  const styles = getStyles(theme)
  const [loading, setLoading] = useState(false)

  const importDatabase = async () => {
    setLoading(true)

    closeDatabase()

    try {
      const uploadedFile = await DocumentPicker.getDocumentAsync()

      if (uploadedFile.type === 'success' && uploadedFile.name === databaseName) {
        await FileSystem.copyAsync({
          from: uploadedFile.uri,
          to: databaseFilePath
        })

        setLoading(false)

        Alert.alert(t('successRestore'));
      } else {
        console.log('Fail to upload file', uploadedFile, databaseName)

        setLoading(false)

        Alert.alert(t('failRestore'));
      }
    } catch (e){}

    openDatabase()
  }

  const exportDatabase = async () => {
    closeDatabase()
    try{
      await Sharing.shareAsync(databaseFilePath);
    } catch (e){}
    openDatabase()
  }

  if (loading) {
    return <Loading loading={loading} />
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <List.Section>
          <List.Subheader>{t('backupRestore')}</List.Subheader>
          <List.Item
            title={t('backupDatabase')}
            left={() => <List.Icon icon="database-export" />}
            onPress={() => exportDatabase()}
          />
          <List.Item
            title={t('retoreDatabase')}
            left={() => <List.Icon icon="database-import" />}
            onPress={() => importDatabase()}
          />
        </List.Section>
      </ScrollView>
    </View>
  );
}

export default withTheme(SettingsScreen);
