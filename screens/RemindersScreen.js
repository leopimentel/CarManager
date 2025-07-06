import React, { useState, useEffect } from 'react';
import { Text, View, FlatList } from 'react-native';
import { withTheme, Button, Card } from 'react-native-paper';
import { t } from '../locales'
import { getStyles } from './style'
import { fetchReminders } from '../database/queries'
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
    async function fetchData() {
      let results = await fetchReminders();
          
      let aux = []
      if (results.length) {
        for (const row of results) {
          aux.push(row);
        }            
      }
      setReminders(aux)
      setLoading(false)
    }
    fetchData()
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

export default withTheme(RemindersScreen);
