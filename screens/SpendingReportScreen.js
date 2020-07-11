import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import { withTheme } from 'react-native-paper';
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
    startDate: moment().subtract(1, 'months').format(t('dateFormat')),
    endDate: moment().format(t('dateFormat'))
  })
  const [spendingType, setSpendingType] = useState(0)
  const [spendingTypeView, setSpendingTypeView] = useState(t('all'))
  const spendingTypesAll = [{index:0, value: t('all')},...spendingTypes]

  const [tableData, setTableData] = useState([])
  const [totalSum, setTotalSum] = useState(0)
  const vehicles = v;
  //@todo today only one vehicle is supported
  const vehicleId = vehicles[0].index;
  const timeOptions = timeFilter;
  const [periodView, setPeriodView] = useState(timeOptions[0].value)
  const [loading, setLoading] = useState(false)
  const tableHead = [
    {title: t('edit'), style: {width: 50}},
    {title: t('date'), style: {width: 90}},
    {title: t('value'), style: {width: 100}},
    {title: t('spendingType'), style: {width: 100}},
    {title: 'km', style: {width: 50}},
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

    setPeriod({
      startDate: startDate.format(t('dateFormat')),
      endDate: endDate.format(t('dateFormat'))
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
        if (results.rows.length) {
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
          }

          setTableData(temp)
          setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)
        }
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
          name={isFuel ? "gas-station" : "edit"} size={30} /></Text>
      </View>
    </TouchableOpacity>
  )};

  if (loading) {
    return <Loading loading={loading} />
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={{ ...styles.splitRow}}>
          <View style={{ flex: 1, marginLeft: 5 }}>
            <Dropdown label={t('spendingType')} data={spendingTypesAll} value={spendingTypeView} onChangeText={(value) => {
              setSpendingType(spendingTypesAll.filter(fuel => fuel.value === value)[0].index)
              setSpendingTypeView(spendingTypesAll.filter(fuel => fuel.value === value)[0].value)
            }}/>
          </View>
        </View>
        <View style={styles.splitRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}> {t('startDate')} </Text>
            <DatePicker
              style={{ flex: 1, width: 100 }}
              date={period.startDate}
              mode="date"
              format={t('dateFormat')}
              confirmBtnText={t('confirm')}
              cancelBtnText={t('cancel')}
              locale="pt_br"
              showIcon={false}
              onDateChange={(date) => {setPeriod({
                ...period,
                startDate: date
              })}}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}> {t('endDate')} </Text>
            <DatePicker
              style={{ flex: 1, width: 100 }}
              date={period.endDate}
              mode="date"
              format={t('dateFormat')}
              confirmBtnText={t('confirm')}
              cancelBtnText={t('cancel')}
              locale="pt_br"
              showIcon={false}
              onDateChange={(date) => {setPeriod({
                ...period,
                endDate: date
              })}}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Dropdown style={{flex: 1}} label={t('period')} data={timeOptions} value={periodView} onChangeText={(value, index, data) => {
              choosePeriod(data[index].index)
              setPeriodView(data[index].value)
            }}/>
          </View>
        </View>

        <ScrollView horizontal>
          <View>
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
