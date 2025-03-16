import { t } from '../locales'

const fuels = [{index: 1, value: t('gas')}, {index: 2, value: t('alcohol')}, {index: 3, value: t('diesel')}, {index: 4, value: t('naturalGas')}, {index: 5, value: t('leadedGas')}, {index: 6, value: t('additivatedEthanol')}]

const spendingTypes = [{
  index: '1', value: t('fuel')
},{
  index: '2', value: t('oil')
},{
  index: '3', value: t('carRepair')
},{
  index: '4', value: t('carInsurance')
},{
  index: '5', value: t('tax'),
},{
  index: '6', value: t('toll')
},{
  index: '7', value: t('parking')
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
  },
  {
    index: 'all',
    value: t('all')
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
