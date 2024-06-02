import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { withTheme, TextInput, Button } from 'react-native-paper';
import { fuels as f, timeFilter, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { getStyles, toastError } from './style'
import { t } from '../locales'
import moment from 'moment';
import { Table, Row, TableWrapper, Cell } from 'react-native-table-component';
import { db } from '../database'
import { useIsFocused } from '@react-navigation/native'
import { fromUserDateToDatabase, fromDatabaseToUserDate, choosePeriodFromIndex } from '../utils/date'
import { ucfirst } from '../utils/string'
import { exportTableToCSV } from '../utils/csv'
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
  console.log("FuelConsumptionScreen begin", vehicleId)
  const [greatestAverage, setGreatestAverage] = useState(0);
  const [lowestAverage, setLowestAverage] = useState(0);
  const [greatestAverageFullTank, setGreatestAverageFullTank] = useState(0);
  const [lowestAverageFullTank, setLowestAverageFullTank] = useState(0);

  const initAveragesPerFuel = () => {
    let variable = {}
    for (let i=0; i<f.length; i++) {
      variable[f[i].index] = {
        acc: 0,
        count: 0
      }
    }
    return variable;
  }

  let av = initAveragesPerFuel();  

  const [averagesPerFuelType , setAveragesPerFuelType] = useState(av);

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
    {title:t('discount'), style: {width: 70}, textStyle: {fontWeight: 'bold'}},
    {title:t('totalWithDiscount'), style: {width: 70}, textStyle: {fontWeight: 'bold'}},
    {title:t('average'), style: {width: 60}, textStyle: {fontWeight: 'bold'}},
    {title:t('fullTank'), style: {width: 70}},
    {title:t('milleage'), style: {width: 70}},
    {title:t('currency') + t('milleage'), style: {width: 70}},
    //{title:t('mixed'), style: {width: 100}},
    {title:t('observation'), style: {width: 500, paddingLeft: 5}, textStyle: {textAlign: 'left'}},
  ];

  const isFocused = useIsFocused()

  const setPeriod = (index) => {
    console.log("at setperiod", vehicleId)
    if (index === 'all') {
      db.transaction(function(tx) {
        tx.executeSql(`
            SELECT MIN(A.Data_Abastecimento) AS Data_Abastecimento
            FROM Abastecimento A
            WHERE A.CodVeiculo = ?              
          `,
          [vehicleId],
          function(_, results) {
            if (!results.rows.item(0)['Data_Abastecimento'])
              return setFillingPeriod(choosePeriodFromIndex(index))
            
            setFillingPeriod({
              startDate: moment(results.rows.item(0)['Data_Abastecimento'], 'YYYY-MM-DD').toDate(),
              endDate: moment().toDate()
            })
          }, (_, error) => {
            console.log(error)
          }
        )
      });
    } else {
      setFillingPeriod(choosePeriodFromIndex(index))
    }
  }

  useEffect(() => {
    if (!isFocused) {
      console.log("FuelConsumptionScreen it is not focused", vehicleId)
      return
    }

    setLoading(true)

    db.transaction(function(tx) {
      tx.executeSql(
        `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V
        LEFT JOIN VeiculoPrincipal VP ON VP.CodVeiculo = V.CodVeiculo
        ORDER BY VP.CodVeiculo IS NOT NULL DESC`,
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
            console.log("FuelConsumptionScreen is focused VehicleId", vehicleId, "Cars[0]", cars[0].index)
            const carId = cars[0].index
            console.log("new VehicleId", carId)

            setVehicleId(carId)

            tx.executeSql(`
              SELECT A.CodAbastecimento,
              A.Data_Abastecimento,
              A.KM,
              A.Observacao,
              A.TanqueCheio,
              GROUP_CONCAT(AC.CodCombustivel) AS CodCombustivel,
              SUM(AC.Litros) AS Litros,
              (SUM(AC.Total) / SUM(AC.Litros)) AS Valor_Litro,
              SUM(AC.Total) AS Total,
              SUM(AC.Discount) As Discount
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
                let greatestAverageAux = 0
                let greatestAverageFullTankAux = 0
                let lowestAverageAux = 0
                let lowestAverageFullTankAux = 0
                let auxAveragesPerFuel = initAveragesPerFuel()

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
                    costPerKm = filling.Valor_Litro / average
                  }

                  temp.push([
                    filling.CodAbastecimento,
                    fromDatabaseToUserDate(filling.Data_Abastecimento),
                    filling.CodCombustivel.split(',').map(cod => fuels[cod].value).join(', '),
                    filling.Litros.toFixed(2),
                    filling.KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                    filling.Valor_Litro.toFixed(2),
                    filling.Total.toFixed(2),
                    filling.Discount.toFixed(2),
                    (filling.Total - filling.Discount).toFixed(2),
                    average ? average.toFixed(2) : '',
                    filling.TanqueCheio ? t('yes'): t('no'),
                    accomplishedKm,
                    costPerKm ? costPerKm.toFixed(2) : '',
                    //filling.CodCombustivel.split(',').length > 1 ? t('yes') : t('no'),
                    filling.Observacao,
                  ]);

                  totalSumAcc += filling.Total - filling.Discount
                  if (average) {
                    totalAverageAcc += average
                    totalCount++
                    if (filling.TanqueCheio && nextFilling.TanqueCheio) {
                      totalAccurate += average
                      totalCountAccurate++
                      if (greatestAverageFullTankAux === 0 || average > greatestAverageFullTankAux) {
                        greatestAverageFullTankAux = average
                      }

                      if (lowestAverageFullTankAux === 0 || average < lowestAverageFullTankAux) {
                        lowestAverageFullTankAux = average
                      }
                      if(auxAveragesPerFuel[filling.CodCombustivel]) {
                        auxAveragesPerFuel[filling.CodCombustivel] = {
                          acc: auxAveragesPerFuel[filling.CodCombustivel].acc + average,
                          count: ++auxAveragesPerFuel[filling.CodCombustivel].count
                        }
                      }
                    }
                    if (greatestAverageAux === 0 || average > greatestAverageAux) {
                      greatestAverageAux = average
                    }
                    if (lowestAverageAux === 0 || average < lowestAverageAux) {
                      lowestAverageAux = average
                    }
                  }

                  if (fuelType === 0) {
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
                }
                setTotalKM(maxKm - minKm)
                setTableData(temp)
                setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)
                setTotalAverage(totalCount ? (totalAverageAcc/totalCount).toFixed(2) : 0)
                setAccurateAverage(totalCountAccurate ? (totalAccurate/totalCountAccurate).toFixed(2) : 0)
                setLoading(false)
                setGreatestAverage(greatestAverageAux.toFixed(2))
                setGreatestAverageFullTank(greatestAverageFullTankAux.toFixed(2))
                setLowestAverage(lowestAverageAux.toFixed(2))
                setLowestAverageFullTank(lowestAverageFullTankAux.toFixed(2))
                setAveragesPerFuelType(auxAveragesPerFuel)
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
                setGreatestAverage(0)
                setGreatestAverageFullTank(0)
                setLowestAverage(0)
                setLowestAverageFullTank(0)
                setAveragesPerFuelType(av)
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

  const exportTable = async () => await exportTableToCSV(tableHead.map(row => row.title).slice(1), tableData.map(row => row.slice(1)), 'FuelConsumption.csv')

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

        {vehicles.length > 1 && <Picker style={styles.picker} label={t('vehicle')} selectedValue={vehicleId} onValueChange={itemValue => {
          console.log("VehicleId will be changed to ", itemValue)
          setVehicleId(itemValue)
          db.transaction(function(tx) {
            tx.executeSql(
              `UPDATE VeiculoPrincipal SET CodVeiculo = ${itemValue}`
            )
          })
          console.log("VehicleId Updated to", itemValue)
        }}>
          {
            vehicles.map(vehicle => <Picker.Item label={ucfirst(vehicle.value)} value={vehicle.index} key={vehicle.index}/>)
          }  
        </Picker>}

        <View style={{ ...styles.splitRow}}>          
          <View style={{ flex: 1, marginRight: 5 }}>
            <Picker style={styles.picker} selectedValue={fuelType} onValueChange={itemValue => setFuelType(itemValue)}>
              {
                fuels.map(fuel => <Picker.Item label={fuel.value} value={fuel.index} key={fuel.index}/>)
              }
            </Picker>
          </View>

          <View style={{ flex: 1 }}>
            <Picker style={styles.picker} selectedValue={periodView} onValueChange={itemValue => {
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

        <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <Button style={{ flex: 1, marginTop: 5, marginBottom: 0 }} labelStyle={{fontSize: 15}}
        uppercase={false} compact icon="google-spreadsheet" mode="contained" onPress={() => exportTable()}>
        {t('export_sheet')}
        </Button>
          </View>
        </View>

        <ScrollView horizontal>
          <View style={{marginTop: 5, marginBottom: 5}}>
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
          <Text>{t('totalSpent')}: <NumberFormat value={totalSum} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={t('currency')} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          {totalKM > 0 && <Text>{t('totalKM')}: <NumberFormat value={totalKM} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>}
          {totalKM > 0 && <Text>{t('totalFuelSpentByKM')}: <NumberFormat value={(totalSum / totalKM).toFixed(2)} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={t('currency')} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>}
          {/* <Text>{t('averageOfAverages')}: <NumberFormat value={totalAverage} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text> */}
          <Text>{t('averageOfAveragesAccurate')}: <NumberFormat value={accurateAverage} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          {/* <Text>{t('greatestAverage')}: <NumberFormat value={greatestAverage} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text> */}
          <Text>{t('greatestAverageFullTank')}: <NumberFormat value={greatestAverageFullTank} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          {/* <Text>{t('lowestAverage')}: <NumberFormat value={lowestAverage} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text> */}
          <Text>{t('lowestAverageFullTank')}: <NumberFormat value={lowestAverageFullTank} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          {Object.keys(averagesPerFuelType).map(key => (
            averagesPerFuelType[key].count>0 && <Text key={key}>{t('averageOfAverages' + key)}: <NumberFormat value={(averagesPerFuelType[key].acc / averagesPerFuelType[key].count).toFixed(2)}
                isNumericString={true} displayType={'text'} 
                thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} 
                suffix=' KM/L'
                renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} />
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default withTheme(FuelConsumptionScreen);
