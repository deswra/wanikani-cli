const levenshtein = require('fast-levenshtein');
const { toKana } = require('wanakana');

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

const stringFormat = (str) => {
  return str
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\.|,|'|\u2019|\/|:/g, '');
};

const distanceTolerance = (str) => {
  switch (str.length) {
    case 1:
    case 2:
    case 3:
      return 0;
    case 4:
    case 5:
      return 1;
    case 6:
    case 7:
      return 2;
    default:
      return 2 + 1 * Math.floor(str.length / 7);
  }
};

const matchAnswer = (subjectType, quizType, correctAnswers, submittedAnswer) => {
  let answer = stringFormat(submittedAnswer);
  let wrongReading = false;
  let compareResult = -1;
  let result = false;
  if (quizType === 'meaning')
    compareResult = correctAnswers.findIndex((m) => {
      return levenshtein.get(answer, m.meaning.toLowerCase()) <= distanceTolerance(answer) && m.accepted_answer;
    });
  else {
    answer = toKana(answer);
    if (subjectType === 'kanji') {
      compareResult = correctAnswers.findIndex((r) => r.reading === answer && !r.accepted_answer);
      if (compareResult !== -1 && correctAnswers.findIndex((r) => r.reading === answer && r.accepted_answer) === -1) {
        wrongReading = true;
        return {
          result,
          wrongReading,
        };
      }
    }
    compareResult = correctAnswers.findIndex((r) => r.reading === answer && r.accepted_answer);
  }
  if (compareResult !== -1) {
    result = true;
  }
  return { result };
};

module.exports = {
  getSrsStageName,
  matchAnswer,
};
