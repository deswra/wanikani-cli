require('dotenv').config();
const inquirer = require('inquirer');
const { isKana, toKana } = require('wanakana');
const wanikani = require('./wanikani');

wanikani.getAllAssignments({ immediately_available_for_review: true }).then(async (res) => {
  const reviews = new wanikani.ReviewList(res.data);
  await reviews.fetchSubjects();
  while (reviews.assignments.length > 0) {
    const randomQuiz = reviews.getRandomQuiz();
    const response = await inquirer.prompt([
      {
        name: 'answer',
        message: `${randomQuiz.hint} (${randomQuiz.subjectType} - ${randomQuiz.quizType})`,
        transformer: (a, b) => {
          if (randomQuiz.quizType === 'reading') return toKana(a);
          else return a;
        },
        validate: (input) => {
          if (randomQuiz.quizType === 'reading' && !isKana(toKana(input))) {
            return 'Invalid reading.';
          }
          if (randomQuiz.quizType === 'meaning' && !/^[a-z0-9 ]+$/i.test(input)) {
            return 'Invalid answer.';
          }
          return true;
        },
      },
    ]);
    let answer = response.answer.trim().toLowerCase();
    if (randomQuiz.quizType === 'reading') answer = toKana(answer);
    let result = -1;
    if (randomQuiz.quizType === 'meaning') {
      result = randomQuiz.correctAnswers.findIndex(
        (meaning) => meaning.meaning.toLowerCase() === answer && meaning.accepted_answer
      );
    } else {
      if (randomQuiz.subjectType === 'kanji') {
        result = randomQuiz.correctAnswers.findIndex(
          (reading) => reading.reading === answer && !reading.accepted_answer
        );
        if (result !== -1) {
          console.log('Wrong reading.');
          continue;
        }
      }
      result = randomQuiz.correctAnswers.findIndex((reading) => reading.reading === answer && reading.accepted_answer);
    }
    if (result === -1) {
      console.log('Incorrect!');
      reviews.submitAnswer(randomQuiz.assignmentId, randomQuiz.quizType, false);
    } else {
      console.log('Correct!');
      reviews.submitAnswer(randomQuiz.assignmentId, randomQuiz.quizType, true);
    }
  }
});
