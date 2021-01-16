import React, { useState, useEffect } from 'react';
import { Text, View, FlatList } from 'react-native';
import { withTheme, Button } from 'react-native-paper';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { Card } from 'react-native-paper';
import { fromDatabaseToUserDate } from '../utils/date'
import { Loading } from '../components/Loading'
import { useIsFocused } from '@react-navigation/native'
import { ucfirst } from '../utils/string'
import Colors from '../constants/Colors';

function RemindersScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [reminders, setReminders] = useState()
  const [loading, setLoading] = useState(false)
  const isFocused = useIsFocused()

  useEffect(() => {
    setLoading(true)
    db.transaction(function(tx) {
      tx.executeSql(
        `SELECT L.CodLembrete, L.CodVeiculo, L.DataCadastro, L.CodLembreteTipo,
        L.KM, L.DataLembrete, L.Observacao, L.Finalizado, L.CodGasto, LT.Descricao,
        V.Descricao AS Veiculo,
        (L.DataLembrete IS NOT NULL AND date('now', 'localtime') >= L.DataLembrete) AS DateTriggered,
        (
          L.KM IS NOT NULL AND L.KM < (
              SELECT 
              MAX(COALESCE(A.KM, G.KM, 0)) 
              FROM Gasto G
              LEFT JOIN Abastecimento A ON A.CodAbastecimento = G.CodAbastecimento
          )
      ) AS KMTriggered
        FROM Lembrete L
        INNER JOIN LembreteTipo LT ON LT.CodLembreteTipo = L.CodLembreteTipo
        INNER JOIN Veiculo V ON V.CodVeiculo = L.CodVeiculo
        ORDER BY L.Finalizado ASC, DateTriggered DESC, KMTriggered DESC, L.DataCadastro DESC`,
        [],
        function(_, results) {
          let aux = []
          if (results.rows.length) {
            for (let i = 0; i < results.rows.length; i++) {
              aux.push(results.rows.item(i));
            }            
          }
          setReminders(aux)
          setLoading(false)
        },
        function(error) {
          console.error(error)
        }
      )
    })
  }, [isFocused])

  const renderReminder = ({item}) => (
    <Card style={{borderColor: 'gray', borderWidth: 1, flex: 1, marginTop: 5, marginBottom: 5}}>
      <Card.Content>
        <Text><Text style={{fontWeight: 'bold'}}>{"Tipo do Lembrete"}:</Text> {item.Descricao}</Text>
        <Text><Text style={{fontWeight: 'bold', color: item.KMTriggered && !item.Finalizado ? 'red' : 'black'}}>{"KM"}:</Text> {item.KM}</Text>
        <Text><Text style={{fontWeight: 'bold', color: item.DateTriggered && !item.Finalizado ? 'red' : 'black'}}>{"Data do Lembrete"}:</Text> {item.DataLembrete ? fromDatabaseToUserDate(item.DataLembrete) : ''}</Text>
        <Text><Text style={{fontWeight: 'bold'}}>{"Observação"}:</Text> {item.Observacao}</Text>
        <Text><Text style={{fontWeight: 'bold'}}>{"Finalizado"}:</Text> {item.Finalizado ? t('yes') : t('no')}</Text>
      <Text><Text style={{fontWeight: 'bold'}}>{"Veiculo"}:</Text> {ucfirst(item.Veiculo) }</Text>
      </Card.Content>
      <Card.Actions>
      <Button mode="contained" onPress={() => 
        navigation.navigate('Reminder', {
          CodLembrete: item.CodLembrete
        })
      }
      >{t('edit')}</Button>
      </Card.Actions>
    </Card>
  )

  if (loading) {
    return <Loading loading={loading} />
  }
  return (
    <View style={styles.container}>
      <Button style={{ backgroundColor: Colors.tintColor }} labelStyle={{fontSize: 20}}
        uppercase={false} compact icon="bell" mode="contained" onPress={() => navigation.navigate('Reminder')}>
        {t('newReminder')}
      </Button>
      {reminders && <FlatList data={reminders} renderItem={renderReminder} keyExtractor={item => ''+item.CodLembrete} />}
      {!reminders && <Text>Não há lembretes cadastrados</Text>}
    </View>
  )
}

RemindersScreen.navigationOptions = {
  header: null,
};

export default withTheme(RemindersScreen);
