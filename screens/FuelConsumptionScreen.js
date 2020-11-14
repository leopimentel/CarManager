import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {Picker} from '@react-native-community/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { withTheme, TextInput } from 'react-native-paper';
import { fuels as f, timeFilter, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { getStyles, toastError } from './style'
import { t } from '../locales'
import moment from 'moment';
import { Table, Row, TableWrapper, Cell } from 'react-native-table-component';
import { db } from '../database'
import { useIsFocused } from '@react-navigation/native'
import { fromUserDateToDatabase, fromDatabaseToUserDate, choosePeriodFromIndex } from '../utils/date'
import { ucfirst } from '../utils/string'
import { Loading } from '../components/Loading'
import NumberFormat from 'react-number-format';
import Colors from '../constants/Colors'
import { MaterialCommunityIcons } from '@expo/vector-icons';

function FuelConsumptionScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [fillingPeriod, setFillingPeriod] = useState({
    startDate: moment().subtract(1, 'months').toDate(),
    endDate: moment().toDate()
  })

  const [showStartFillingDate, setShowStartFillingDate] = useState(false)
  const [showEndFillingDate, setShowEndFillingDate] = useState(false)
  const [fuelType, setFuelType] = useState(0)
  const [tableData, setTableData] = useState([])
  const [totalSum, setTotalSum] = useState(0)
  const [totalAverage, setTotalAverage] = useState(0)
  const [accurateAverage, setAccurateAverage] = useState(0)
  const [totalKM, setTotalKM] = useState(0)
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState();
  
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
    {title:t('average'), style: {width: 60}, textStyle: {fontWeight: 'bold'}},
    {title:t('fullTank'), style: {width: 50}},
    {title:t('milleage'), style: {width: 50}},
    {title:t('currency') + t('milleage'), style: {width: 50}},
    //{title:t('mixed'), style: {width: 100}},
    {title:t('observation'), style: {width: 500, paddingLeft: 5}, textStyle: {textAlign: 'left'}},
  ];

  const isFocused = useIsFocused()

  const setPeriod = (index) => {
    setFillingPeriod(choosePeriodFromIndex(index))
  }

  useEffect(() => {
    setVehicleId(route.params?.CodVeiculo)
  }, [route.params?.CodVeiculo])

  useEffect(() => {
    if (!isFocused) {
      return
    }

    setLoading(true)

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

            const carId = vehicleId ? vehicleId : cars[0].index

            tx.executeSql(`
              SELECT A.CodAbastecimento,
              A.Data_Abastecimento,
              A.KM,
              A.Observacao,
              A.TanqueCheio,
              GROUP_CONCAT(AC.CodCombustivel) AS CodCombustivel,
              SUM(AC.Litros) AS Litros,
              (SUM(AC.Total) / SUM(AC.Litros)) AS Valor_Litro,
              SUM(AC.Total) AS Total
              FROM Abastecimento A
              INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
              WHERE A.CodVeiculo = ?
              AND A.Data_Abastecimento >= ? AND A.Data_Abastecimento <= ?
              GROUP BY AC.CodAbastecimento
              ORDER BY A.KM DESC
            `,
            [carId, fromUserDateToDatabase(fillingPeriod.startDate), fromUserDateToDatabase(fillingPeriod.endDate)],
            function(tx, results) {
              const callback = (nextFilling) => {
                const temp = [];
                let totalSumAcc = 0
                let totalAverageAcc = 0
                let totalCount = 0
                let totalCountAccurate = 0
                let totalAccurate = 0
                let minKm = 0
                let maxKm = 0

                for (let i = 0; i < results.rows.length; i++) {
                  const filling = results.rows.item(i)
                  if (!filling.CodCombustivel.split(',').includes(''+fuelType) && fuelType !== 0) {
                    continue
                  }

                  let accomplishedKm
                  let average
                  let costPerKm = 0
                  nextFilling = i === 0 ? nextFilling : results.rows.item(i - 1)
                  if (nextFilling) {
                    accomplishedKm = nextFilling.KM - filling.KM
                    average = accomplishedKm / nextFilling.Litros
                    costPerKm = nextFilling.Total / accomplishedKm
                  }

                  temp.push([
                    filling.CodAbastecimento,
                    fromDatabaseToUserDate(filling.Data_Abastecimento),
                    filling.CodCombustivel.split(',').map(cod => fuels[cod].value).join(', '),
                    filling.Litros.toFixed(2),
                    filling.KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                    filling.Valor_Litro.toFixed(2),
                    filling.Total.toFixed(2),
                    average ? average.toFixed(2) : '',
                    filling.TanqueCheio ? t('yes'): t('no'),
                    accomplishedKm,
                    costPerKm ? costPerKm.toFixed(2) : '',
                    //filling.CodCombustivel.split(',').length > 1 ? t('yes') : t('no'),
                    filling.Observacao,
                  ]);

                  totalSumAcc += filling.Total
                  if (average) {
                    totalAverageAcc += average
                    totalCount++
                    if (filling.TanqueCheio && nextFilling.TanqueCheio) {
                      totalAccurate += average
                      totalCountAccurate++
                    }
                  }

                  if (temp.length === 1) {
                    minKm = maxKm = filling.KM 
                  } else {
                    if (filling.KM < minKm || minKm === 0) {
                      minKm = filling.KM
                    }

                    if (filling.KM > maxKm || maxKm === 0) {
                      maxKm = filling.KM
                    }
                  }
                }
                setTotalKM(maxKm - minKm)
                setTableData(temp)
                setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)
                setTotalAverage(totalCount ? (totalAverageAcc/totalCount).toFixed(2) : 0)
                setAccurateAverage(totalCountAccurate ? (totalAccurate/totalCountAccurate).toFixed(2) : 0)
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
                  [carId, results.rows.item(0).KM],
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
                setTotalKM(0)
                setAccurateAverage(0)
              }
            }, function(_, error) {
              console.log(error)
              setLoading(false)
            })
          }

          setVehicles(cars)
        }
      )
    })
      
  }, [isFocused, fuelType, fillingPeriod, vehicleId]);

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

  const cellAverage = (data, index) => {
    var notFullTank = tableData[index][8] === t('no') || (index && tableData[index-1][8] === t('no'))
    return (
      <Text style={{...styles.text}} onPress={()=>  
        notFullTank ? 
        toastError(t('wrongAverageInfo'))
       : null
      }>
        { notFullTank ? <MaterialCommunityIcons
        name="information" style={{color: Colors.negativeColor}} size={14} /> : '' }
        { data }
      </Text>
    );    
  };

  if (loading) {
    return <Loading loading={loading} />
  }

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps='always'>
        {showStartFillingDate &&
          <DateTimePicker
          value={fillingPeriod.startDate}
          mode="date"
          onChange={(_, selectedDate) => {
            setShowStartFillingDate(!showStartFillingDate);
            setFillingPeriod({
              ...fillingPeriod,
              startDate: selectedDate || fillingPeriod.startDate
            })
          }}
        />}

        {showEndFillingDate &&
          <DateTimePicker
          value={fillingPeriod.endDate}
          mode="date"
          onChange={(_, selectedDate) => {
            setShowEndFillingDate(!showEndFillingDate);
            setFillingPeriod({
              ...fillingPeriod,
              endDate: selectedDate || fillingPeriod.endDate
            })
          }}
        />}

        {vehicles.length > 1 && <Picker label={t('vehicle')} selectedValue={vehicleId} onValueChange={itemValue => setVehicleId(itemValue)}>
          {
            vehicles.map(vehicle => <Picker.Item label={ucfirst(vehicle.value)} value={vehicle.index} key={vehicle.index}/>)
          }  
        </Picker>}

        <View style={{ ...styles.splitRow}}>          
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
                value={fromDatabaseToUserDate(fillingPeriod.startDate)}
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
                value={fromDatabaseToUserDate(fillingPeriod.endDate)}
                mode='outlined'
                style={{flex: 1}}
                editable={false}
                onPress={() => {setShowEndFillingDate(true)}}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal>
          <View style={{marginTop: 5}}>
            <Table borderStyle={{borderWidth: 1, borderColor: Colors.tableBorderColor}}>
              <Row data={tableHead.map(row => row.title)} style={styles.header} widthArr={tableHead.map(row => row.style.width)} textStyle={[styles.text, {color: Colors.tableHeaderTextColor}]}/>

                {tableData.map((rowData, index) => (
                  <TableWrapper key={index} style={[styles.row, index%2 && {backgroundColor: Colors.tableOddRowColor}]}>
                  {
                      <>
                      {rowData.map((cellData, cellIndex) => (
                        <Cell borderStyle={{borderWidth: 1, borderColor: Colors.tableBorderColor}}
                        key={cellIndex} data={cellIndex === 0 ? cellEditRow(cellData, index) : 
                          cellIndex === 7 ? cellAverage(cellData, index) : cellData}
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
          <Text>{t('total')}: <NumberFormat value={totalSum} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={t('currency')} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          <Text>{t('averageOfAverages')}: <NumberFormat value={totalAverage} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          <Text>{t('averageOfAveragesAccurate')}: <NumberFormat value={accurateAverage} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          <Text>{t('totalKM')}: <NumberFormat value={totalKM} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default withTheme(FuelConsumptionScreen);
