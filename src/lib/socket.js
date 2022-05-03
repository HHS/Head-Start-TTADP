async function editActivityReports(metaData) {
  const { activityReportId } = metaData;
  if (activityReportId) {
    return `edit-activity-report-${activityReportId}`;
  }
  return '';
}

const EVENT_TYPES = {
  'edit-activity-report': editActivityReports,
};

const socketSubscriber = async () => {
//   const nameChannel = EVENT_TYPES[event];
//   if (nameChannel) {
//     const channel = nameChannel(event, metaData);
//     if (channel) {
//       await subscriber.subscribe(channel, async (message) => {
//         client.send(JSON.stringify(message));
//       });
//     }
//   }
};

const socketPublisher = async (event, publisher, metaData) => {
  const nameChannel = EVENT_TYPES[event];
  if (nameChannel) {
    const channel = nameChannel(event, metaData);
    if (channel) {
      await publisher.publish(channel, JSON.stringify(metaData));
    }
  }
};

export {
  socketPublisher,
  socketSubscriber,
};
