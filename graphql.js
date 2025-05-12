const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Query {
    meals: [Meal]
    workouts: [Workout]
    meal(id: ID!): Meal
    workout(id: ID!): Workout
    calorieSummary: CalorieSummary
  }

  type Meal {
    id: ID
    name: String
    calories: Int
  }

  type Workout {
    id: ID
    name: String
    duration: Int
    caloriesBurned: Int
  }

  type CalorieSummary {
    totalCaloriesEaten: Int
    totalCaloriesBurned: Int
  }
`;

const resolvers = {
  Query: {
    meals: (_, __, { meals }) => meals,
    workouts: (_, __, { workouts }) => workouts,
    meal: (_, { id }, { meals }) => meals.find(m => m.id === parseInt(id)),
    workout: (_, { id }, { workouts }) => workouts.find(w => w.id === parseInt(id)),
    calorieSummary: (_, __, { meals, workouts }) => {
      const totalCaloriesEaten = meals.reduce((sum, m) => sum + m.calories, 0);
      const totalCaloriesBurned = workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
      return { totalCaloriesEaten, totalCaloriesBurned };
    },
  },
};

module.exports = { typeDefs, resolvers };
