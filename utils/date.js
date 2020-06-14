import { t } from '../locales'
import moment from 'moment';

const fromDatabaseToUserDate = date => moment(date, 'YYYY-MM-DD').format(t('dateFormat'))

const fromUserDateToDatabase = date => moment(date, t('dateFormat')).format('YYYY-MM-DD')

export {
    fromDatabaseToUserDate,
    fromUserDateToDatabase
}