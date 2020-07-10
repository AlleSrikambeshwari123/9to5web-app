formatDate = (date) => {
    if (!date) return '';
    return moment(date).subtract(4,'hours').format("MMM DD,YYYY HH:mm");
  }