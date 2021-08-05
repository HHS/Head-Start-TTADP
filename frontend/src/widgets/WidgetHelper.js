/* WidgetHelper.js */
/* Helper Functions for Widgets */
function FormatNumber(numberToFormat, decimalPlaces = 0) {
  if (!numberToFormat || Number.isNaN(numberToFormat)) {
    return 0;
  }

  let number = parseFloat(numberToFormat);
  number = number.toLocaleString(undefined,
    { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });

  return number;
}
export default FormatNumber;
