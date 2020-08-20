const fetch = require('node-fetch');
const queryString = require('query-string');

const TOKEN = process.env.TOKEN;

const APIUrl = 'https://api.wanikani.com/v2/';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
};

const getAllAssignments = (options) => {
  return fetch(
    queryString.stringifyUrl(
      { url: `${APIUrl}assignments`, query: options },
      { arrayFormat: 'comma' }
    ),
    {
      headers,
    }
  ).then((res) => res.json());
};

const getSubjects = (options) => {
  return fetch(
    queryString.stringifyUrl(
      { url: `${APIUrl}subjects`, query: options },
      { arrayFormat: 'comma' }
    ),
    {
      headers,
    }
  ).then((res) => res.json());
};

const createReview = (body) => {
  return fetch(`${APIUrl}reviews`, {
    method: 'post',
    body: JSON.stringify(body),
    headers: { ...headers, 'Content-Type': 'application/json' },
  }).then((res) => res.json());
};

// credit: github.com/babystand
const parseMissingRadical = (name) => {
  switch (name) {
    case 'gun':
      return '𠂉';
    case 'beggar':
      return '与 (without bottom line)';
    case 'leaf':
      return '丆';
    case 'triceratops':
      return '⺌';
    case 'stick':
      return '⼁';
    case 'hat':
      return '𠆢 (个 without the vertical line)';
    case 'horns':
      return '丷';
    case 'spikes':
      return '业';
    case 'cactus':
      return '墟 (bottom right radical)';
    case 'trident':
      return '棄 (center radical)';
    case 'shark':
      return '烝';
    case 'comb':
      return '段 (left half)';
    case 'egg':
      return '乍 (without the top-left tick)';
    case 'death-star':
      return '俞';
    case 'corn':
      return '演 (middle radical)';
    case 'explosion':
      return '渋 (bottom-right radical)';
    case 'hick':
      return '度 (without the 又)';
    case 'worm':
      return '堂 (without the top radicals)';
    case 'squid':
      return '剣 (without the 刂)';
    case 'zombie':
      return '遠 (without the ⻌ )';
    case 'grass':
      return '⺍';
    case 'bar':
      return '残 (right half)';
    case 'creeper':
      return '司 (inside radical)';
    case 'cloak':
      return '司 (outside radical)';
    case 'train':
      return '夫';
    case 'tofu':
      return '旅 (bottom-right radical)';
    case 'bear':
      return '官 (without the 宀)';
    case 'trash':
      return '育 (top half)';
    case 'blackjack':
      return '昔 (top half)';
    case 'chinese':
      return '漢 (right half)';
    case 'pope':
      return '盾 (inside radical)';
    case 'cleat':
      return '⺤';
    case 'hills':
      return '之 (without the top tick)';
    case 'kick':
      return '表 (bottom half)';
    case 'viking':
      return '学 (without the 子)';
    case 'potato':
      return '華 (without the ⺾)';
    case 'water-slide':
      return '⻌';
    case 'psychopath':
      return '鬱 (bottom half)';
    case 'morning':
      return '乾 (left radical)';
    case 'saw':
      return '恐 (without the ⼼)';
  }
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
  get remainingReviews() {
    return this.assignments.length;
  }
  getRandomQuiz() {
    const randomAssignment = this.assignments[
      Math.floor(Math.random() * this.assignments.length)
    ];
    const subject = this.subjects.find(
      (sub) => randomAssignment.data.subject_id === sub.id
    ).data;
    const response = {
      assignmentId: randomAssignment.id,
      subjectId: randomAssignment.data.subject_id,
      subjectType: randomAssignment.data.subject_type,
      srsStage: randomAssignment.data.srs_stage,
      hint: subject.characters
        ? subject.characters
        : parseMissingRadical(subject.slug),
    };
    if (randomAssignment.data.subject_type === 'radical') {
      response.quizType = 'meaning';
      response.correctAnswers = subject.meanings;
    } else {
      let random = Math.random();
      if (
        (random >= 0.5 && randomAssignment.readingPassed) ||
        (random < 0.5 && randomAssignment.meaningPassed)
      ) {
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
    const assignment = this.assignments.find(
      (item) => item.id === assignmentId
    );
    if (quizType === 'reading') {
      if (result) assignment.readingPassed = true;
      else assignment.incorrectReadingAnswers++;
    } else {
      if (result) assignment.meaningPassed = true;
      else assignment.incorrectMeaningAnswers++;
    }
    if (
      (assignment.data.subject_type === 'radical' &&
        assignment.meaningPassed) ||
      (assignment.readingPassed && assignment.meaningPassed)
    ) {
      assignment.passed = true;
      const index = this.assignments.findIndex(
        (item) => item.id === assignment.id
      );
      if (index !== -1) this.assignments.splice(index, 1);
      const reviewBody = {
        assignment_id: assignment.id,
        incorrect_meaning_answers: assignment.incorrectMeaningAnswers,
      };
      if (Number.isInteger(assignment.incorrectReadingAnswers))
        reviewBody.incorrect_reading_answers =
          assignment.incorrectReadingAnswers;
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
