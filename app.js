require('dotenv').config();
const inquirer = require('inquirer');
const { isKana, toKana } = require('wanakana');

const wanikani = require('./wanikani');
const { getSrsStageName, matchAnswer } = require('./helpers');

const doReview = async () => {
  const allAssignments = await wanikani.getAllAssignments({
    immediately_available_for_review: true,
  });
  if (allAssignments.total_counts === 0) return;
  console.log(`You have ${allAssignments.total_count} reviews.`);
  const reviews = new wanikani.ReviewList(allAssignments.data);
  await reviews.fetchSubjects();
  while (reviews.assignments.length > 0) {
    const randomQuiz = reviews.getRandomQuiz();
    const response = await inquirer.prompt([
      {
        name: 'answer',
        message: `${randomQuiz.hint} (${randomQuiz.subjectType} - ${randomQuiz.quizType})`,
        transformer: (a, b) => {
          if (randomQuiz.quizType === 'reading')
            return toKana(a.replace(/nn/g, 'n'));
          else return a;
        },
        validate: (input) => {
          if (randomQuiz.quizType === 'reading' && !isKana(toKana(input))) {
            return 'Invalid reading.';
          }
          if (
            randomQuiz.quizType === 'meaning' &&
            !/^[a-z0-9 ]+$/i.test(input)
          ) {
            return 'Invalid answer.';
          }
          return true;
        },
      },
    ]);
    let { result, wrongReading } = matchAnswer(
      randomQuiz.subjectType,
      randomQuiz.quizType,
      randomQuiz.correctAnswers,
      response.answer
    );
    if (wrongReading) {
      console.log('Wrong reading.');
      continue;
    }
    if (!result) {
      console.log('Incorrect!');
      reviews.submitAnswer(randomQuiz.assignmentId, randomQuiz.quizType, false);
    } else {
      console.log('Correct');
      const assignment = reviews.submitAnswer(
        randomQuiz.assignmentId,
        randomQuiz.quizType,
        true
      );
      if (assignment.passed) {
        let srsStage = assignment.data.srs_stage;
        if (
          !assignment.incorrectMeaningAnswers &&
          !assignment.incorrectReadingAnswers
        ) {
          srsStage++;
          if (srsStage > 9) srsStage = 9;
        } else {
          srsStage -= 2;
          if (srsStage < 1) srsStage = 1;
        }
        console.log(
          `${getSrsStageName(srsStage)} ${
            srsStage > assignment.data.srs_stage ? '▲' : '▼'
          }`
        );
        const remainingReviews = reviews.remainingReviews;
        if (remainingReviews && remainingReviews % 10 === 0)
          console.log(`You have ${remainingReviews} reviews left.`);
      }
    }
  }
};

doReview();
