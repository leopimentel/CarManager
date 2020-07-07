import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Dialog, Portal, Paragraph } from 'react-native-paper';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { vehicles as v, spendingTypes } from '../constants/fuel'
import { HelperText } from 'react-native-paper';
import { fromUserDateToDatabase } from '../utils/date'
import { databaseFloatFormat, databaseIntegerFormat } from '../utils/number'
import { Loading } from '../components/Loading'
import Colors from '../constants/Colors';

function SpendingScreen({ theme, route }) {
  const styles = getStyles(theme)
  const [date, setDate] = useState(moment().format(t('dateFormat')))
  const spendingTypesMinusFueling = spendingTypes.slice(1)
  const [price, setPrice] = useState()
  const [spendingTypeView, setSpendingTypeView] = useState(t('carRepair'))
  const [spendingType, setSpendingType] = useState(3)
  const [km, setKm] = useState()

  const [observation, setObservation] = useState()
  const [visibleDialog, setVisibleDialog] = useState(false)
  const [codGasto, setCodGasto] = useState()
  const vehicles = v;
  //@todo today only one vehicle is supported
  const vehicleId = vehicles[0].index;
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    price: [false, ''],
  })

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
           G.KM
           FROM Gasto G
           WHERE G.CodGasto = ?`,
          [route.params.CodGasto],
          function(_, results) {
            if (results.rows.length) {
              const abastecimento = results.rows.item(0)
              console.log(abastecimento)
              setPrice(''+abastecimento.Valor)
              setDate(moment(abastecimento.Data, 'YYYY-MM-DD').format(t('dateFormat')))
              setObservation(abastecimento.Observacao)
              setSpendingType(abastecimento.CodGastoTipo)
              if (abastecimento.KM) {
                setKm(''+abastecimento.KM)
              }
              setCodGasto(route.params.CodGasto)
              for (let i=0; i<spendingTypes.length; i++) {
                if (spendingTypes[i].index === abastecimento.CodGastoTipo) {
                  setSpendingTypeView(spendingTypes[i].value)
                  break
                }
              }
            }
            setLoading(false)
          }
        )
      })
    }
  }, [route.params])

  const removeSpending = () => {
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

  const handleDatabaseError = function (_, error) {
    console.log(error)
    setLoading(false)
    return true
  }

  const clearForm = () => {
    setDate(moment().format(t('dateFormat')))
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
        <Dialog.Title>{t('save')}</Dialog.Title>
        <Dialog.Content>
          <Paragraph>{t('savedFilling')}</Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setVisibleDialog(false)}>{t('close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>

    <ScrollView style={styles.container}>
      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateLabel}> {t('fillingDate')} </Text>
          <DatePicker
            style={{width: '100%'}}
            date={date}
            mode="date"
            format={t('dateFormat')}
            confirmBtnText={t('confirm')}
            cancelBtnText={t('cancel')}
            locale="pt_br"
            customStyles={{
              dateIcon: styles.dateIcon,
              dateInput: {
                marginLeft: 36
              }
            }}
            onDateChange={(date) => {setDate(date)}}
          />
          {/* <Dropdown label={t('vehicle')} data={vehicles} value='Meu'/> */}
        </View>
        <View style={{ flex: 1, marginLeft: 5 }}>
          <Dropdown label={t('spendingType')} data={spendingTypesMinusFueling} value={spendingTypeView} onChangeText={(value) => {
            setSpendingType(spendingTypesMinusFueling.filter(fuel => fuel.value === value)[0].index)
          }}/>
        </View>
      </View>

      <View style={styles.splitRow}>
        <View style={{flex: 1}}>
          <TextInput
            label={t('value')}
            value={price}
            onChangeText={text => {
              setPrice(databaseFloatFormat(text))
              setFormErrors({...formErrors, price: [false, '']})
            }}
            style={{ flex: 1 }}
            placeholder={t('value')}
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
          placeholder={t('fillingObservation')}
          style={{flex: 1}}
        />
      </View>

      <View style={styles.splitRow}>
        <Button style={{ flex: 1, marginTop: 10 }} labelStyle={{fontSize: 25}}
        uppercase={false} compact icon="content-save" mode="contained" onPress={() => saveSpending()}>
        {t('confirm')}
        </Button>
      </View>

      <View style={styles.splitRow}>
        {codGasto &&
          <Button style={{ flex: 1, marginTop: 10, marginRight: 5, backgroundColor: Colors.negativeColor }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="delete" mode="contained" onPress={() => removeSpending()}>
          {t('delete')}
          </Button>
        }
        <Button style={{ flex: 1, marginTop: 10, backgroundColor: Colors.accent }} labelStyle={{fontSize: 15}}
        uppercase={false} compact icon="eraser" mode="contained" onPress={() => clearForm()}>
        {t('clearFields')}
        </Button>
      </View>
    </ScrollView>
  </View>
  )
}

SpendingScreen.navigationOptions = {
  header: null,
};

export default withTheme(SpendingScreen);
