const databaseFloatFormat = number => {
    let numberAux = number.replace(/\s/g, '').replace(/,/g, '.')
    console.log('numberAux', numberAux)
    let numbers = numberAux.split('.')
    return numbers.length > 1 ? numbers[0] + '.' + numbers.slice(1).join('') : numberAux
}

const databaseIntegerFormat = number => number.replace(/\s|,|\./g, '')

export {
    databaseFloatFormat,
    databaseIntegerFormat
}