import React, { useState, useEffect, useContext } from 'react';
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
import { AppContext } from "../providers/BellProvider";

function ReminderScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [date, setDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState()
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
  const { notify } = useContext(AppContext);
  const isFocused = useIsFocused()

  useEffect(() => {
    async function fetchData() {
      let results = await db.getAllAsync(
          `SELECT L.Descricao, L.CodLembreteTipo FROM LembreteTipo L`,
          [])
          
      let aux = []
      if (results.length) {
        for (const row of results) {
          aux.push({
            index: row.CodLembreteTipo,
            value: row.Descricao
          });
        }            
      }
      setReminderTypes(aux)
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function fetchData() {
      let results = await db.getAllAsync(
        `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
        [])
          
      let cars = []
      if (results.length) {
        for (const row of results) {
          cars.push({
            index: row.CodVeiculo,
            value: row.Descricao
          });
        }            
      }
      setVehicles(cars)
    }
    fetchData()
    clearForm()
  }, [isFocused])

  useEffect(() => {
    clearForm()
    console.log('route params', route.params)
    async function fetchData() {
      if (route.params) {      
        if (route.params.CodGasto){
          setSpendingId(route.params.CodGasto)
        }
        if (route.params.CodLembrete){
          setReminderId(route.params.CodLembrete)
          setLoading(true)
          let reminder = await db.getFirstAsync(
              `SELECT
                L.CodVeiculo, L.DataCadastro, L.CodLembreteTipo,
                L.KM, L.DataLembrete, L.Observacao, L.Finalizado, L.CodGasto
              FROM Lembrete L
              WHERE L.CodLembrete = ?`,
              [route.params.CodLembrete])
              
          if (reminder) {
            console.log(reminder, moment(reminder.DataLembrete, 'YYYY-MM-DD').format(t('dateFormat')))
            setSelectedDate(reminder.DataLembrete ? moment(reminder.DataLembrete, 'YYYY-MM-DD').toDate(): '')
            setDone(reminder.Finalizado)
            setKm(reminder.KM ? ''+reminder.KM : '')
            setObservation(reminder.Observacao)
            setSpendingId(reminder.CodGasto)
            setVehicleId(reminder.CodVeiculo)
            setReminderType(reminder.CodLembreteTipo)
          }
          setLoading(false)
        }      
      } else {
        let results = await db.getAllAsync(
            `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V
            LEFT JOIN VeiculoPrincipal VP ON VP.CodVeiculo = V.CodVeiculo
            ORDER BY VP.CodVeiculo IS NOT NULL DESC`,
            [])
            
        if (results.length) {
          let cars = []
          for (const row of results) {
            cars.push({
              index: row.CodVeiculo,
              value: row.Descricao
            });
          }
          setVehicleId(cars[0].index)
        }
      }
    }
    fetchData()
  }, [route.params])

  const remove = () => {
    const confirm = async () => {
      setLoading(true)
      await db.runAsync(
          `DELETE FROM Lembrete WHERE CodLembrete = ?`,
          [reminderId])
          
      console.log(`Reminder ${reminderId} removed`)
      notify()
      setVisibleDialog(true)
      setLoading(false)
      clearForm()
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

  const clearForm = () => {
    setSelectedDate(null)
    setReminderId(null)
    setObservation(null)
    setKm(null)
    setSpendingId(null)
    setFormErrors({
      dateOrKm: [false, ''],
    })
    setDone(0)
  }

  const save = async () => {
    if ((!km || km < 0) && !selectedDate) {
       setFormErrors({...formErrors, dateOrKm: [true, t('errorMessage.dateOrKm')]})
       return false
    }
    const dateSqlLite = selectedDate ? fromUserDateToDatabase(selectedDate) : null
    setLoading(true)
    if (!reminderId) {
      console.log(vehicleId, new Date(), reminderType, km, dateSqlLite, observation, done, spendingId )
      let res = await db.runAsync(
        `INSERT INTO Lembrete 
        (CodVeiculo, DataCadastro, CodLembreteTipo, KM, DataLembrete, Observacao, Finalizado, CodGasto) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [vehicleId, fromUserDateToDatabase(new Date()), reminderType, km, dateSqlLite, observation, done, spendingId])

      console.log(`Reminder ${res.lastInsertId} inserted`)
      clearForm()
      notify()
      setLoading(false)
      setVisibleDialog(true)
    } else {
      await db.runAsync(
        `UPDATE Lembrete
          SET CodVeiculo = ?, DataCadastro = ?, CodLembreteTipo = ?, KM = ?, DataLembrete = ?, Observacao = ?, Finalizado = ?, CodGasto = ?
          WHERE CodLembrete = ?`,
          [vehicleId, fromUserDateToDatabase(new Date()), reminderType, km, dateSqlLite, observation, done, spendingId, reminderId])
      console.log(`Reminder ${reminderId} updated ${km}`)
      notify()
      setVisibleDialog(true)
      clearForm()
      setLoading(false)
    };
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
          minimumDate={new Date()}
          mode="date"
          onChange={(_, selectedDateTime) => {
            setShowDatePicker(!showDatePicker);
            setSelectedDate(selectedDateTime)
            setDate(selectedDateTime || date)              
          }}
        />}
      <Button style={{ backgroundColor: Colors.tintColor }} labelStyle={{fontSize: 20}}
        uppercase={false} compact icon="note" mode="contained" onPress={() => clearForm()}>
        {t('new')}
      </Button>

        {vehicles.length > 1 && <Picker dropdownIconColor="#000" style={styles.picker} label={t('vehicle')} selectedValue={vehicleId} onValueChange={async itemValue => {
          setVehicleId(itemValue)
          await db.runAsync(
            `UPDATE VeiculoPrincipal SET CodVeiculo = ${itemValue}`
          )
          console.log("VehicleId updated to", itemValue)
        }}>
          {
            vehicles.map(vehicle => <Picker.Item label={ucfirst(vehicle.value)} value={vehicle.index} key={vehicle.index}/>)
          }  
        </Picker>}

        {reminderTypes && <Picker dropdownIconColor="#000" style={styles.picker} label={t('type')} selectedValue={reminderType} onValueChange={itemValue => setReminderType(itemValue)}>
          {
            reminderTypes.map(remindType => <Picker.Item label={ucfirst(remindType.value)} value={remindType.index} key={remindType.index}/>)
          }  
        </Picker>}

      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
            label={t('date')}
            value={selectedDate ? fromDatabaseToUserDate(selectedDate): ''}
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
        <Button style={{ flex: 1, marginTop: 5 }} labelStyle={{fontSize: 25}}
        uppercase={false} compact icon="content-save" mode="contained" onPress={() => save()}>
        {t('save')}
        </Button>
      </View>

      <View style={styles.splitRow}>
        {reminderId &&
          <Button style={{ flex: 1, marginTop: 10, marginBottom: 30, backgroundColor: Colors.negativeColor }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="delete" mode="contained" onPress={() => remove()}>
          {t('delete')}
          </Button>
        }
      </View>
    </ScrollView>
  </View>
  )
}

export default withTheme(ReminderScreen);
