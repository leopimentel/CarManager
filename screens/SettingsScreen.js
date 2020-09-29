import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, List, TextInput, Dialog, Portal, Button } from 'react-native-paper';
import { getStyles } from './style'
import { t } from '../locales'
import { databaseFilePath, databaseName, openDatabase, closeDatabase, db } from '../database'
import { ucfirst } from '../utils/string'
import { Loading } from '../components/Loading'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system'

function SettingsScreen({ theme }) {
  const styles = getStyles(theme)
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState()
  const [description, setDescription] = useState()
  const [visibleDialog, setVisibleDialog] = useState(false)

  useEffect(() => {
    setLoading(true)
    db.transaction(function(tx) {
      tx.executeSql(
        `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
        [],
        function(_, results) {
          if (results.rows.length) {
            let cars = []
            for (let i = 0; i < results.rows.length; i++) {
              cars.push({
                index: results.rows.item(i).CodVeiculo,
                value: results.rows.item(i).Descricao
              });
            }
            setVehicles(cars)
          }
          setLoading(false)
        }
      )
    })
  }, [])

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

  const insertVehicle = () => {
    setLoading(true)
    db.transaction(function(tx) {
      tx.executeSql(
        `INSERT INTO Veiculo (Descricao) VALUES (?)`,
        [description],
        function(tx, res) {
          setVehicleId()
          setDescription()
          setVisibleDialog(false)

          tx.executeSql(
            `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
            [],
            function(_, results) {
              if (results.rows.length) {
                let cars = []
                for (let i = 0; i < results.rows.length; i++) {
                  cars.push({
                    index: results.rows.item(i).CodVeiculo,
                    value: results.rows.item(i).Descricao
                  });
                }
                setVehicles(cars)
              }
              setLoading(false)
            }
          )
        }
      )
    })
  }

  const deleteVehicle = () => {
    const confirm = () => {
      setLoading(true) 
      db.transaction(function(tx) {
        tx.executeSql(
          `DELETE FROM Veiculo WHERE CodVeiculo = ?`,
          [vehicleId],
          function(tx, res) {
            setVehicleId()
            setDescription()
            setVisibleDialog(false)
  
            tx.executeSql(
              `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
              [],
              function(_, results) {
                if (results.rows.length) {
                  let cars = []
                  for (let i = 0; i < results.rows.length; i++) {
                    cars.push({
                      index: results.rows.item(i).CodVeiculo,
                      value: results.rows.item(i).Descricao
                    });
                  }
                  setVehicles(cars)
                }
                setLoading(false)
              }
            )
          }
        )
      }) 
    }

    Alert.alert(
      t('confirmDelete'),
      '',
      [
        {
          text: t('yes'), onPress: () => confirm()
        },
        { text: t('no'), style: "cancel" }
      ]
    );
  }

  const updateVehicle = () => {
    setLoading(true)
    db.transaction(function(tx) {
      tx.executeSql(
        `UPDATE Veiculo SET Descricao = ? WHERE CodVeiculo = ?`,
        [description, vehicleId],
        function(tx, res) {
          setVehicleId()
          setDescription()
          setVisibleDialog(false)

          tx.executeSql(
            `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
            [],
            function(_, results) {
              if (results.rows.length) {
                let cars = []
                for (let i = 0; i < results.rows.length; i++) {
                  cars.push({
                    index: results.rows.item(i).CodVeiculo,
                    value: results.rows.item(i).Descricao
                  });
                }
                setVehicles(cars)
              }
              setLoading(false)
            }
          )
        }
      )
    })
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
            {vehicleId && <Button uppercase={false} mode="outlined" onPress={() => {
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
