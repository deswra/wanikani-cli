const fetch = require('node-fetch');
const queryString = require('query-string');

const TOKEN = process.env.TOKEN;

const APIUrl = 'https://api.wanikani.com/v2/';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
};

const getAllAssignments = (options) => {
  return fetch(queryString.stringifyUrl({ url: `${APIUrl}assignments`, query: options }, { arrayFormat: 'comma' }), {
    headers,
  }).then((res) => res.json());
};

const getSubjects = (options) => {
  return fetch(queryString.stringifyUrl({ url: `${APIUrl}subjects`, query: options }, { arrayFormat: 'comma' }), {
    headers,
  }).then((res) => res.json());
};

const createReview = (body) => {
  return fetch(`${APIUrl}reviews`, {
    method: 'post',
    body: JSON.stringify(body),
    headers: { ...headers, 'Content-Type': 'application/json' },
  }).then((res) => res.json());
};

class ReviewList {
  constructor(assignments) {
    this.assignments = assignments.map((assignment) => {
      if (assignment.data.subject_type !== 'radical') {
        assignment.incorrectReadingAnswers = 0;
        assignment.readingPassed = false;
      }
      assignment.incorrectMeaningAnswers = 0;
      assignment.meaningPassed = false;
      assignment.passed = false;
      return assignment;
    });
    this.subjectIds = [];
    assignments.forEach((assignment) => {
      this.subjectIds.push(assignment.data.subject_id);
    });
  }
  async fetchSubjects() {
    const subjects = await getSubjects({ ids: this.subjectIds });
    this.subjects = [];
    subjects.data.forEach((subject) => this.subjects.push(subject));
  }
  getRandomQuiz() {
    const randomAssignment = this.assignments[Math.floor(Math.random() * this.assignments.length)];
    const subject = this.subjects.find((sub) => randomAssignment.data.subject_id === sub.id).data;
    const response = {
      assignmentId: randomAssignment.id,
      subjectId: randomAssignment.data.subject_id,
      subjectType: randomAssignment.data.subject_type,
      srsStage: randomAssignment.data.srs_stage,
      hint: subject.characters,
    };
    if (randomAssignment.data.subject_type === 'radical') {
      response.quizType = 'meaning';
      response.correctAnswers = subject.meanings;
    } else {
      let random = Math.random();
      if ((random >= 0.5 && randomAssignment.readingPassed) || (random < 0.5 && randomAssignment.meaningPassed)) {
        random = 1 - random;
      }
      if (random >= 0.5) {
        response.quizType = 'reading';
        response.correctAnswers = subject.readings;
      } else {
        response.quizType = 'meaning';
        response.correctAnswers = subject.meanings;
      }
    }
    return response;
  }
  submitAnswer(assignmentId, quizType, result) {
    const assignment = this.assignments.find((item) => item.id === assignmentId);
    if (quizType === 'reading') {
      if (result) assignment.readingPassed = true;
      else assignment.incorrectReadingAnswers++;
    } else {
      if (result) assignment.meaningPassed = true;
      else assignment.incorrectMeaningAnswers++;
    }
    if (
      (assignment.data.subject_type === 'radical' && assignment.readingPassed) ||
      (assignment.readingPassed && assignment.meaningPassed)
    ) {
      assignment.passed = true;
      const index = this.assignments.findIndex((item) => item.id === assignment.id);
      if (index !== -1) this.assignments.splice(index, 1);
      const reviewBody = {
        assignment_id: assignment.id,
        incorrect_meaning_answers: assignment.incorrectMeaningAnswers,
      };
      if (Number.isInteger(assignment.incorrectReadingAnswers))
        reviewBody.incorrect_reading_answers = assignment.incorrectReadingAnswers;
      else reviewBody.incorrect_reading_answers = 0;
      createReview(reviewBody);
    }
    return assignment;
  }
}

module.exports = {
  ReviewList,
  getAllAssignments,
};
