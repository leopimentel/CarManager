import { t } from '../locales'
import moment from 'moment';

const fromDatabaseToUserDate = date => moment(date, 'YYYY-MM-DD').format(t('dateFormat'))

const fromUserDateToDatabase = date => moment(date, t('dateFormat')).format('YYYY-MM-DD')

const choosePeriodFromIndex = (index) => {
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

    return {
      startDate: startDate,
      endDate: endDate
    }
  }

export {
    fromDatabaseToUserDate,
    fromUserDateToDatabase,
    choosePeriodFromIndex
}