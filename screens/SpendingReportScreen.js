import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { withTheme, TextInput, Button, Card } from 'react-native-paper';
import { spendingTypes, timeFilter, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { getStyles } from './style'
import { t } from '../locales'
import moment from 'moment';
import { Table, Row, TableWrapper, Cell } from 'react-native-table-component';
import { db } from '../database'
import { fetchVehicles, fetchEarliestSpendingDate, fetchSpendingReportData, updatePrimaryVehicle } from '../database/queries'
import { useIsFocused } from '@react-navigation/native'
import { fromUserDateToDatabase, fromDatabaseToUserDate, choosePeriodFromIndex } from '../utils/date'
import { ucfirst } from '../utils/string'
import { Loading } from '../components/Loading'
import { NumericFormat } from 'react-number-format';
import Colors from '../constants/Colors'
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SectionedMultiSelect from 'react-native-sectioned-multi-select';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { exportTableToCSV } from '../utils/csv'

function SpendingReportScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [period, setPeriod] = useState({
    startDate: moment().subtract(1, 'months').toDate(),
    endDate: moment().toDate()
  })
  const [showStartDate, setShowStartDate] = useState(false)
  const [showEndDate, setShowEndDate] = useState(false)
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
    {title: t('autoRepair'), style: {width: 250, paddingLeft: 5}, textStyle: {textAlign: 'left'}},
  ];
  const [selectedItems, setSelectedItems] = useState([]);
  const [totalKM, setTotalKM] = useState(0)

  const exportTable = async () => await exportTableToCSV(tableHead.map(row => row.title).slice(1), tableData.map(row => row.slice(1)), 'SpendingReport.csv')

  const onSelectedItemsChange = selectedItems => {
    setSelectedItems(selectedItems);
  };

  const isFocused = useIsFocused()

  const choosePeriod = async (index) => {
    if (index === 'all') {
      let row = await fetchEarliestSpendingDate(vehicleId);
          
      if (!row || !row['Data'])
        return setPeriod(choosePeriodFromIndex(index))
      
      setPeriod({
        startDate: moment(row['Data'], 'YYYY-MM-DD').toDate(),
        endDate: moment().toDate()
      })
    } else {
      setPeriod(choosePeriodFromIndex(index))
    }
  }

  const search = useCallback(async ()=>{
    setLoading(true)
    
    let results = await fetchVehicles();

    let cars = []
            
    if (results.length) {
      for (const row of results) {
        cars.push({
          index: row.CodVeiculo,
          value: row.Descricao
        });
      }

      results = await fetchSpendingReportData(cars[0].index, fromUserDateToDatabase(period.startDate), fromUserDateToDatabase(period.endDate));

      let totalSumAcc = 0
      let minKm = 0
      let maxKm = 0
      const temp = [];
      for (const spending of results) {          
        if (selectedItems.indexOf(''+spending.CodGastoTipo) === -1 && selectedItems.length !== 0) {
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
          spending.Valor.toFixed(2),
          spendingTypes.filter(spd => spd.index === (''+spending.CodGastoTipo))[0].value,
          spending.KM ? spending.KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '',
          spending.Observacao,
          spending.Oficina
        ]);
        totalSumAcc += spending.Valor

        if (spending.KM && observation.length === 0 && selectedItems.length === 0) {
          if (temp.length === 1) {
            minKm = maxKm = spending.KM 
          } else {
            if (spending.KM < minKm || minKm === 0) {
              minKm = spending.KM
            }

            if (spending.KM > maxKm || maxKm === 0) {
              maxKm = spending.KM
            }
          }
        }
      }

      setTableData(temp)
      setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)
      setTotalKM(maxKm - minKm)
      
      setLoading(false)
    }
    setVehicleId(cars[0].index)
    setVehicles(cars)
  }, [period, selectedItems, observation, vehicleId]);

  useEffect(() => {
    if (!isFocused) {
      return
    }
    
    search()
  }, [isFocused, period, selectedItems, vehicleId]);

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
      <FlatList
      ListHeaderComponent={
      <>
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
        <Picker dropdownIconColor="#000" style={styles.picker} label={t('vehicle')} selectedValue={vehicleId} onValueChange={async itemValue => {
          setVehicleId(itemValue)
          await updatePrimaryVehicle(itemValue);
          console.log("VehicleId updated to", itemValue)
        }}>
          {
            vehicles.map(vehicle => <Picker.Item label={ucfirst(vehicle.value)} value={vehicle.index} key={vehicle.index}/>)
          }
        </Picker>}
        <View style={{ ...styles.splitRow}}>
          <View style={{ flex: 1, marginRight: 5, marginLeft: 5 }}>
            <SectionedMultiSelect
              items={spendingTypes}
              IconRenderer={Icon}
              uniqueKey="index"
              displayKey="value"
              onSelectedItemsChange={onSelectedItemsChange}
              selectedItems={selectedItems}
              selectText={t('spending')}
              confirmText={t('search')}
              searchPlaceholderText={t('search') + '...'}
              colors={{primary:Colors.primary}}
              // fontSize={16}
              // onChangeInput={ (text)=> console.log(text)}
              // tagRemoveIconColor="#000"
              // tagBorderColor="#CCC"
              // textColor="#000"
              // tagTextColor="#000"
              // selectedItemTextColor="#000"
              // selectedItemIconColor="#000"
              // itemTextColor="#000"
              // searchInputStyle={{ color: '#000' }}
           />
       
          </View>

          <View style={{ flex: 1 }}>
            <Picker dropdownIconColor="#000" style={styles.picker} selectedValue={periodView} onValueChange={itemValue => {
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
            left={<TextInput.Icon name={'magnify'} color={'grey'}/>}
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
            <Button style={{ flex: 1, marginTop: 0, marginBottom: 0 }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="google-spreadsheet" mode="contained" onPress={() => exportTable()}>
          {t('export_sheet')}
            </Button>
        </View>

        {mode === TABLE_MODE &&
        <ScrollView horizontal>
          <View style={{marginTop: 5, marginBottom: 5}}>
            <Table>
              <Row data={tableHead.map(row => row.title)} style={styles.header} widthArr={tableHead.map(row => row.style.width)} textStyle={[styles.text, {color: Colors.tableHeaderTextColor}]}/>

                {tableData.map((rowData, index) => (
                  <TableWrapper key={index} style={{...styles.row, ...{backgroundColor: index%2 ? Colors.tableOddRowColor : Colors.tableEvenRowColor}}}>
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
               {rowData[5] && <Text><Text style={{fontWeight: 'bold'}}>{tableHead[5].title}:</Text> {rowData[5]}</Text>}
               {rowData[6] && <Text><Text style={{fontWeight: 'bold'}}>{tableHead[6].title}:</Text> {rowData[6]}</Text>}
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
          <Text>{t('total')}: <NumericFormat value={totalSum} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={t('currency')} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
          {totalKM > 0 && <Text>{t('totalSpentByKM')}: <NumericFormat 
            value={(totalSum / totalKM).toFixed(2)} displayType={'text'} 
            isNumericString={true} thousandSeparator={thousandSeparator} 
            decimalSeparator={decimalSeparator} prefix={t('currency')} 
            renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>}
          {selectedItems.length === 0 && totalKM > 0 && <Text>{t('totalKM')}: <NumericFormat value={totalKM} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM' renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>}
        </View>
      </>}/>
    </View>
  );
}

export default withTheme(SpendingReportScreen);
