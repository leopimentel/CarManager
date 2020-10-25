import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-community/picker';
import { withTheme, TextInput, Button, Card } from 'react-native-paper';
import { spendingTypes, timeFilter, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { getStyles } from './style'
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

function SpendingReportScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [period, setPeriod] = useState({
    startDate: moment().subtract(1, 'months').toDate(),
    endDate: moment().toDate()
  })
  const [showStartDate, setShowStartDate] = useState(false)
  const [showEndDate, setShowEndDate] = useState(false)
  const [spendingType, setSpendingType] = useState(0)
  const spendingTypesAll = [{index:0, value: t('all')},...spendingTypes]
  const [observation, setObservation] = useState('')
  const TABLE_MODE = true
  const CARD_MODE = false
  const [tableData, setTableData] = useState([])
  const [totalSum, setTotalSum] = useState(0)
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState();
  const [mode, setMode] = useState(TABLE_MODE)
  const timeOptions = timeFilter;
  const [periodView, setPeriodView] = useState(timeOptions[0].index)
  const [loading, setLoading] = useState(false)
  const tableHead = [
    {title: t('edit'), style: {width: 50}},
    {title: t('date'), style: {width: 90}},
    {title: t('value'), style: {width: 70}},
    {title: t('spendingType'), style: {width: 100}},
    {title: 'km', style: {width: 65}},
    {title: t('observation'), style: {width: 500, paddingLeft: 5}, textStyle: {textAlign: 'left'}},
  ];

  const isFocused = useIsFocused()

  const choosePeriod = (index) => {
    setPeriod(choosePeriodFromIndex(index))
  }

  useEffect(() => {
    setVehicleId(route.params?.CodVeiculo)
  }, [route.params?.CodVeiculo])

  const search = useCallback(()=>{
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

            tx.executeSql(`
              SELECT
              G.CodAbastecimento,
              G.CodGasto,
              G.Data,
              G.Valor,
              G.CodGastoTipo,
              G.Observacao,
              G.KM
              FROM Gasto G
              WHERE G.CodVeiculo = ?
              AND G.Data >= ? AND G.Data <= ?
              ORDER BY G.Data DESC
            `,
            [vehicleId ? vehicleId : cars[0].index, fromUserDateToDatabase(period.startDate), fromUserDateToDatabase(period.endDate)],
            function(_, results) {
              let totalSumAcc = 0
              const temp = [];
              for (let i = 0; i < results.rows.length; i++) {
                const spending = results.rows.item(i)
                if (spending.CodGastoTipo !== spendingType && spendingType !== 0) {
                  continue
                }

                if (observation) {
                  if (!spending.Observacao) {
                    continue
                  }
                  const str = observation.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                  const strDatabase = spending.Observacao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                  if (strDatabase.indexOf(str) === -1) {
                    continue
                  }
                }

                temp.push([
                  spending.CodAbastecimento || spending.CodGasto,
                  fromDatabaseToUserDate(spending.Data),
                  spending.Valor,
                  spendingTypes.filter(spd => spd.index === spending.CodGastoTipo)[0].value,
                  spending.KM ? spending.KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '',
                  spending.Observacao,
                ]);
                totalSumAcc += spending.Valor
              }

              setTableData(temp)
              setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)

              
              setLoading(false)
            })
          }
        }
      )
    })
  }, [period, spendingType, observation, vehicleId]);

  useEffect(() => {
    if (!isFocused) {
      return
    }
    
    search()
  }, [isFocused, period, spendingType, vehicleId]);

  const cellEditRow = (rowData) => {
    const isFuel = rowData[3] === t('fuel')
    return (
      <TouchableOpacity onPress={() => {
        if (isFuel) {
          navigation.navigate('Fuel', {
            CodAbastecimento: rowData[0]
          })
        } else {
          navigation.navigate('Spending', {
            CodGasto: rowData[0]
          })
        }
      }}>

      <View style={{...styles.btn, height: '100%'}}>
        <Text style={styles.btnText}><MaterialCommunityIcons
          name={isFuel ? "gas-station" : "playlist-edit"} size={30} /></Text>
      </View>
    </TouchableOpacity>
  )};

  if (loading) {
    return <Loading loading={loading} />
  }

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps='always'>
        {showStartDate &&
          <DateTimePicker
          value={period.startDate}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowStartDate(!showStartDate);
            setPeriod({
              ...period,
              startDate: selectedDate || period.startDate
            })
          }}
        />}

        {showEndDate &&
          <DateTimePicker
          value={period.endDate}
          mode="date"
          onChange={(_, selectedDate) => {
            setShowEndDate(!showEndDate);
            setPeriod({
              ...period,
              endDate: selectedDate || period.endDate
            })
          }}
        />}

        {vehicles.length > 1 && 
        <Picker label={t('vehicle')} selectedValue={vehicleId} onValueChange={itemValue => setVehicleId(itemValue)}>
          {
            vehicles.map(vehicle => <Picker.Item label={ucfirst(vehicle.value)} value={vehicle.index} key={vehicle.index}/>)
          }
        </Picker>}
        <View style={{ ...styles.splitRow}}>
          <View style={{ flex: 1, marginRight: 5 }}>
            <Picker selectedValue={spendingType} onValueChange={itemValue => setSpendingType(itemValue)}>
            {
              spendingTypesAll.map(spending => <Picker.Item label={spending.value} value={spending.index} key={spending.index}/>)
            }  
          </Picker>
          </View>

          <View style={{ flex: 1 }}>
            <Picker selectedValue={periodView} onValueChange={itemValue => {
              if (itemValue != periodView) {
                setPeriodView(itemValue)
                choosePeriod(itemValue)
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
            <TouchableOpacity onPress={() => setShowStartDate(true)}>
              <TextInput
                label={t('startDate')}
                value={fromDatabaseToUserDate(period.startDate)}
                mode='outlined'
                style={{flex: 1}}
                editable={false}
                onPress={() => {setShowStartDate(true)}}
              />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setShowEndDate(true)}>
              <TextInput
                label={t('endDate')}
                value={fromDatabaseToUserDate(period.endDate)}
                mode='outlined'
                style={{flex: 1}}
                editable={false}
                onPress={() => {setShowEndDate(true)}}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.splitRow}>
          <TextInput
            label={t('observation')}
            value={observation}
            onChangeText={text => setObservation(text)}
            onBlur={() => search()}
            mode='outlined'
            style={{flex: 1}}
          />
        </View>

        <View style={{...styles.splitRow, justifyContent: 'flex-start', marginTop: 10}}>
            <Button 
              icon={() => <MaterialCommunityIcons name='format-list-checkbox' size={35} style={{color: mode === TABLE_MODE ? 'green': 'black'}} />}
              onPress={() => setMode(TABLE_MODE)}
            >            
            </Button>
            <Button 
              icon={() => <MaterialCommunityIcons name='view-dashboard-outline' size={35} style={{color: mode === CARD_MODE ? 'green': 'black'}}/>}
              onPress={() => setMode(CARD_MODE)}
            >                
            </Button>
        </View>

        {mode === TABLE_MODE &&
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
                        key={cellIndex} data={cellIndex === 0 ? cellEditRow(rowData, index) : cellData}
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
        </ScrollView>}

        {mode === CARD_MODE &&
        <>
        {tableData.map((rowData, index) => (
          <Card key={index} style={{borderColor: 'gray', borderWidth: 1, flex: 1, marginTop: 5, marginBottom: 5}}>
             <Card.Content>
               <Text><Text style={{fontWeight: 'bold'}}>{tableHead[1].title}:</Text> {rowData[1]}</Text>
               <Text><Text style={{fontWeight: 'bold'}}>{tableHead[2].title}:</Text> {rowData[2]}</Text>
               <Text><Text style={{fontWeight: 'bold'}}>{tableHead[3].title}:</Text> {rowData[3]}</Text>
               <Text><Text style={{fontWeight: 'bold'}}>{tableHead[4].title}:</Text> {rowData[4]}</Text>
               <Text><Text style={{fontWeight: 'bold'}}>{tableHead[5].title}:</Text> {rowData[5]}</Text>
             </Card.Content>
             <Card.Actions>
             <Button mode="contained" onPress={() => rowData[3] === t('fuel') ? 
                navigation.navigate('Fuel', {
                  CodAbastecimento: rowData[0]
                }) : 
                navigation.navigate('Spending', {
                  CodGasto: rowData[0]
                })
              }
             >{tableHead[0].title}</Button>
             </Card.Actions>
          </Card>
          ))}
        </>
      } 
        <View style={{ flex: 1, marginTop: 5 }}>
          <Text>{t('total')}: <NumberFormat value={totalSum} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={t('currency')} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default withTheme(SpendingReportScreen);
