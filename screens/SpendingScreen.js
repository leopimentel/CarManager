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
  const [visibleDialog, setVisibleDialog] = useState(false)
  const [codGasto, setCodGasto] = useState()
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState();
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    price: [false, ''],
  })

  const isFocused = useIsFocused()

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
  }, [isFocused])

  useEffect(() => {
    if (route.params && route.params.CodGasto) {
      setLoading(true)
      db.transaction(function(tx) {
        tx.executeSql(
          `SELECT
           G.Data,
           G.CodGastoTipo,
           G.Valor,
           G.Observacao,
           G.KM,
           G.CodVeiculo
           FROM Gasto G
           WHERE G.CodGasto = ?`,
          [route.params.CodGasto],
          function(_, results) {
            if (results.rows.length) {
              const abastecimento = results.rows.item(0)
              console.log(abastecimento)
              setPrice(''+abastecimento.Valor)
              setDate(moment(abastecimento.Data, 'YYYY-MM-DD').toDate())
              setObservation(abastecimento.Observacao)
              setSpendingType(abastecimento.CodGastoTipo)
              if (abastecimento.KM) {
                setKm(''+abastecimento.KM)
              }
              setCodGasto(route.params.CodGasto)
              setVehicleId(abastecimento.CodVeiculo)
            }

            setLoading(false)
          }
        )
      })
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

  const removeSpending = () => {
    const confirmDelete = () => {
      setLoading(true)
      db.transaction(function(tx) {
        tx.executeSql(
          `DELETE FROM Gasto WHERE CodGasto = ?`,
          [codGasto],
          function() {
            console.log(`Spending ${codGasto} removed`)
            setVisibleDialog(true)
            setLoading(false)
            clearForm()
          }, handleDatabaseError
        )
      })
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

  const handleDatabaseError = function (_, error) {
    console.log(error)
    setLoading(false)
    return true
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
  }

  const saveSpending = () => {
    if (!price || price < 0) {
      setFormErrors({...formErrors, price: [true, t('errorMessage.totalFuel')]})
      return false
    }

    const dateSqlLite = fromUserDateToDatabase(date)
    setLoading(true)
    db.transaction(function(tx) {
      if (!codGasto) {
        tx.executeSql(
            `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [vehicleId, dateSqlLite, spendingType, price, observation, null, null, km],
            function(_, res) {
              setLoading(false)
              setVisibleDialog(true)
              clearForm()
              console.log(`Spending ${res.insertId} inserted `)
            }, handleDatabaseError
        );
      } else {
        tx.executeSql(
          `UPDATE Gasto
            SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?, KM = ?
            WHERE CodGasto = ?`,
          [vehicleId, dateSqlLite, spendingType, price, observation, km, codGasto],
          function() {
            console.log(`Spending ${codGasto} updated`)
            setLoading(false)
            setVisibleDialog(true)
            clearForm()
          }, handleDatabaseError
        )
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
        <Dialog.Title>{t('spendingSaved')}</Dialog.Title>

        <Dialog.Actions>
          <Button uppercase={false} mode="outlined" onPress={() => {
            setVisibleDialog(false)
            navigation.navigate('Report', {CodVeiculo: vehicleId})
          }}>{t('seeReport')}</Button>

          <Button uppercase={false} style={{marginLeft: 5}} mode="contained" onPress={() => setVisibleDialog(false)}>{t('close')}</Button>
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
        uppercase={false} compact icon="cash-usd" mode="contained" onPress={() => clearForm()}>
        {t('new')}
      </Button>

      {vehicles.length > 1 && <Picker label={t('vehicle')} selectedValue={vehicleId} onValueChange={itemValue => setVehicleId(itemValue)}>
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
          <Picker selectedValue={spendingType} onValueChange={itemValue => setSpendingType(itemValue)}>
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
          label='KM'
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
        <Button style={{ flex: 1, marginTop: 10 }} labelStyle={{fontSize: 25}}
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

SpendingScreen.navigationOptions = {
  header: null,
};

export default withTheme(SpendingScreen);
