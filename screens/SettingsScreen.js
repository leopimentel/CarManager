import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, List, TextInput, Dialog, Portal, Button, Caption } from 'react-native-paper';
import { getStyles } from './style'
import { t } from '../locales'
import { fetchVehicles, insertVehicleDb, updateVehicleDb, deleteVehicleDb } from '../database/queries'
import { databaseFilePath, databaseName, openDatabase, closeDatabase } from '../database'
import { ucfirst } from '../utils/string'
import { Loading } from '../components/Loading'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system'
import Constants from 'expo-constants';
import { showMessageAlert, showConfirmAlert } from '../utils/alert';

function SettingsScreen({ theme }) {
  const styles = getStyles(theme)
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState()
  const [description, setDescription] = useState()
  const [visibleDialog, setVisibleDialog] = useState(false)

  useEffect(() => {
    setLoading(true)
    async function fetchData() {
      let results = await fetchVehicles();
          
      if (results.length) {
        let cars = []
        for (const row of results) {
          cars.push({
            index: row.CodVeiculo,
            value: row.Descricao
          });
        }
        setVehicles(cars)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const importDatabase = async () => {
    setLoading(true)
    try{
      closeDatabase()
    }catch(e){
      console.log(e)
    }

    try {
      console.log("rararara")
      const uploadedFile = await DocumentPicker.getDocumentAsync()

      if (uploadedFile.canceled === false) {
        await FileSystem.copyAsync({
          from: uploadedFile.assets[0].uri,
          to: databaseFilePath
        })

        setLoading(false)

        showMessageAlert(t('successRestore'));
      } else {
        console.log(`Fail to upload file ${uploadedFile.canceled}`, uploadedFile, databaseName)

        setLoading(false)

        showMessageAlert(t('failRestore'));
      }
    } catch {}

    openDatabase()
  }

  const exportDatabase = async () => {
    closeDatabase()
    try{
      await Sharing.shareAsync(databaseFilePath);
    } catch {}
    openDatabase()
  }

  const insertVehicle = async () => {
    setLoading(true)
    await insertVehicleDb(description);

    setVehicleId()
    setDescription()
    setVisibleDialog(false)

    let results = await fetchVehicles();
    if (results.length) {
      let cars = []
      for (const row of results) {
        cars.push({
          index: row.CodVeiculo,
          value: row.Descricao
        });
      }
      setVehicles(cars)
    }
    setLoading(false)
  }

  const deleteVehicle = () => {
    const confirm = async () => {
      setLoading(true)
      await deleteVehicleDb(vehicleId);
      console.log('Vehicle deleted');
      setVehicleId()
      setDescription()
      setVisibleDialog(false)
      
      let results = await fetchVehicles();
      let cars = []
      if (results.length) {
        for (const row of results) {
          cars.push({
            index: row.CodVeiculo,
            value: row.Descricao
          });
        }
      }
      setLoading(false)
      setVehicles(cars)
    }

    showConfirmAlert(t('confirmDelete'), '', () => confirm());
  }

  const updateVehicle = async () => {
    setLoading(true)
    await updateVehicleDb(vehicleId, description);
      
    setVehicleId()
    setDescription()
    setVisibleDialog(false)

    let results = await fetchVehicles();
    if (results.length) {
      let cars = []
      for (const row of results) {
        cars.push({
          index: row.CodVeiculo,
          value: row.Descricao
        });
      }
      setVehicles(cars)
    }
    setLoading(false)
  }

  if (loading) {
    return <Loading loading={loading} />
  }

  return (
    <View style={styles.container}>
      <Portal>
        <Dialog visible={visibleDialog}
            onDismiss={() => setVisibleDialog(false)}>
          <Dialog.Title>{t('fillVehicleInfo')}</Dialog.Title>

          <Dialog.Content>
            <TextInput label={t('name')}
              value={description}
              onChangeText={text => setDescription(text)}
              mode='outlined'
              placeholder='Gol'
            />
          </Dialog.Content>
          
          <Dialog.Actions>
            {vehicleId && vehicles.length > 1 && <Button uppercase={false} mode="outlined" onPress={() => {
              setVisibleDialog(false)
              deleteVehicle()
            }}>{t('delete')}</Button>}

            {vehicleId && description != null && description.length > 0 && <Button uppercase={false} style={{marginLeft: 5}} mode="contained" 
              onPress={() => {
                setVisibleDialog(false)
                updateVehicle()
              }}>{t('edit')}</Button>}

            {!vehicleId && description != null && description.length > 0 &&
            <Button uppercase={false} mode="outlined" onPress={() => {
              setVisibleDialog(false)
              insertVehicle()
            }}>{t('save')}</Button>}
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ScrollView>
        <Caption style={{textAlign: 'right'}}>{t('version')}: {Constants.expoConfig.version}</Caption>
        <List.Section>
          <List.Subheader>{t('backupRestore')}</List.Subheader>
          <List.Item
            title={t('backupDatabase')}
            left={props => <List.Icon {...props} icon="database-export" />}
            onPress={() => exportDatabase()}
          />
          <List.Item
            title={t('retoreDatabase')}
            left={props => <List.Icon {...props} icon="database-import" />}
            onPress={() => importDatabase()}
          />
        </List.Section>

        <List.Section>
          {/* <List.Accordion title={t('vehicleRegistering')}> */}
            <List.Subheader>{t('vehicleRegistering')}</List.Subheader>
          
            <List.Item titleStyle={{fontWeight: 'bold'}} onPress={() => {
              setVehicleId()
              setDescription()
              setVisibleDialog(true)
            }} title={t('newVehicle')} left={props => <List.Icon {...props} icon="plus-circle" />}/>
            {vehicles.map(vehicle => <List.Item value={vehicle.index} onPress={() => {
              setVehicleId(vehicle.index)
              setDescription(ucfirst(vehicle.value))
              setVisibleDialog(true)
            }} key={vehicle.index} title={ucfirst(vehicle.value)} left={props => <List.Icon {...props} icon="playlist-edit" />}/>)}
          {/* </List.Accordion> */}
        </List.Section>

      </ScrollView>
    </View>
  );
}

export default withTheme(SettingsScreen);
