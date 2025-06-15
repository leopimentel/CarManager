import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Dialog, Portal } from 'react-native-paper';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { spendingTypes } from '../constants/fuel'
import { HelperText } from 'react-native-paper';
import { fromUserDateToDatabase, fromDatabaseToUserDate } from '../utils/date'
import { ucfirst } from '../utils/string'
import { databaseFloatFormat, databaseIntegerFormat } from '../utils/number'
import { Loading } from '../components/Loading'
import Colors from '../constants/Colors';
import { useIsFocused } from '@react-navigation/native'

function SpendingScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const spendingTypesMinusFueling = spendingTypes.slice(1)
  const [price, setPrice] = useState()
  const [spendingType, setSpendingType] = useState(3)
  const [km, setKm] = useState()

  const [observation, setObservation] = useState()
  const [autoRepair, setAutoRepair] = useState()
  const [visibleDialog, setVisibleDialog] = useState(false)
  const [codGasto, setCodGasto] = useState()
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState();
  console.log("SpendingScreen, vehicleid", vehicleId)
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    price: [false, ''],
  })

  const isFocused = useIsFocused()

  useEffect(() => {
    console.log("isFocused", isFocused)
    console.log("vehicleid", vehicleId)
    async function fetchData() {
      let results = await db.getAllAsync(
          `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V
          LEFT JOIN VeiculoPrincipal VP ON VP.CodVeiculo = V.CodVeiculo
          ORDER BY VP.CodVeiculo IS NOT NULL DESC`,
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
      console.log(cars)
      setVehicleId(cars[0].index)
      setVehicles(cars)
    }
    fetchData()
  }, [isFocused])

  useEffect(() => {
    async function fetchData() {
      if (route.params && route.params.CodGasto) {
        console.log("codgasto, vehicleId", vehicleId)
        setLoading(true)
        let results = await db.getAllAsync(
            `SELECT
             G.Data,
             G.CodGastoTipo,
             G.Valor,
             G.Observacao,
             G.KM,
             G.CodVeiculo,
             G.Oficina
             FROM Gasto G
             WHERE G.CodGasto = ?`,
            [route.params.CodGasto])
        
        if (results.length) {
          const abastecimento = results[0]
          console.log(abastecimento)
          setPrice(''+abastecimento.Valor)
          setDate(moment(abastecimento.Data, 'YYYY-MM-DD').toDate())
          setObservation(abastecimento.Observacao)
          setSpendingType(''+abastecimento.CodGastoTipo)
          setAutoRepair(abastecimento.Oficina)
          if (abastecimento.KM) {
            setKm(''+abastecimento.KM)
          }
          setCodGasto(route.params.CodGasto)
          setVehicleId(abastecimento.CodVeiculo)
        }

        setLoading(false)
      } else {
        console.log("neesse else")
        results = await db.getAllAsync(
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

  const removeSpending = () => {
    const confirmDelete = async () => {
      setLoading(true)
      await db.runAsync(
          `DELETE FROM Gasto WHERE CodGasto = ?`,
          [codGasto])
          
      console.log(`Spending ${codGasto} removed`)
      setVisibleDialog(true)
      setLoading(false)
      clearForm()
    }

    Alert.alert(
      t('confirmDelete'),
      '',
      [
        {
          text: t('yes'), onPress: () => confirmDelete()
        },
        { text: t('no'), style: "cancel" }
      ]
    );
  }

  const clearForm = () => {
    setDate(new Date())
    setPrice(null)
    setObservation(null)
    setKm(null)
    setCodGasto(null)
    setFormErrors({
      price: [false, ''],
    })
    setAutoRepair(null)
  }

  const saveSpending = async () => {
    if (!price || price < 0) {
      setFormErrors({...formErrors, price: [true, t('errorMessage.totalFuel')]})
      return false
    }

    const dateSqlLite = fromUserDateToDatabase(date)
    setLoading(true)
    if (!codGasto) {
      let res = await db.runAsync(
          `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM, Oficina) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [vehicleId, dateSqlLite, spendingType, price, observation, null, null, km, autoRepair])
            setLoading(false)
            setVisibleDialog(true)
            setCodGasto(res.lastInsertRowId)
            console.log(`Spending ${res.lastInsertRowId} inserted `)
    } else {
      await db.runAsync(
        `UPDATE Gasto
          SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?, KM = ?, Oficina = ?
          WHERE CodGasto = ?`,
        [vehicleId, dateSqlLite, spendingType, price, observation, km, autoRepair, codGasto])
      console.log(`Spending ${codGasto} updated`)
      setLoading(false)
      setVisibleDialog(true)
    }
  }

  if (loading) {
    return <Loading loading={loading} />
  }
  return (
    <View style={styles.container}>

    <Portal>
      <Dialog visible={visibleDialog}
          onDismiss={() => setVisibleDialog(false)}>
        <Dialog.Title>{t('spendingSaved')}</Dialog.Title>

        <Dialog.Actions>
          <Button uppercase={false} mode="outlined" onPress={() => {
            setVisibleDialog(false)
            navigation.navigate('Reminder', {
              CodGasto: codGasto,
              CodVeiculo: vehicleId,
              CodLembrete: null
            })
            clearForm()
          }}>{t('newReminder')}</Button>

          <Button uppercase={false} style={{marginLeft: 5}} mode="outlined" onPress={() => {
            setVisibleDialog(false)
            clearForm()
            navigation.navigate('Report', {CodVeiculo: vehicleId})
          }}>{t('seeReport')}</Button>

          <Button uppercase={false} style={{marginLeft: 5}} mode="contained" onPress={() => {
            clearForm()
            setVisibleDialog(false)
            }}>{t('close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>

    <ScrollView style={styles.container} keyboardShouldPersistTaps='always'>
      {showDatePicker &&
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowDatePicker(!showDatePicker);
            setDate(selectedDate || date)              
          }}
        />}
      <Button style={{ backgroundColor: Colors.tintColor }} labelStyle={{fontSize: 20}}
        uppercase={false} compact icon="currency-usd" mode="contained" onPress={() => clearForm()}>
        {t('new')}
      </Button>

      {vehicles.length > 1 && <Picker style={styles.picker} label={t('vehicle')} selectedValue={vehicleId} onValueChange={async itemValue => {
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

      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
            label={t('fillingDate')}
            value={fromDatabaseToUserDate(date)}
            mode='outlined'
            style={{flex: 1}}
            editable={false}
            onPress={() => {setShowDatePicker(true)}}
          />
          </TouchableOpacity>
          {/* <Dropdown label={t('vehicle')} data={vehicles} value='Meu'/> */}
        </View>
        <View style={{ flex: 1, marginLeft: 5 }}>
          <Picker style={styles.picker} selectedValue={spendingType} onValueChange={itemValue => setSpendingType(itemValue)}>
            {
              spendingTypesMinusFueling.map(spending => <Picker.Item label={spending.value} value={spending.index} key={spending.index}/>)
            }  
          </Picker>
        </View>
      </View>

      <View style={styles.splitRow}>
        <View style={{flex: 1}}>
          <TextInput
            label={t('currency') + t('value')}
            value={price}
            onChangeText={text => {
              setPrice(databaseFloatFormat(text))
              setFormErrors({...formErrors, price: [false, '']})
            }}
            style={{ flex: 1 }}
            placeholder={t('currency') + t('value')}
            keyboardType={'numeric'}
            mode='outlined'
          />

          {formErrors.price[0] && <HelperText type="error" visible={formErrors.price[0]} padding='none'>
            {formErrors.price[1]}
          </HelperText>}
        </View>
      </View>

      <View style={styles.splitRow}>
        <TextInput
          label={t('odometer')}
          value={km}
          onChangeText={text => {
            setKm(databaseIntegerFormat(text))
          }}
          keyboardType={'numeric'}
          mode='outlined'
          style={{flex: 1}}
        />
      </View>

      <View style={styles.splitRow}>
        <TextInput label={t('observation')}
          value={observation}
          onChangeText={text => setObservation(text)}
          mode='outlined'
          placeholder={t('spendingObservation')}
          style={{flex: 1}}
        />
      </View>

      <View style={styles.splitRow}>
        <TextInput label={t('autoRepair')}
          value={autoRepair}
          onChangeText={text => setAutoRepair(text)}
          mode='outlined'
          placeholder={t('autoRepairPlaceHolder')}
          style={{flex: 1}}
        />
      </View>

      <View style={styles.splitRow}>
        <Button style={{ flex: 1, marginTop: 10, marginBottom: 20 }} labelStyle={{fontSize: 25}}
        uppercase={false} compact icon="content-save" mode="contained" onPress={() => saveSpending()}>
        {t('save')}
        </Button>
      </View>

      <View style={styles.splitRow}>
        {codGasto &&
          <Button style={{ flex: 1, marginTop: 10, marginRight: 5, backgroundColor: Colors.negativeColor }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="delete" mode="contained" onPress={() => removeSpending()}>
          {t('delete')}
          </Button>
        }
      </View>
    </ScrollView>
  </View>
  )
}

export default withTheme(SpendingScreen);
