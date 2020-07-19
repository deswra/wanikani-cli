const getSrsStageName = (srsStage) => {
  switch (srsStage) {
    case 0:
      return 'Initiate';
    case 1:
      return 'Apprentice I';
    case 2:
      return 'Apprentice II';
    case 3:
      return 'Apprentice III';
    case 4:
      return 'Apprentice IV';
    case 5:
      return 'Guru I';
    case 6:
      return 'Guru II';
    case 7:
      return 'Master';
    case 8:
      return 'Enlightened';
    case 9:
      return 'Burned';
  }
};

module.exports = {
  getSrsStageName,
};
