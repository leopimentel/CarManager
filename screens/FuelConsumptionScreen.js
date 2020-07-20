import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {Picker} from '@react-native-community/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { withTheme, TextInput } from 'react-native-paper';
import { vehicles as v, fuels as f, timeFilter, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { getStyles } from './style'
import { t } from '../locales'
import moment from 'moment';
import { Table, Row, TableWrapper, Cell } from 'react-native-table-component';
import { db } from '../database'
import { useIsFocused } from '@react-navigation/native'
import { fromUserDateToDatabase, fromDatabaseToUserDate } from '../utils/date'
import { Loading } from '../components/Loading'
import NumberFormat from 'react-number-format';
import Colors from '../constants/Colors'
import { MaterialCommunityIcons } from '@expo/vector-icons';

function FuelConsumptionScreen({ theme, navigation }) {
  const styles = getStyles(theme)
  const [fillingPeriod, setFillingPeriod] = useState({
    startFillingDate: moment().subtract(1, 'months').toDate(),
    endFillingDate: moment().toDate()
  })

  const [showStartFillingDate, setShowStartFillingDate] = useState(false)
  const [showEndFillingDate, setShowEndFillingDate] = useState(false)
  const [fuelType, setFuelType] = useState(0)
  const [fuelTypeView, setFuelTypeView] = useState(t('all'))
  const [tableData, setTableData] = useState([])
  const [totalSum, setTotalSum] = useState(0)
  const [totalAverage, setTotalAverage] = useState(0)
  const vehicles = v;
  //@todo today only one vehicle is supported
  const vehicleId = vehicles[0].index;
  const fuels = [{
    index: 0,
    value: t('all')
  }, ...f];
  const timeOptions = timeFilter;
  const [periodView, setPeriodView] = useState(timeOptions[0].index)
  const [loading, setLoading] = useState(false)
  const tableHead = [
    {title: t('edit'), style: {width: 50}},
    {title: t('date'), style: {width: 90}},
    {title:t('fuel'), style: {width: 100}},
    {title:t('volume'), style: {width: 60}, textStyle: {fontWeight: 'bold'}},
    {title:'KM', style: {width: 65}},
    {title:t('value'), style: {width: 50}, textStyle: {fontWeight: 'bold'}},
    {title:t('total'), style: {width: 70}, textStyle: {fontWeight: 'bold'}},
    {title:t('average'), style: {width: 50}, textStyle: {fontWeight: 'bold'}},
    {title:t('fullTank'), style: {width: 50}},
    {title:t('milleage'), style: {width: 50}},
    {title:'$' + t('milleage'), style: {width: 50}},
    {title:t('mixed'), style: {width: 100}},
    {title:t('observation'), style: {width: 500}},
  ];

  const isFocused = useIsFocused()

  const setPeriod = (index) => {
    let startDate = moment().subtract(1, 'months')
    let endDate = moment()
    switch (index) {
      case 'three_months':
        startDate = moment().subtract(3, 'months')
        break
      case 'six_months':
        startDate = moment().subtract(6, 'months')
        break
      case 'current_month':
        startDate = moment().startOf('month');
        break
      case 'current_year':
        startDate = moment().startOf('year');
        break
      case 'previous_month':
        startDate = moment().subtract(1,'months').startOf('month');
        endDate = moment().subtract(1,'months').endOf('month');
        break
      case 'previous_year':
        startDate = moment().subtract(1, 'years').startOf('year')
        endDate = moment().subtract(1, 'years').endOf('year')
        break
      default:
        break
    }

    startDate = startDate.toDate()
    endDate = endDate.toDate()

    setFillingPeriod({
      startFillingDate: startDate,
      endFillingDate: endDate
    })
  }

  useEffect(() => {
    if (!isFocused) {
      return
    }

    setLoading(true)

    db.transaction(function(tx) {
      tx.executeSql(`
        SELECT A.CodAbastecimento,
        A.Data_Abastecimento,
        A.KM,
        A.Observacao,
        A.TanqueCheio,
        GROUP_CONCAT(AC.CodCombustivel) AS CodCombustivel,
        SUM(AC.Litros) AS Litros,
        AVG(AC.Valor_Litro) AS Valor_Litro,
        SUM(AC.Total) AS Total
        FROM Abastecimento A
        INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
        WHERE A.CodVeiculo = ?
        AND A.Data_Abastecimento >= ? AND A.Data_Abastecimento <= ?
        GROUP BY AC.CodAbastecimento
        ORDER BY A.KM DESC
      `,
      [vehicleId, fromUserDateToDatabase(fillingPeriod.startFillingDate), fromUserDateToDatabase(fillingPeriod.endFillingDate)],
      function(tx, results) {
        const callback = (nextFilling) => {
          const temp = [];
          let totalSumAcc = 0
          let totalAverageAcc = 0
          let totalCount = 0
          for (let i = 0; i < results.rows.length; i++) {
            const filling = results.rows.item(i)
            if (!filling.CodCombustivel.split(',').includes(''+fuelType) && fuelType !== 0) {
              continue
            }

            let accomplishedKm
            let average
            nextFilling = i === 0 ? nextFilling : results.rows.item(i - 1)
            if (nextFilling) {
              accomplishedKm = nextFilling.KM - filling.KM
              average = accomplishedKm / nextFilling.Litros
            }

            temp.push([
              filling.CodAbastecimento,
              fromDatabaseToUserDate(filling.Data_Abastecimento),
              filling.CodCombustivel.split(',').map(cod => fuels[cod].value).join(),
              filling.Litros.toFixed(2),
              filling.KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
              filling.Valor_Litro.toFixed(2),
              filling.Total.toFixed(2),
              average ? average.toFixed(2) : '',
              filling.TanqueCheio ? t('yes'): t('no'),
              accomplishedKm,
              accomplishedKm ? (filling.Total / accomplishedKm).toFixed(2) : '',
              filling.CodCombustivel.split(',').length > 1 ? t('yes') : t('no'),
              filling.Observacao,
            ]);

            totalSumAcc += filling.Total
            if (average) {
              totalAverageAcc += average
              totalCount++
            }
          }
          setTableData(temp)
          setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)
          setTotalAverage(totalCount ? (totalAverageAcc/totalCount).toFixed(2) : 0)
          setLoading(false)
        }

        if (results.rows.length) {
          tx.executeSql(`
            SELECT A.KM, AC.Litros
            FROM Abastecimento A
            INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
            WHERE A.CodVeiculo = ?
            AND A.KM > ?
            ORDER BY A.KM
            LIMIT 1
          `,
            [vehicleId, results.rows.item(0).KM],
            (_, fillings) => {
              let nextFilling
              if (fillings.rows.length) {
                nextFilling = fillings.rows.item(0)
              }

              return callback(nextFilling)
            }, function(_, error) {
              console.log(error)
              setLoading(false)
            })
        } else {
          setLoading(false)
          setTableData([])
          setTotalSum(0)
          setTotalAverage(0)
        }
      }, function(_, error) {
        console.log(error)
        setLoading(false)
      })
    })
  }, [isFocused, fuelType, fillingPeriod]);

  const cellEditRow = (data) => (
    <TouchableOpacity onPress={() => {
      navigation.navigate('Fuel', { CodAbastecimento: data })
    }}>
      <View style={{...styles.btn, height: '100%'}}>
        <Text style={styles.btnText}><MaterialCommunityIcons
          name="gas-station" size={30} /></Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading loading={loading} />
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {showStartFillingDate &&
          <DateTimePicker
          value={fillingPeriod.startFillingDate}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowStartFillingDate(!showStartFillingDate);
            setFillingPeriod({
              ...fillingPeriod,
              startFillingDate: selectedDate || fillingPeriod.startFillingDate
            })
          }}
        />}

        {showEndFillingDate &&
          <DateTimePicker
          value={fillingPeriod.endFillingDate}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowEndFillingDate(!showEndFillingDate);
            setFillingPeriod({
              ...fillingPeriod,
              endFillingDate: selectedDate || fillingPeriod.endFillingDate
            })
          }}
        />}

        <View style={{ ...styles.splitRow}}>
          {/* <View style={{ flex: 8 }}> */}
            {/* <Dropdown style={{flex: 1}} label={t('vehicle')} data={vehicles} value='Meu'/> */}
          {/* </View> */}
          {/* <View style={{ flex: 1 }}/> */}
          <View style={{ flex: 1, marginRight: 5 }}>
            <Picker selectedValue={fuelType} onValueChange={itemValue => setFuelType(itemValue)}>
              {
                fuels.map(fuel => <Picker.Item label={fuel.value} value={fuel.index} key={fuel.index}/>)
              }
            </Picker>
          </View>

          <View style={{ flex: 1 }}>
            <Picker selectedValue={periodView} onValueChange={itemValue => {
              if (itemValue != periodView) {
                setPeriodView(itemValue)
                setPeriod(itemValue)
              }
            }}>
              {
                timeOptions.map(timeOption => <Picker.Item label={timeOption.value} value={timeOption.index} key={timeOption.index}/>)
              }
            </Picker>
          </View>
        </View>
        <View style={styles.splitRow}>
          <View style={{ flex: 1, marginRight: 5 }}>
            <TouchableOpacity onPress={() => setShowStartFillingDate(true)}>
              <TextInput
                label={t('startDate')}
                value={fromDatabaseToUserDate(fillingPeriod.startFillingDate)}
                mode='outlined'
                style={{flex: 1}}
                editable={false}
                onPress={() => {setShowStartFillingDate(true)}}
              />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setShowEndFillingDate(true)}>
              <TextInput
                label={t('endDate')}
                value={fromDatabaseToUserDate(fillingPeriod.endFillingDate)}
                mode='outlined'
                style={{flex: 1}}
                editable={false}
                onPress={() => {setShowEndFillingDate(true)}}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal>
          <View style={{marginTop: 10}}>
            <Table borderStyle={{borderWidth: 1, borderColor: Colors.tableBorderColor}}>
              <Row data={tableHead.map(row => row.title)} style={styles.header} widthArr={tableHead.map(row => row.style.width)} textStyle={[styles.text, {color: Colors.tableHeaderTextColor}]}/>

                {tableData.map((rowData, index) => (
                  <TableWrapper key={index} style={[styles.row, index%2 && {backgroundColor: Colors.tableOddRowColor}]}>
                  {
                      <>
                      {rowData.map((cellData, cellIndex) => (
                        <Cell borderStyle={{borderWidth: 1, borderColor: Colors.tableBorderColor}}
                        key={cellIndex} data={cellIndex === 0 ? cellEditRow(cellData, index) : cellData}
                        textStyle={{...styles.text, ...tableHead[cellIndex].textStyle}}
                        style={tableHead[cellIndex].style} />
                      ))}
                      </>
                  }
                  </TableWrapper>
                  ))
                }

            </Table>
          </View>
        </ScrollView>

        <View style={{ flex: 1, marginTop: 5 }}>
          <Text>{t('total')}: <NumberFormat value={totalSum} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={'$ '} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          <Text>{t('averageOfAverages')}: <NumberFormat value={totalAverage} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default withTheme(FuelConsumptionScreen);
