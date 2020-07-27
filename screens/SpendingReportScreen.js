import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-community/picker';
import { withTheme, TextInput } from 'react-native-paper';
import { vehicles as v, spendingTypes, timeFilter, decimalSeparator, thousandSeparator } from '../constants/fuel'
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

function SpendingReportScreen({ theme, navigation }) {
  const styles = getStyles(theme)
  const [period, setPeriod] = useState({
    startDate: moment().subtract(1, 'months').toDate(),
    endDate: moment().toDate()
  })
  const [showStartDate, setShowStartDate] = useState(false)
  const [showEndDate, setShowEndDate] = useState(false)
  const [spendingType, setSpendingType] = useState(0)
  const spendingTypesAll = [{index:0, value: t('all')},...spendingTypes]

  const [tableData, setTableData] = useState([])
  const [totalSum, setTotalSum] = useState(0)
  const vehicles = v;
  //@todo today only one vehicle is supported
  const vehicleId = vehicles[0].index;
  const timeOptions = timeFilter;
  const [periodView, setPeriodView] = useState(timeOptions[0].index)
  const [loading, setLoading] = useState(false)
  const tableHead = [
    {title: t('edit'), style: {width: 50}},
    {title: t('date'), style: {width: 90}},
    {title: t('value'), style: {width: 100}},
    {title: t('spendingType'), style: {width: 100}},
    {title: 'km', style: {width: 65}},
    {title: t('observation'), style: {width: 500}},
  ];

  const isFocused = useIsFocused()

  const choosePeriod = (index) => {
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

    setPeriod({
      startDate: startDate,
      endDate: endDate
    })
  }

  useEffect(() => {
    if (!isFocused) {
      return
    }

    setLoading(true)

    db.transaction(function(tx) {
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
      [vehicleId, fromUserDateToDatabase(period.startDate), fromUserDateToDatabase(period.endDate)],
      function(_, results) {
        let totalSumAcc = 0
        const temp = [];
        for (let i = 0; i < results.rows.length; i++) {
          const spending = results.rows.item(i)
          if (spending.CodGastoTipo !== spendingType && spendingType !== 0) {
            continue
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
    })
  }, [isFocused, period, spendingType]);

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
          onChange={(event, selectedDate) => {
            setShowEndDate(!showEndDate);
            setPeriod({
              ...period,
              endDate: selectedDate || period.endDate
            })
          }}
        />}
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
        </ScrollView>

        <View style={{ flex: 1, marginTop: 5 }}>
          <Text>{t('total')}: <NumberFormat value={totalSum} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={'$ '} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default withTheme(SpendingReportScreen);
