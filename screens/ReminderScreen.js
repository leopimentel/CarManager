import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Switch, Dialog, Portal } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { HelperText } from 'react-native-paper';
import { fromUserDateToDatabase, fromDatabaseToUserDate } from '../utils/date'
import { ucfirst } from '../utils/string'
import { databaseIntegerFormat } from '../utils/number'
import { Loading } from '../components/Loading'
import Colors from '../constants/Colors';
import {Picker} from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native'

function ReminderScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [reminderType, setReminderType] = useState(1)
  const [reminderTypes, setReminderTypes] = useState()
  const [reminderId, setReminderId] = useState()
  const [km, setKm] = useState()
  const [observation, setObservation] = useState()  
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState();
  const [done, setDone] = useState(0);
  const [spendingId, setSpendingId] = useState();
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    dateOrKm: [false, ''],
  })
  const [visibleDialog, setVisibleDialog] = useState(false)
  
  const isFocused = useIsFocused()

  useEffect(() => {
    db.transaction(function(tx) {
      tx.executeSql(
        `SELECT L.Descricao, L.CodLembreteTipo FROM LembreteTipo L`,
        [],
        function(_, results) {
          let aux = []
          if (results.rows.length) {
            for (let i = 0; i < results.rows.length; i++) {
              aux.push({
                index: results.rows.item(i).CodLembreteTipo,
                value: results.rows.item(i).Descricao
              });
            }            
          }
          setReminderTypes(aux)
        }
      )
    })
  }, [])

  useEffect(() => {
    db.transaction(function(tx) {
      tx.executeSql(
        `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
        [],
        function(_, results) {
          let cars = []
          if (results.rows.length) {
            for (let i = 0; i < results.rows.length; i++) {
              cars.push({
                index: results.rows.item(i).CodVeiculo,
                value: results.rows.item(i).Descricao
              });
            }            
          }
          setVehicles(cars)
        }
      )
    })
    clearForm()
  }, [isFocused])

  useEffect(() => {
    clearForm()
    console.log('route params', route.params)
    if (route.params) {
      if (route.params.CodVeiculo){
        setVehicleId(route.params.CodVeiculo)
      }
      if (route.params.CodGasto){
        setSpendingId(route.params.CodGasto)
      }
      if (route.params.CodLembrete){
        setReminderId(route.params.CodLembrete)
        setLoading(true)
        db.transaction(function(tx) {
          tx.executeSql(
            `SELECT
              L.CodVeiculo, L.DataCadastro, L.CodLembreteTipo,
              L.KM, L.DataLembrete, L.Observacao, L.Finalizado, L.CodGasto
            FROM Lembrete L
            WHERE L.CodLembrete = ?`,
            [route.params.CodLembrete],
            function(_, results) {
              if (results.rows.length) {
                const reminder = results.rows.item(0)
                console.log(reminder, moment(reminder.DataLembrete, 'YYYY-MM-DD').format(t('dateFormat')))
                setDate(moment(reminder.DataLembrete, 'YYYY-MM-DD').toDate())
                setDone(reminder.Finalizado)
                setKm(''+reminder.KM)
                setObservation(reminder.Observacao)
                setSpendingId(reminder.CodGasto)
                setVehicleId(reminder.CodVeiculo)
                setReminderType(reminder.CodLembreteTipo)
            }
            }
          )
          setLoading(false)
        });
      }      
    } else {
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
              setVehicleId(cars[0].index)
            }
          }
        )
      })
    }
  }, [route.params])

  const remove = () => {
    const confirm = () => {
      setLoading(true)
      db.transaction(function(tx) {
        tx.executeSql(
          `DELETE FROM Lembrete WHERE CodLembrete = ?`,
          [reminderId],
          function(tx) {
            console.log(`Reminder ${reminderId} removed`)
            global.shouldNotify = true
            setVisibleDialog(true)
            setLoading(false)
            clearForm()
          }, handleDatabaseError
        );
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

  const handleDatabaseError = function (_, error) {
    console.log(error)
    setLoading(false)
    return true
  }

  const clearForm = () => {
    setDate(new Date())
    setReminderId(null)
    setObservation(null)
    setKm(null)
    setSpendingId(null)
    setFormErrors({
      dateOrKm: [false, ''],
    })
    setDone(0)
  }

  const save = () => {
    if ((!km || km < 0) && (!date)) {
       setFormErrors({...formErrors, km: [true, t('errorMessage.km')]})
       return false
    }

    const dateSqlLite = fromUserDateToDatabase(date)
    setLoading(true)
    db.transaction(function(tx) {
      if (!reminderId) {
        console.log(vehicleId, new Date(), reminderType, km, dateSqlLite, observation, done, spendingId )
        tx.executeSql(
          `INSERT INTO Lembrete 
          (CodVeiculo, DataCadastro, CodLembreteTipo, KM, DataLembrete, Observacao, Finalizado, CodGasto) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [vehicleId, fromUserDateToDatabase(new Date()), reminderType, km, dateSqlLite, observation, done, spendingId],
          function(tx, res) {
            console.log(`Reminder ${res.insertId} inserted`)
            clearForm()
            global.shouldNotify = true
            setLoading(false)
            setVisibleDialog(true)
          }, handleDatabaseError
          );
      } else {
        tx.executeSql(
          `UPDATE Lembrete
           SET CodVeiculo = ?, DataCadastro = ?, CodLembreteTipo = ?, KM = ?, DataLembrete = ?, Observacao = ?, Finalizado = ?, CodGasto = ?
           WHERE CodLembrete = ?`,
           [vehicleId, fromUserDateToDatabase(new Date()), reminderType, km, dateSqlLite, observation, done, spendingId, reminderId],
          function(tx) {
            console.log(`Reminder ${reminderId} updated ${km}`)
            setVisibleDialog(true)
            clearForm()
            setLoading(false)
            global.shouldNotify = true
          }, handleDatabaseError
        );
      }
    });
  }

  if (loading) {
    return <Loading loading={loading} />
  }
  return (
    <View style={styles.container}>

    <Portal>
      <Dialog visible={visibleDialog}
          onDismiss={() => setVisibleDialog(false)}>
        <Dialog.Title>{t('savedReminder')}</Dialog.Title>
        <Dialog.Actions>
          <Button uppercase={false} mode="outlined" onPress={() => {
            setVisibleDialog(false)
            navigation.navigate('Reminders', {CodVeiculo: vehicleId})
          }}>{t('seeReminders')}</Button>
          <Button uppercase={false} style={{marginLeft: 5}} mode="contained" onPress={() => setVisibleDialog(false)}>{t('close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>

    <ScrollView style={styles.container} keyboardShouldPersistTaps='always'>
      {showDatePicker &&
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(_, selectedDate) => {
            setShowDatePicker(!showDatePicker);
            setDate(selectedDate || date)              
          }}
        />}
      <Button style={{ backgroundColor: Colors.tintColor }} labelStyle={{fontSize: 20}}
        uppercase={false} compact icon="note" mode="contained" onPress={() => clearForm()}>
        {t('new')}
      </Button>

        {vehicles.length > 1 && <Picker label={t('vehicle')} selectedValue={vehicleId} onValueChange={itemValue => setVehicleId(itemValue)}>
          {
            vehicles.map(vehicle => <Picker.Item label={ucfirst(vehicle.value)} value={vehicle.index} key={vehicle.index}/>)
          }  
        </Picker>}

        {reminderTypes && <Picker label={t('type')} selectedValue={reminderType} onValueChange={itemValue => setReminderType(itemValue)}>
          {
            reminderTypes.map(remindType => <Picker.Item label={ucfirst(remindType.value)} value={remindType.index} key={remindType.index}/>)
          }  
        </Picker>}

      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
            label={t('date')}
            value={fromDatabaseToUserDate(date)}
            mode='outlined'
            style={{flex: 1}}
            editable={false}
            onPress={() => {setShowDatePicker(true)}}
          />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.splitRow}>
        <View style={{flex: 1}}>
          <TextInput
            label={t('odometer')}
            value={km}
            onChangeText={text => {
              setKm(databaseIntegerFormat(text))
              setFormErrors({...formErrors, dateOrKm: [false, '']})
            }}
            keyboardType={'numeric'}
            mode='outlined'
            style={{flex: 1}}
          />

          {formErrors.dateOrKm[0] && <HelperText type="error" visible={formErrors.dateOrKm[0]} padding='none'>
            {formErrors.dateOrKm[1]}
          </HelperText>}
        </View>
      </View>

      <View style={styles.splitRow}>
        <TextInput label={t('observation')}
          value={observation}
          onChangeText={text => setObservation(text)}
          mode='outlined'
          placeholder={t('observation')}
          style={{flex: 1}}
        />
      </View>

      <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.fullTank}> {t('done')} </Text>
          <Switch
            value={done}
            onValueChange={() => { setDone(!done); }}
          />
        </View>

      <View style={styles.splitRow}>
        <Button style={{ flex: 1, marginTop: 10 }} labelStyle={{fontSize: 25}}
        uppercase={false} compact icon="content-save" mode="contained" onPress={() => save()}>
        {t('save')}
        </Button>
      </View>

      <View style={styles.splitRow}>
        {reminderId &&
          <Button style={{ flex: 1, marginTop: 10, marginRight: 5, backgroundColor: Colors.negativeColor }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="delete" mode="contained" onPress={() => remove()}>
          {t('delete')}
          </Button>
        }
      </View>
    </ScrollView>
  </View>
  )
}

ReminderScreen.navigationOptions = {
  header: null,
};

export default withTheme(ReminderScreen);
