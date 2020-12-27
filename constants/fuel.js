import { t } from '../locales'

const fuels = [{index: 1, value: t('gas')}, {index: 2, value: t('alcohol')}, {index: 3, value: t('diesel')}, {index: 4, value: t('naturalGas')}, {index: 5, value: t('leadedGas')}]

const spendingTypes = [{
  index: '1', value: t('fuel')
},{
  index: '2', value: t('oil')
},{
  index: '3', value: t('carRepair')
}];

const timeFilter = [
  {
    index: 'one_month',
    value: '1m'
  },
  {
    index: 'three_months',
    value: '3m'
  },
  {
    index: 'six_months',
    value: '6m'
  },
  {
    index: 'current_month',
    value: t('currentMonth')
  },
  {
    index: 'current_year',
    value: t('currentYear')
  },
  {
    index: 'previous_month',
    value: t('previousMonth')
  },
  {
    index: 'previous_year',
    value: t('previousYear')
  }
]

const decimalSeparator = ','

const thousandSeparator = '.'

export {
  fuels,
  timeFilter,
  decimalSeparator,
  thousandSeparator,
  spendingTypes
};
