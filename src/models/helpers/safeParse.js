function safeParse(instance) {
  // Try to parse instance.data if it exists and has a 'val' property
  if (instance?.data?.val) {
    return JSON.parse(instance.data.val)
  }
  // Directly return instance.dataValues.data if it exists
  if (instance?.dataValues?.data) {
    return instance.dataValues.data
  }
  // Directly return instance.data if it exists
  if (instance?.data) {
    return instance.data
  }

  return null
}

module.exports = safeParse
